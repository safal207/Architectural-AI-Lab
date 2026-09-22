import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyStairPresentation } from '../src/three/stairPresentation.js';
import { applyPoolPresentation } from '../src/three/poolPresentation.js';

// Offline illustration export. All forms and positions come from the same GLB
// and runtime repairs as VillaViewer. Nothing is moved to fit a composition.
const width = 1440, height = 960;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setSize(width, height);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xf5f2eb, 1);
document.body.append(renderer.domElement);
const gltf = await new GLTFLoader().loadAsync('/villa.glb');
const root = gltf.scene;
root.rotation.y = Math.PI;
applyStairPresentation(root);
applyPoolPresentation(THREE, root);
scene.add(root);
root.updateMatrixWorld(true);

// Omit loose furniture, planting and the distant site context in this exterior
// study. In particular, do not draw a fictitious kitchen island on the facade.
const omitted = /^(site_plinth|garden_field|context_|rear_boundary|left_boundary|pool_context_|agave_|ribbon_|living_(rug|sofa|table|curtain|media|screen|downlight|linear_light)|dining_|kitchen_|island_|master_(bed|mattress|headboard|side_table|wardrobe|curtain|rug|bench|pillow|lumbar|throw|feature)|.*(pendant|linear_light|glow))/;
const meshes=[];
root.traverse(object=>{
  if(object.isLight) object.visible=false;
  if(!object.isMesh) return;
  if(omitted.test(object.name)) object.visible=false;
  if(object.visible) meshes.push(object);
});
const groups = {
  edges: meshes.filter(m=>/^(roof_plane|signature_cantilever|upper_floor_slab)$/.test(m.name)).map(m=>m.name),
  thresholds: meshes.filter(m=>/^(living_glass_|master_glass_|screen_left_core_recess_glass|pool_water)/.test(m.name)).map(m=>m.name),
  timber: meshes.filter(m=>/^(timber_fin_|signature_timber_soffit)/.test(m.name)).map(m=>m.name)
};
const bounds = new THREE.Box3();
meshes.forEach(mesh=>bounds.union(new THREE.Box3().setFromObject(mesh)));
const center = bounds.getCenter(new THREE.Vector3());
const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
// The same pool-side orientation as the studio: fins on the left of the facade,
// stair terrace on the right, water in front. Orthographic projection preserves
// the relative widths, setbacks and pool-to-house separation.
camera.position.copy(center).add(new THREE.Vector3(-22,18,32));
camera.lookAt(center);camera.updateMatrixWorld(true);
const corners=[];
for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) corners.push(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
const projected = new THREE.Box3().setFromPoints(corners);
const aspect=width/height;
const frameHeight=Math.max(projected.max.y-projected.min.y,(projected.max.x-projected.min.x)/aspect)*1.08;
const cx=(projected.min.x+projected.max.x)/2,cy=(projected.min.y+projected.max.y)/2;
camera.left=cx-frameHeight*aspect/2;camera.right=cx+frameHeight*aspect/2;
camera.top=cy+frameHeight/2;camera.bottom=cy-frameHeight/2;camera.updateProjectionMatrix();
scene.add(new THREE.AmbientLight(0xffffff,1.7));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-10,20,14);scene.add(sun);
const outlines = new THREE.Group();scene.add(outlines);
const lineMaterial=new THREE.LineBasicMaterial({color:'#aaa394',transparent:true,opacity:.5});
for(const mesh of meshes){
  const line=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,35),lineMaterial);
  line.matrixAutoUpdate=false;line.matrix.copy(mesh.matrixWorld);outlines.add(line);
}
function materialFor(mesh, active) {
  const name=mesh.name;
  let color='#e5dfd1';
  if(/glass|pool_water/.test(name)) color='#c1ceca';
  else if(/timber_fin|timber_soffit/.test(name)) color='#bbac94';
  else if(/mullion|frame|rail|dark_edge|shadow_datum|joint|vertical_gap/.test(name)) color='#848779';
  else if(/terrace|pool_coping|ground_floor_slab|pool_basin/.test(name)) color='#d8ceba';
  else if(/soil/.test(name)) color='#c7c4b2';
  if(groups[active].includes(name)) color=active==='thresholds'?'#6eab98':active==='timber'?'#ae7e44':'#c4a46e';
  return new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
}
function landmark(name, edge=false) {
  const box=new THREE.Box3().setFromObject(root.getObjectByName(name));
  const point=box.getCenter(new THREE.Vector3());
  if(edge){point.y=box.max.y;point.z=box.max.z;}
  const screen=point.clone().project(camera);
  return {mesh:name,world:point.toArray(),svg:[(screen.x+1)*360,(1-screen.y)*240],bounds:{min:box.min.toArray(),max:box.max.toArray()}};
}
const landmarks={edges:landmark('roof_plane',true),thresholds:landmark('living_glass_03'),timber:landmark('timber_fin_04'),pool:landmark('pool_water')};
window.exportDesignStudy=()=>{
  const images={};
  for(const active of ['edges','thresholds','timber']){
    for(const mesh of meshes){
      if(mesh.userData.studyMaterial)mesh.material.dispose();
      mesh.material=materialFor(mesh,active);mesh.userData.studyMaterial=true;
    }
    renderer.render(scene,camera);
    images[active]=renderer.domElement.toDataURL('image/webp',.95);
  }
  return {threeRevision:THREE.REVISION,images,width,height,viewBox:[0,0,720,480],projection:'orthographic',viewerRotationY:Math.PI,includedMeshes:meshes.map(m=>m.name).sort(),highlightedMeshes:groups,landmarks,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,near:camera.near,far:camera.far}};
};
window.designStudyReady=true;
