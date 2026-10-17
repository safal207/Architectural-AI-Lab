import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAtmosphere } from '../src/three/atmosphere.js';

// Exercise real scene/sky geometry while counting expensive environment captures.
const captures = [];
class PMREMGenerator {
  fromScene(scene) {
    const uniforms = scene.children[0].material.uniforms;
    captures.push({ horizon: uniforms.uHorizon.value.getHex(), rain: uniforms.uRain.value });
    return { texture: new THREE.Texture(), dispose() {} };
  }
  dispose() {}
}
const engine = { ...THREE, PMREMGenerator };
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const renderer = { domElement: { addEventListener() {}, removeEventListener() {} } };
const atmosphere = createAtmosphere(engine, {
  scene, renderer, camera, root: new THREE.Group(), quality: 'mobile',
  initialState: { mode: 'evening', weather: 'rain', wind: 0.7, motion: false }
});
assert.equal(captures.length, 1, 'An initial visit must capture only its selected lighting/weather');
assert.equal(atmosphere.report.reflectionCacheKey, 'evening:rain');
assert.equal(atmosphere.report.state.wind, 0.7);
assert.equal(atmosphere.report.state.motion, false);
assert.equal(captures[0].rain, 1);
atmosphere.setState({ mode: 'evening', weather: 'rain' });
assert.equal(captures.length, 1, 'Syncing the same selection reuses its reflection');
atmosphere.setState({ mode: 'day', weather: 'clear' });
assert.equal(captures.length, 2, 'Changing ambience creates exactly one matching environment');
atmosphere.setState({ mode: 'evening', weather: 'rain' });
assert.equal(captures.length, 2, 'Returning to an ambience reuses its environment');
atmosphere.dispose();
const defaultAtmosphere = createAtmosphere(engine, { scene, renderer, camera, root: new THREE.Group(), quality: 'mobile' });
assert.equal(defaultAtmosphere.report.reflectionCacheKey, 'day:clear', 'Callers without an initial selection keep the default');
defaultAtmosphere.dispose();
console.log('PASS selected-atmosphere startup and reflection cache reuse');
