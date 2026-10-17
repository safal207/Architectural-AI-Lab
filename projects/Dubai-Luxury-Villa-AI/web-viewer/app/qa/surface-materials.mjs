import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSurfaceMaterials } from '../src/three/surfaceMaterials.js';

// Control image completion while retaining actual Three materials and geometry.
// This checks request/lifetime behavior; the estate browser gate checks rendering.
const requests = [];
class TextureLoader {
  load(url, onLoad, _onProgress, onError) {
    const texture = new THREE.Texture();
    requests.push({ url, texture, onLoad, onError });
    return texture;
  }
}
const engine = { ...THREE, TextureLoader };
const renderer = { capabilities: { getMaxAnisotropy: () => 8 } };

function fixture() {
  const root = new THREE.Group();
  const originalMap = new THREE.Texture();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 3), new THREE.MeshStandardMaterial({
    color: '#c2b29a', map: originalMap, roughness: 0.8
  }));
  deck.name = 'terrace_deck';
  root.add(deck);
  const asphalt = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 4), new THREE.MeshStandardMaterial());
  root.add(asphalt);
  let notifications = 0;
  const controller = createSurfaceMaterials(engine, {
    root, surfaces: [{ mesh: asphalt, kind: 'asphalt' }], renderer,
    onChange: () => { notifications++; }
  });
  return { root, deck, asphalt, originalMap, controller, notifications: () => notifications };
}

const first = fixture();
const { controller, deck, asphalt, originalMap } = first;
assert.equal(requests.length, 3);
assert.ok(requests.every(request => request.url.includes('/materials/asphalt_02-')),
  'Stone startup may request only the maps that are actually applied');
assert.equal(controller.report.textureCount, 6, 'All supported maps remain discoverable in diagnostics');
assert.equal(controller.report.requestedTextureCount, 3);
assert.equal(deck.material.map, originalMap, 'The default authored stone map must be preserved');
assert.equal(asphalt.material.map, requests[0].texture);
assert.equal(requests[0].texture.colorSpace, THREE.SRGBColorSpace);
assert.equal(requests[1].texture.colorSpace, THREE.NoColorSpace);
assert.equal(requests[0].texture.anisotropy, 4);
controller.setState({ terrace: 'stone', joints: 'fine' });
assert.equal(requests.length, 3, 'Changing joints must not fetch timber');
requests.forEach(request => request.onLoad());
assert.equal(controller.report.loaded, 3);
assert.equal(first.notifications(), 3, 'Each image completion must request a new frame');

controller.setState({ terrace: 'timber' });
assert.equal(requests.length, 6);
assert.equal(controller.report.requestedTextureCount, 6);
assert.ok(requests.slice(3).every(request => request.url.includes('/materials/wood_floor_deck-')));
const timberMap = requests[3].texture;
assert.equal(deck.material.map, timberMap);
assert.equal(deck.material.normalMap, requests[4].texture);
assert.equal(deck.material.roughnessMap, requests[5].texture);
controller.setState({ terrace: 'stone' });
assert.equal(deck.material.map, originalMap);
requests.slice(3).forEach(request => request.onLoad());
assert.equal(controller.report.loaded, 6);
assert.equal(deck.material.map, originalMap, 'A late timber image must not override a newer stone selection');
assert.equal(first.notifications(), 6);
controller.setState({ terrace: 'timber' });
controller.setState({ terrace: 'timber', joints: 'fine' });
assert.equal(deck.material.map, timberMap);
assert.equal(requests.length, 6, 'Returning to timber must reuse the original three requests');
controller.dispose();
assert.equal(deck.material.map, originalMap);
controller.dispose();

const pending = fixture();
const pendingRequests = requests.slice(6);
pendingRequests[0].onError(new Error('Image unavailable'));
assert.equal(pending.controller.report.failed, 1);
assert.equal(pending.notifications(), 1);
pending.controller.dispose();
const before = { loaded: pending.controller.report.loaded, failed: pending.controller.report.failed };
pendingRequests[1].onLoad();
pendingRequests[2].onError(new Error('Late failure'));
pending.controller.setState({ terrace: 'timber' });
assert.equal(requests.length, 9, 'Disposed controllers must not begin deferred downloads');
assert.deepEqual({ loaded: pending.controller.report.loaded, failed: pending.controller.report.failed }, before);
assert.equal(pending.notifications(), 1, 'Disposed callbacks must not invalidate a destroyed scene');
console.log('Surface materials: PASS (three default maps, timber on demand, reuse, async selection and disposal)');
