import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { revealViewer } from './reveal-viewer.mjs';

const output = process.env.QA_OUTPUT ?? 'qa-spatial-candidate-output';
mkdirSync(output, { recursive: true });
const report = { status: 'RUNNING', candidateAccepted: false, prHeadSha: process.env.PR_HEAD_SHA ?? null,
  checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), poses: [], errors: [],
  boundary: 'Diagnostic only. Static world-space mesh bounds remove only provably out-of-range point-light terms at compile time. No lights, materials, geometry, raster, shadows, camera or transmission effects are disabled. Full-buffer readback includes completion and readback overhead, not physical display timing.' };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
page.setDefaultTimeout(180000);
page.on('pageerror', error => report.errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
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
    const result = await page.evaluate(pose => {
      const { THREE, renderer, scene, camera } = window.__villaProfile;
      if (THREE.REVISION !== '180') throw Error('This shader experiment is bounded to Three.js r180');
      const gl = renderer.getContext();
      const width = renderer.domElement.width, height = renderer.domElement.height;
      if (devicePixelRatio !== 1 || width !== renderer.domElement.clientWidth || height !== renderer.domElement.clientHeight) throw Error('Wrong raster');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const lights = [];
      const records = new Map();
      scene.traverseVisible(object => {
        if (object.isPointLight && object.layers.test(camera.layers)) lights.push(object);
      });
      // Same stable order as r180 WebGLLights.setup; verify its actual uniforms below.
      lights.sort((a, b) => (b.castShadow ? 2 : 0) - (a.castShadow ? 2 : 0) + (b.map ? 1 : 0) - (a.map ? 1 : 0));
      if (!lights.length || lights.length > 32) throw Error('Unexpected point-light count');
      const locations = lights.map(light => light.getWorldPosition(new THREE.Vector3()));
      const activeKeys = new Map();
      const plan = [];
      const materialSet = new Set();
      scene.traverseVisible(mesh => {
        if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh
          || Object.keys(mesh.geometry.morphAttributes ?? {}).length) return;
        mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) return;
        const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        if (![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (materials.some(m => !m.isMeshStandardMaterial || m.displacementMap
          || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)) return;
        const retained = [], omitted = [];
        lights.forEach((light, index) => {
          const distance = box.distanceToPoint(locations[index]);
          // distance=0 means unlimited range; unknown/nonfinite bounds must retain the light.
          if (Number.isFinite(light.distance) && light.distance > 0 && distance > light.distance + 0.001) {
            omitted.push({ index, name: light.name, minimumDistance: distance, cutoff: light.distance });
          } else retained.push(index);
        });
        if (!omitted.length) return;
        records.set(mesh, retained.join(','));
        materials.forEach(m => materialSet.add(m));
        plan.push({ mesh: mesh.name, bounds: { min: box.min.toArray(), max: box.max.toArray() }, retained, omitted });
      });
      if (!records.size) throw Error('No provably irrelevant light terms found');
      const originals = [...materialSet].map(m => [m, m.onBeforeCompile, m.customProgramCacheKey, m.customProgramCacheKey()]);
      const originalBufferDirect = renderer.renderBufferDirect;
      const originalInfoReset = renderer.info.autoReset;
      const chunk = THREE.ShaderChunk.lights_fragment_begin;
      const begin = chunk.indexOf('#if ( NUM_POINT_LIGHTS > 0 )');
      const end = chunk.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
      if (begin < 0 || end <= begin) throw Error('Unknown lighting chunk');
      const pointChunk = chunk.slice(begin, end);
      const loopStart = 'for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {';
      const loopEnd = '\n\t}\n\t#pragma unroll_loop_end';
      if (pointChunk.split(loopStart).length !== 2 || pointChunk.split(loopEnd).length !== 2) throw Error('Unknown point-light loop');
      const chunks = new Map();
      const modifiedChunk = key => {
        if (chunks.has(key)) return chunks.get(key);
        const keep = key ? key.split(',').map(Number) : [];
        const condition = keep.length ? keep.map(index => `UNROLLED_LOOP_INDEX == ${index}`).join(' || ') : '0';
        const block = pointChunk.replace(loopStart, `${loopStart}\n#if (NUM_POINT_LIGHTS != ${lights.length}) || (${condition})`)
          .replace(loopEnd, `\n#endif${loopEnd}`);
        const result = chunk.slice(0, begin) + block + chunk.slice(end);
        chunks.set(key, result); return result;
      };
      const restore = () => {
        renderer.renderBufferDirect = originalBufferDirect;
        for (const [m, compile, cache] of originals) { m.onBeforeCompile = compile; m.customProgramCacheKey = cache; m.needsUpdate = true; }
        renderer.info.autoReset = originalInfoReset;
      };
      const install = () => {
        for (const [m, compile, , oldKey] of originals) {
          activeKeys.set(m, null);
          m.onBeforeCompile = function(shader, r) {
            compile.call(this, shader, r);
            const key = activeKeys.get(this);
            if (key !== null) {
              if (shader.fragmentShader.split('#include <lights_fragment_begin>').length !== 2) throw Error('Shader include changed');
              shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', modifiedChunk(key));
            }
          };
          m.customProgramCacheKey = function() { return `${oldKey}:spatial-r180:${lights.length}:${activeKeys.get(this) ?? 'all'}`; };
          m.needsUpdate = true;
        }
        renderer.renderBufferDirect = function(c, s, geometry, material, object, group) {
          if (materialSet.has(material)) {
            const key = records.has(object) ? records.get(object) : null;
            if (activeKeys.get(material) !== key) { activeKeys.set(material, key); material.needsUpdate = true; }
          }
          return originalBufferDirect.call(this, c, s, geometry, material, object, group);
        };
      };
      const pixels = new Uint8Array(width * height * 4);
      const read = () => {
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw Error('Invalid pixel readback');
      };
      const frame = () => {
        read(); renderer.info.reset();
        const at = performance.now(); renderer.render(scene, camera); const submitted = performance.now(); read();
        return { ms: performance.now() - at, submitMs: submitted - at, calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles, programs: renderer.info.programs.length };
      };
      const difference = reference => {
        let changedPixels = 0, maxChannelDelta = 0, sum = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          let changed = false;
          for (let channel = 0; channel < 4; channel++) {
            const delta = Math.abs(pixels[i + channel] - reference[i + channel]);
            changed ||= delta !== 0; maxChannelDelta = Math.max(maxChannelDelta, delta); sum += delta;
          }
          if (changed) changedPixels++;
        }
        return { changedPixels, maxChannelDelta, meanChannelDelta: sum / pixels.length };
      };
      const png = bytes => {
        const target = document.createElement('canvas'); target.width = width; target.height = height;
        const context = target.getContext('2d'); const image = context.createImageData(width, height);
        for (let row = 0; row < height; row++) image.data.set(bytes.subarray(row * width * 4, (row + 1) * width * 4), (height - 1 - row) * width * 4);
        context.putImageData(image, 0, 0); return target.toDataURL('image/png').split(',')[1];
      };
      let reference;
      const variants = [];
      let beforePng, candidatePng;
      try {
        renderer.info.autoReset = false;
        for (const variant of ['baseline', 'spatial', 'restored']) {
          if (variant === 'spatial') install();
          if (variant === 'restored') { restore(); renderer.info.autoReset = false; }
          const warmup = frame();
          // Validate actual uniform ordering instead of trusting only the mirrored comparator.
          let verifiedUniformSets = 0;
          for (const m of materialSet) {
            const uniformLights = renderer.properties.get(m).uniforms?.pointLights?.value;
            if (!uniformLights?.length) continue;
            if (uniformLights.length !== lights.length) throw Error('Light count differs from live uniforms');
            uniformLights.forEach((uniform, i) => {
              const expected = locations[i].clone().applyMatrix4(camera.matrixWorldInverse);
              if (uniform.position.distanceTo(expected) > 0.00001 || uniform.distance !== lights[i].distance) throw Error('Light order/bounds mismatch');
            });
            verifiedUniformSets++;
          }
          if (!verifiedUniformSets) throw Error('Could not verify a live point-light uniform array');
          const samples = [frame(), frame(), frame()];
          if (variant === 'baseline') { reference = pixels.slice(); beforePng = png(reference); }
          if (variant === 'spatial') candidatePng = png(pixels);
          variants.push({ variant, warmup, samples, meanMs: samples.reduce((sum, s) => sum + s.ms, 0) / samples.length,
            verifiedUniformSets, ...difference(reference) });
        }
      } finally { restore(); }
      const baseline = variants[0], candidate = variants[1], restored = variants[2];
      const conservativeBaseline = Math.min(baseline.meanMs, restored.meanMs);
      return { pose, width, height, renderer: rendererName, camera: camera.position.toArray(), direction: camera.getWorldDirection(new THREE.Vector3()).toArray(),
        pointLightCount: lights.length, affectedMeshes: plan.length, distinctMasks: chunks.size, plan, variants,
        speedRatio: conservativeBaseline / candidate.meanMs,
        imageEqual: candidate.changedPixels === 0 && restored.changedPixels === 0,
        beforePng, candidatePng };
    }, pose);
    for (const [key, filename] of [['beforePng', `${pose}-before.png`], ['candidatePng', `${pose}-candidate.png`]]) {
      writeFileSync(`${output}/${filename}`, Buffer.from(result[key], 'base64')); delete result[key];
    }
    report.poses.push(result);
    writeFileSync(`${output}/spatial-candidate.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ pose, speedRatio: result.speedRatio, imageEqual: result.imageEqual, affectedMeshes: result.affectedMeshes, distinctMasks: result.distinctMasks, variants: result.variants }));
  }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  report.candidateAccepted = report.poses.every(p => p.imageEqual && p.speedRatio >= 1.2);
  report.status = 'MEASURED';
} catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
finally { writeFileSync(`${output}/spatial-candidate.json`, JSON.stringify(report, null, 2)); await browser.close(); }
