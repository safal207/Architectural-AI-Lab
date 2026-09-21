import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const out = process.env.QA_OUTPUT ?? 'qa-drone-flight-output';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { status: 'RUNNING', errors: [], desktop: {}, mobile: [] };
const sleep = (page, ms=250) => page.waitForTimeout(ms);
const position = async page => (await page.locator('.three-canvas').getAttribute('data-camera-position')).split(',').map(Number);
const direction = async page => (await page.locator('.three-canvas').getAttribute('data-camera-direction')).split(',').map(Number);
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
const mode = (page, expected) => page.waitForFunction(value => {
  const view = document.querySelector('.three-canvas');
  return view?.dataset.interactionMode === value && view?.dataset.renderedInteractionMode === value;
}, expected);
async function waitMovement(page, before, min=.08) {
  await page.waitForFunction(({before,min}) => {
    const p=document.querySelector('.three-canvas')?.dataset.cameraPosition?.split(',').map(Number);
    return p && Math.hypot(...p.map((v,i)=>v-before[i]))>min;
  }, {before,min}, {timeout:15000});
}
async function start(page) {
  page.on('pageerror', error=>report.errors.push(String(error)));
  page.on('console', msg=>{if(msg.type()==='error')report.errors.push(msg.text());});
  await page.goto(url+'?lighting=day', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(()=>document.querySelector('.three-canvas')?.dataset.modelState==='loaded',null,{timeout:120000});
  await page.locator('.three-canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Boolean(document.querySelector('.three-canvas')?.dataset.cameraPosition));
  const repairs=await page.locator('.three-canvas').evaluate(el=>({stairs:JSON.parse(el.dataset.stairRepair),pool:JSON.parse(el.dataset.poolRepair)}));
  assert.equal(repairs.stairs.slabsRebuilt.length,2);
  assert.equal(repairs.stairs.orphanTrimHidden.length,3);
  assert.equal(repairs.pool.copingAdjustedCount,3);
  assert.equal(repairs.pool.shelfAdjusted,true);
  assert.equal(repairs.pool.waterShadowDisabled,true);
  return repairs;
}
try {
  const page=await browser.newPage({viewport:{width:796,height:925}, reducedMotion:'reduce'});
  let requests=0;page.on('request',req=>{if(new URL(req.url()).pathname.endsWith('/villa.glb'))requests++;});
  report.desktop.repairs=await start(page);
  console.log('Desktop scene loaded');
  const overview=await position(page);
  await page.locator('.three-canvas').screenshot({path:out+'/exterior.png'});
  for (const [label,file] of [['Stair hall','stair-ground'],['Upper landing','stair-upper'],['Pool terrace','pool']]) {
    await page.locator('.client-graph li').filter({hasText:label}).getByRole('button').click();
    await mode(page,'guided');await sleep(page,400);
    await page.locator('.three-canvas').screenshot({path:out+'/'+file+'.png'});
  }
  await click(page,'Orbit overview');await mode(page,'orbit');await sleep(page);
  await click(page,'Drone flight');await mode(page,'drone');
  const canvas=page.locator('.three-canvas canvas');
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null);
  let before=await position(page);
  await page.keyboard.down('w');await waitMovement(page,before);await page.keyboard.up('w');
  assert(distance(before,await position(page))>.08,'W should translate camera');
  await sleep(page);let stopped=await position(page);await sleep(page,350);
  assert(distance(stopped,await position(page))<.004,'released keyboard must stop');
  before=await position(page);await page.keyboard.down('e');await waitMovement(page,before);await page.keyboard.up('e');
  assert((await position(page))[1]>before[1]+.04,'E should ascend');
  await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
  const x=box.x+box.width*.5,y=box.y+box.height*.45;
  const facing=await direction(page);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+12,{steps:5});await page.mouse.up();await sleep(page);
  assert(distance(facing,await direction(page))>.06,'drag should turn camera');
  before=await position(page);await page.mouse.wheel(0,-160);await waitMovement(page,before);
  await click(page,'Fly inside ↗');await sleep(page);
  assert(distance(await position(page),[2.2,1.65,.65])<.01,'Fly inside should use living anchor');
  await page.locator('.three-canvas-shell').screenshot({path:out+'/drone-inside.png'});
  before=await position(page);await page.keyboard.down('w');await waitMovement(page,before);
  await page.evaluate(()=>document.querySelector('.scene-navigation button').focus());
  await sleep(page);stopped=await position(page);await sleep(page,400);
  assert(distance(stopped,await position(page))<.004,'focus away must stop held input');
  await page.keyboard.up('w');
  await canvas.focus();await page.keyboard.press('Escape');await mode(page,'orbit');await sleep(page);
  assert(distance(await position(page),overview)<.02,'Escape from exterior should restore overview');
  await click(page,'Go inside');await mode(page,'guided');
  assert.equal(await page.locator('.three-canvas').getAttribute('data-tour-stop'),'entry');
  const entry=await position(page);
  await click(page,'Drone flight');await mode(page,'drone');
  before=await position(page);await page.keyboard.down('d');await waitMovement(page,before);await page.keyboard.up('d');
  await click(page,'Go inside');await mode(page,'guided');await sleep(page);
  assert(distance(await position(page),entry)<.02,'reselect current entry should reset and exit drone');
  await click(page,'Drone flight');await mode(page,'drone');await click(page,'Orbit overview');await mode(page,'orbit');await sleep(page);
  assert(distance(await position(page),overview)<.02,'Orbit overview should reset framing');
  await click(page,'Go inside');await mode(page,'guided');
  await click(page,'Drone flight');await mode(page,'drone');
  assert.equal(await page.getByRole('button',{name:'Enter the house',exact:true}).getAttribute('aria-pressed'),'false');
  await click(page,'WALK');await mode(page,'guided');
  await click(page,'Orbit overview');await mode(page,'orbit');
  await canvas.scrollIntoViewIfNeeded();const orbitBox=await canvas.boundingBox();
  await page.mouse.move(orbitBox.x+orbitBox.width/2,orbitBox.y+orbitBox.height/2);await page.mouse.down();
  await page.mouse.move(orbitBox.x+orbitBox.width/2+100,orbitBox.y+orbitBox.height/2,{steps:2});await page.mouse.up();
  await page.getByRole('button',{name:'Drone flight',exact:true}).evaluate(el=>el.click());await mode(page,'drone');
  await click(page,'Orbit overview');await mode(page,'orbit');await sleep(page,800);
  assert(distance(await position(page),overview)<.02,'orbit momentum must not survive overview reset');
  assert.equal(requests,1,'scene should keep one GLB request');
  report.desktop={...report.desktop, keyboard:true,dragLook:true,wheel:true,focusReset:true,inside:true,repeatSelection:true,overviewReset:true,walkExit:true,orbitMomentumReset:true,modelRequests:requests};
  console.log('Desktop flight checks passed');
  await page.close();
  for (const width of [390,320]) {
    const mobile=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await start(mobile);await click(mobile,'Drone flight');await mode(mobile,'drone');await click(mobile,'Fly inside ↗');await sleep(mobile);
    await mobile.locator('.three-canvas-shell').scrollIntoViewIfNeeded();
    const pad=mobile.getByRole('button',{name:'Ascend',exact:true});const r=await pad.boundingBox();
    before=await position(mobile);
    // Real captured pointer input exercises the same press/hold/release path as touch.
    await mobile.mouse.move(r.x+r.width/2,r.y+r.height/2);await mobile.mouse.down();await waitMovement(mobile,before);await mobile.mouse.up();await sleep(mobile);
    assert((await position(mobile))[1]>before[1]+.04,'mobile pad should ascend');
    stopped=await position(mobile);await sleep(mobile,350);
    assert(distance(stopped,await position(mobile))<.004,'mobile pad release must stop');
    const layout=await mobile.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
      return{canvas:rect('.three-canvas-shell'),help:rect('.drone-help'),inside:rect('.drone-inside'),pad:rect('.drone-pad'),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert(layout.overflow<=1,'mobile horizontal overflow');
    for(const key of ['help','inside','pad']){const a=layout[key],b=layout.canvas;assert(a.x>=b.x-1&&a.x+a.w<=b.x+b.w+1&&a.y>=b.y-1&&a.y+a.h<=b.y+b.h+1,key+' outside canvas');}
    assert(layout.help.x+layout.help.w<=layout.inside.x,'help must not cover inside button');
    assert(layout.pad.y>=Math.max(layout.help.y+layout.help.h,layout.inside.y+layout.inside.h),'pad must not overlap help');
    await mobile.locator('.viewer-panel').screenshot({path:out+'/mobile-'+width+'.png'});
    report.mobile.push({width,padMovement:true,padRelease:true,layout});console.log('Mobile '+width+' passed');await mobile.close();
  }
  assert.deepEqual(report.errors,[]);
  report.status='PASS';
} catch(error) {report.status='FAIL';report.failure=String(error.stack);throw error;}
finally {await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(report.status, report.failure ?? 'desktop and 390/320px drone checks');}
