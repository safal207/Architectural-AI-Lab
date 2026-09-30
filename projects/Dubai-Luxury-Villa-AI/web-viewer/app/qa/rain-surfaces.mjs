import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRainSurfaces } from '../src/three/rainSurfaces.js';

// Geometry/lifecycle gate. Browser QA separately verifies GLSL compilation and
// appearance; image decoding is deliberately omitted in this Node-only check.
const bytes = await readFile(new URL('../public/villa.glb', import.meta.url));
const loader = new GLTFLoader();
loader.register(() => ({ name: 'RainSurfaceGeometryCheck', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const root = gltf.scene;
root.rotation.y = Math.PI;
const scene = new THREE.Scene();
scene.add(root);
root.updateMatrixWorld(true);
const glass = root.getObjectByName('living_glass_01');
const terrace = root.getObjectByName('terrace_deck');
const interiorGlass = root.getObjectByName('stair_glass_guard_v04_r2');
const originals = { glass: glass.material, terrace: terrace.material, interior: interiorGlass.material };
let hookCalls = 0;
const priorHook = originals.glass.onBeforeCompile;
originals.glass.onBeforeCompile = (shader, renderer) => {
  priorHook.call(originals.glass, shader, renderer);
  shader.uniforms.uPriorGlassHook = { value: 1 };
  hookCalls++;
};
const rain = createRainSurfaces(THREE, { scene, root, quality: 'desktop' });
assert.equal(terrace.material, originals.terrace, 'livingDetails terrace material must remain owned by its layer');
assert.equal(interiorGlass.material, originals.interior, 'indoor stair glass must stay dry');
assert.notEqual(glass.material, originals.glass, 'exterior glass needs its own composed material');
assert.equal(rain.report.glassPaneCount, 14);
assert.ok(rain.report.facadeMeshCount >= 4);
assert.ok(rain.report.puddleCount >= 8);
assert.ok(rain.report.protectedCandidatesRejected > 0);
assert.equal(rain.report.additionalDrawCalls, 2);
assert.equal(rain.report.renderTargets, 0);

const roofs = [];
root.traverse(object => {
  if (object.isMesh && /roof|slab|canopy|cantilever|ceiling|soffit/.test(object.name)
    && !/light|glow/.test(object.name)) roofs.push(new THREE.Box3().setFromObject(object));
});
const puddles = scene.getObjectByName('runtime_rain_puddles');
const matrix = new THREE.Matrix4();
const center = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();
for (let i = 0; i < puddles.count; i++) {
  puddles.getMatrixAt(i, matrix);
  matrix.decompose(center, rotation, scale);
  const radius = Math.max(scale.x, scale.y);
  for (const roof of roofs) {
    const sheltered = roof.max.y > center.y + 0.04
      && center.x + radius >= roof.min.x && center.x - radius <= roof.max.x
      && center.z + radius >= roof.min.z && center.z - radius <= roof.max.z;
    assert.equal(sheltered, false, `puddle ${i} extends beneath an authored roof`);
  }
}
const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
glass.material.onBeforeCompile(shader, {});
assert.equal(hookCalls, 1, 'previous material hook must be called once');
assert.equal(shader.uniforms.uPriorGlassHook.value, 1, 'previous shader uniforms must survive composition');

// A paused rain clock must not pin beads in world space while a user slides a
// window. Mirror the displacement used by the shader on the actual GLB pane.
assert.ok(shader.vertexShader.includes('vec4(transformed - uPaneLocalOrigin, 0.0)'));
assert.ok(shader.fragmentShader.includes('dot(vRainPaneRest, uPaneHorizontal)'));
assert.match(shader.fragmentShader, /if \(uSurfaceWater > 0\.001\)\s*\{[^}]*paneRain = glassRain/s,
  'dry glass must skip the droplet and trail hashes');
const paneLocalOrigin = shader.uniforms.uPaneLocalOrigin.value;
assert.ok(paneLocalOrigin.clone().applyMatrix4(glass.matrixWorld)
  .distanceTo(shader.uniforms.uPaneOrigin.value) < 1e-8, 'rest anchor preserves the original pattern origin');
const sample = new THREE.Vector3().fromBufferAttribute(glass.geometry.attributes.position, 0);
const paneCoordinates = () => {
  const offset = sample.clone().sub(paneLocalOrigin);
  const displacement = new THREE.Vector4(offset.x, offset.y, offset.z, 0).applyMatrix4(glass.matrixWorld);
  const relative = new THREE.Vector3(displacement.x, displacement.y, displacement.z);
  return new THREE.Vector2(relative.dot(shader.uniforms.uPaneHorizontal.value), relative.y);
};
const oldWorldCoordinates = () => {
  const relative = sample.clone().applyMatrix4(glass.matrixWorld).sub(shader.uniforms.uPaneOrigin.value);
  return new THREE.Vector2(relative.dot(shader.uniforms.uPaneHorizontal.value), relative.y);
};
const paneBefore = paneCoordinates();
const oldBefore = oldWorldCoordinates();
assert.ok(paneBefore.distanceTo(oldBefore) < 1e-8, 'fix preserves the existing appearance before sliding');
const glassPosition = glass.position.clone();
const rootPosition = root.position.clone();
rain.setState({ motion: false });
const frozenTime = rain.report.elapsedSeconds;
glass.position.x += 1.6;
root.position.x += 0.4;
root.updateMatrixWorld(true);
assert.ok(oldWorldCoordinates().distanceTo(oldBefore) > 0.1, 'test exercises a translation that exposed the original defect');
assert.ok(paneCoordinates().distanceTo(paneBefore) < 1e-8, 'beads must follow the pane and its parent without changing their pattern');
assert.equal(rain.update(0.25), false);
assert.equal(rain.report.elapsedSeconds, frozenTime, 'sliding a paused pane must not restart the rain clock');
glass.position.copy(glassPosition);
root.position.copy(rootPosition);
root.updateMatrixWorld(true);
rain.setState({ motion: true });

const asphalt = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 8), new THREE.MeshStandardMaterial());
asphalt.name = 'qa_estate_asphalt';
asphalt.position.set(30, -0.05, 5);
scene.add(asphalt);
asphalt.updateMatrixWorld(true);
const asphaltOriginal = asphalt.material;
const countBefore = rain.report.puddleCount;
assert.equal(rain.registerSurface(asphalt, 'asphalt'), true);
assert.equal(rain.registerSurface(asphalt, 'asphalt'), false, 'duplicate registration must not stack materials/effects');
assert.ok(rain.report.puddleCount > countBefore);
const estateGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 2), new THREE.MeshPhysicalMaterial());
estateGlass.name = 'qa_estate_east_glass';
estateGlass.position.set(-30, 1, 2);
estateGlass.userData.rainFacing = [1, 0, 0];
scene.add(estateGlass);
estateGlass.updateMatrixWorld(true);
const estateGlassOriginal = estateGlass.material;
assert.equal(rain.registerSurface(estateGlass, 'glass'), true);
const estateShader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
estateGlass.material.onBeforeCompile(estateShader, {});
assert.deepEqual(estateShader.uniforms.uSurfaceFacing.value.toArray(), [1, 0, 0],
  'explicit estate face direction must override the original villa center heuristic');
