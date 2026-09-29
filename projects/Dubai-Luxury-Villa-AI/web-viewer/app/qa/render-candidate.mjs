import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { revealViewer } from './reveal-viewer.mjs';
const output = process.env.QA_OUTPUT ?? 'qa-render-candidate-output';
mkdirSync(output, { recursive: true });
const report = { status: 'RUNNING', head: process.env.PR_HEAD_SHA, checkout: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), results: [], errors: [],
  boundary: 'Diagnostic candidates only; full-buffer readback at DPR 1 includes raster completion and readback cost. No quality reduction. Compare every RGBA byte at identical pose.' };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
page.setDefaultTimeout(120000);
page.on('pageerror', error => report.errors.push(String(error)));
try {
  await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await revealViewer(page);
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded');
  const panel = page.getByRole('region', { name: 'Arrival preview' });
  await panel.getByRole('button', { name: 'Play arrival' }).click();
  await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'still');
  for (const pose of ['entry', 'living']) {
    if (pose === 'living') {
      await panel.getByRole('button', { name: 'Show water view' }).click();
      await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'complete');
    }
    for (const variant of ['baseline', 'near-first', 'point-guard', 'both', 'restored']) {
      const result = await page.evaluate(({pose,variant}) => {
        const { THREE, renderer, scene, camera } = window.__villaProfile;
        const gl = renderer.getContext();
        const width = renderer.domElement.width, height = renderer.domElement.height;
        if (devicePixelRatio !== 1 || width !== renderer.domElement.clientWidth || height !== renderer.domElement.clientHeight) throw Error('Wrong raster');
        const key = `__baseline_${pose}`;
        const materials = new Set();
        scene.traverse(object => { if(object.isMesh) for(const m of (Array.isArray(object.material)?object.material:[object.material])) if(m.isMeshStandardMaterial) materials.add(m); });
        const originals = [...materials].map(m => [m, m.onBeforeCompile, m.customProgramCacheKey]);
        const originalChunk = THREE.ShaderChunk.lights_fragment_begin;
        const start = originalChunk.indexOf('#if ( NUM_POINT_LIGHTS > 0 )');
        const end = originalChunk.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
        const direct = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
        const point = originalChunk.slice(start, end);
        if(start < 0 || end <= start || point.split(direct).length !== 2) throw Error('Unknown shader seam');
        const guarded = originalChunk.slice(0,start) + point.replace(direct, `if ( directLight.visible ) { ${direct} }`) + originalChunk.slice(end);
        const nearFirst = (a,b) => a.groupOrder-b.groupOrder || a.renderOrder-b.renderOrder || a.z-b.z || a.material.id-b.material.id || a.id-b.id;
        const pixels = new Uint8Array(width*height*4);
        const read = () => { gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels); if(gl.getError()!==gl.NO_ERROR || gl.isContextLost())throw Error('Readback failed'); };
        const frame = () => { read(); const at=performance.now(); renderer.render(scene,camera); const submitted=performance.now(); read(); return {ms:performance.now()-at,submitMs:submitted-at}; };
        try {
          if(['near-first','both'].includes(variant)) renderer.setOpaqueSort(nearFirst);
          if(['point-guard','both'].includes(variant)) for(const [m,compile,cache] of originals){
            const oldKey=cache.call(m);
            m.onBeforeCompile=function(shader,r){ compile.call(this,shader,r); shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',guarded); };
            m.customProgramCacheKey=()=>`${oldKey}:zero-point-guard-diagnostic-v1`;
            m.needsUpdate=true;
          }
          const warmup=frame(); const samples=[frame(),frame()];
          if(variant==='baseline') window[key]=pixels.slice();
          const reference=window[key];
          if(!reference || reference.length!==pixels.length)throw Error('Missing baseline');
          let changedPixels=0,maxChannelDelta=0,sum=0;
          for(let i=0;i<pixels.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(pixels[i+c]-reference[i+c]);sum+=d;maxChannelDelta=Math.max(maxChannelDelta,d);changed ||= d!==0;} if(changed)changedPixels++;}
          return {pose,variant,warmup,samples,meanMs:samples.reduce((n,s)=>n+s.ms,0)/samples.length,width,height,
            position:camera.position.toArray(), changedPixels,maxChannelDelta,meanChannelDelta:sum/pixels.length};
        } finally {
          renderer.setOpaqueSort(null);
          for(const [m,compile,cache]of originals){ if(m.onBeforeCompile!==compile){m.onBeforeCompile=compile;m.customProgramCacheKey=cache;m.needsUpdate=true;} }
        }
      }, {pose,variant});
      report.results.push(result); writeFileSync(`${output}/candidate.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(result));
    }
  }
  assert.equal(report.errors.length,0);report.status='PASS';
} catch(error){ report.status='FAIL';report.failure=String(error.stack??error);throw error; }
finally{writeFileSync(`${output}/candidate.json`,JSON.stringify(report,null,2));await browser.close();}
