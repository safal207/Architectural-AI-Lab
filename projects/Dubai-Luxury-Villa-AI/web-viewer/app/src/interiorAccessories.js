/** Bounded, shared-material interior props. Existing books, ceramics and lights are left untouched. */
export function createInteriorAccessories(THREE, { scene, root, quality = 'desktop' }) {
  const group = new THREE.Group(); group.name = 'runtime_interior_accessories';
  const geometries = new Set(), materials = new Set();
  const batches = new Map();
  const report = { profile: 'table-settings-and-textiles-v1', placeSettings: 0, foldedThrows: 0,
    batches: 0, instances: 0, additionalLights: 0, skipped: [] };
  let disposed = false;
  root.updateWorldMatrix(true, true);
  const material = (name, color, roughness, metalness = 0) => {
    const item = new THREE.MeshStandardMaterial({ name, color, roughness, metalness });
    materials.add(item); return item;
  };
  const porcelain = material('AccessoryPorcelain', '#e8dfce', 0.64);
  const linen = material('AccessoryLinen', '#c8b99e', 0.98);
  const brass = material('AccessoryBrass', '#8a7653', 0.42, 0.65);
  const glaze = material('AccessoryOliveGlaze', '#667467', 0.4);
  function bounds(name) {
    const node = root.getObjectByName(name);
    if (!node?.isMesh) { report.skipped.push(name); return null; }
    const box = new THREE.Box3().setFromObject(node);
    return box.isEmpty() ? null : box;
  }
  function batch(key, geometry, surface) {
    geometries.add(geometry); batches.set(key, { geometry, material: surface, transforms: [] });
  }
  batch('plates', new THREE.LatheGeometry([[0, 0], [0.72, 0], [0.98, 0.07], [1, 0.12], [0.93, 0.16], [0.7, 0.055], [0, 0.055]].map(p => new THREE.Vector2(...p)), 20), porcelain);
  batch('linen', new THREE.BoxGeometry(1, 1, 1), linen);
  batch('cutlery', new THREE.BoxGeometry(1, 1, 1), brass);
  batch('cups', new THREE.LatheGeometry([[0, 0], [0.035, 0], [0.05, 0.09], [0.046, 0.095], [0.03, 0.012], [0, 0.012]].map(p => new THREE.Vector2(...p)), 16), glaze);
  batch('handles', new THREE.TorusGeometry(0.025, 0.006, 5, 12), glaze);
  function add(key, position, scale = [1, 1, 1], rotation = 0) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(...scale));
    batches.get(key).transforms.push(matrix);
  }
  const table = bounds('dining_table');
  if (table) {
    const c = table.getCenter(new THREE.Vector3()), size = table.getSize(new THREE.Vector3());
    const longX = size.x >= size.z;
    const length = longX ? size.x : size.z, width = longX ? size.z : size.x;
    if (length >= 1.1 && width >= 0.65) {
      const radius = Math.min(0.13, width * 0.16);
      const sides = quality === 'mobile' ? [[-1, -1], [1, 1]] : [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [along, across] of sides) {
        const local = (u, v, lift = 0) => [c.x + (longX ? u : v), table.max.y + 0.004 + lift, c.z + (longX ? v : u)];
        const u = along * length * 0.24, v = across * width * 0.28;
        add('plates', local(u, v), [radius, radius, radius]);
        add('linen', local(u, v, 0.027), [radius * 0.85, 0.012, radius * 1.1], 0.12);
        add('cups', local(u + radius * 1.3, v - across * radius * 0.5));
        const cup = local(u + radius * 1.3, v - across * radius * 0.5, 0.05);
        cup[0] += 0.06;
        add('handles', cup);
        const fork = local(u - radius * 1.32, v, 0.012);
        add('cutlery', fork, [0.012, 0.008, 0.16]);
        for (const tooth of [-1, 0, 1]) add('cutlery', [fork[0] + tooth * 0.009, fork[1], fork[2] - 0.075], [0.004, 0.006, 0.04]);
        report.placeSettings += 1;
      }
    } else report.skipped.push('dining_table: surface too small');
  }
  const bench = bounds('master_bench_cushion_v04_r5');
  if (bench) {
    const c = bench.getCenter(new THREE.Vector3()), size = bench.getSize(new THREE.Vector3());
    if (size.x > 0.3 && size.z > 0.2) {
      const width = size.x * 0.35, depth = size.z * 0.65;
      add('linen', [c.x + size.x * 0.2, bench.max.y + 0.018, c.z], [width, 0.032, depth]);
      add('linen', [c.x + size.x * 0.2, bench.max.y + 0.044, c.z - depth * 0.08], [width * 0.98, 0.024, depth * 0.78]);
      for (let i = 0; i < 8; i += 1) add('linen', [c.x + size.x * 0.2 + width * (i / 7 - 0.5), bench.max.y + 0.008, c.z + depth * 0.55], [0.009, 0.01, depth * 0.18]);
      report.foldedThrows = 1;
    }
  }
  for (const [name, data] of batches) {
    if (!data.transforms.length) continue;
    const object = new THREE.InstancedMesh(data.geometry, data.material, data.transforms.length);
    object.name = `runtime_accessory_${name}`;
    data.transforms.forEach((matrix, index) => object.setMatrixAt(index, matrix));
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = false; object.receiveShadow = true;
    object.computeBoundingBox(); object.computeBoundingSphere();
    group.add(object); report.batches += 1; report.instances += data.transforms.length;
  }
  scene.add(group);
  return { report, group, dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent();
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
  } };
}