assert.equal(rain.update(0.1), false, 'dry resting scene does not request animation');
rain.setState({ weather: 'rain' });
for (let i = 0; i < 48; i++) rain.update(0.25);
assert.ok(Math.abs(rain.report.accumulatedWetness - 0.5) < 1e-8);
rain.setState({ motion: false });
const paused = { wetness: rain.report.accumulatedWetness, time: rain.report.elapsedSeconds };
assert.equal(rain.update(0.25), false);
assert.equal(rain.report.accumulatedWetness, paused.wetness);
assert.equal(rain.report.elapsedSeconds, paused.time);
rain.setState({ motion: true, weather: 'clear' });
for (let i = 0; i < 200; i++) rain.update(0.25);
assert.equal(rain.report.accumulatedWetness, 0);
assert.equal(rain.update(0.1), false, 'animation stops once surfaces finish drying');
const report = structuredClone(rain.report);
rain.dispose();
rain.dispose();
assert.equal(glass.material, originals.glass);
assert.equal(asphalt.material, asphaltOriginal);
assert.equal(estateGlass.material, estateGlassOriginal);
assert.equal(scene.getObjectByName('runtime_rain_surfaces'), undefined);
const mobile = createRainSurfaces(THREE, { scene, root, quality: 'mobile' });
assert.equal(mobile.report.puddleCapacity, 32);
assert.equal(mobile.report.mistInstanceCount, 6);
mobile.dispose();
console.log(JSON.stringify({ status: 'PASS', scope: 'actual-GLB geometry/material ownership, roof-safe puddles, shader-hook composition, sliding-glass bead anchoring during pause, estate registration, accumulation/pause/drying/disposal', report }, null, 2));
