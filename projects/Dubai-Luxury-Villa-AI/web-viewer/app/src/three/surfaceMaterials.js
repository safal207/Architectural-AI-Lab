/** Local CC0 PBR maps, metre-scaled UVs and adjustable stone joints. */
export function createSurfaceMaterials(THREE, {root, surfaces = [], renderer, onChange = () => {}}) {
  const textures = [], restores = [], decks = [], geometries = [];
  const uniforms = {uJointSize:{value:1.2}, uTimber:{value:0}};
  const report = {profile:'meter-scaled-cc0-pbr-v1',textureCount:6,loaded:0,failed:0,terrace:'stone',joints:'large'};
  let disposed = false;
  const loader = new THREE.TextureLoader();
  function load(asset, map, color = false) {
    const texture = loader.load(`${import.meta.env.BASE_URL}materials/${asset}-${map}.jpg`, () => {
      if(disposed) { texture.dispose(); return; }
      report.loaded++; onChange();
    }, undefined, () => { report.failed++; onChange(); });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
    textures.push(texture); return texture;
  }
  const wood = {map:load('wood_floor_deck','Diffuse',true),normalMap:load('wood_floor_deck','nor_gl'),roughnessMap:load('wood_floor_deck','Rough')};
  const asphalt = {map:load('asphalt_02','Diffuse',true),normalMap:load('asphalt_02','nor_gl'),roughnessMap:load('asphalt_02','Rough')};
  // These selected surfaces are horizontal; world-space projection keeps boards
  // and aggregate consistent across meshes of different dimensions.
  function project(mesh, meters) {
    const original = mesh.geometry, geometry = original.clone();
    mesh.updateWorldMatrix(true,false);
    const positions=geometry.getAttribute('position'), uv=new Float32Array(positions.count*2),point=new THREE.Vector3();
    for(let i=0;i<positions.count;i++) { point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld); uv[i*2]=point.x/meters;uv[i*2+1]=point.z/meters; }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2)); mesh.geometry=geometry; geometries.push(geometry);
    restores.push(()=>{mesh.geometry=original;});
  }
  const deck=root.getObjectByName('terrace_deck');
  if(deck) decks.push(deck);
  for(const {mesh,kind} of surfaces) {
    if(kind==='asphalt') {
      project(mesh,2);
      const mat=mesh.material, old={map:mat.map,normalMap:mat.normalMap,roughnessMap:mat.roughnessMap,color:mat.color.clone()};
      Object.assign(mat,asphalt);mat.color.set('#a3a3a3');mat.normalScale.set(.38,.38);mat.needsUpdate=true;
      restores.push(()=>{Object.assign(mat,old);mat.needsUpdate=true;});
    }
    if(kind==='deck' && !decks.includes(mesh)) decks.push(mesh);
  }
  for(const mesh of decks) {
    project(mesh,1.8);
    const mat=mesh.material;
    const old={map:mat.map,normalMap:mat.normalMap,roughnessMap:mat.roughnessMap,normalScale:mat.normalScale.clone(),color:mat.color.clone(),roughness:mat.roughness};
    const compile=mat.onBeforeCompile, cache=mat.customProgramCacheKey;
    mat.onBeforeCompile=function(shader,...args){
      compile.call(this,shader,...args);
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec3 vFinishWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishWorld=(modelMatrix*vec4(position,1.0)).xyz;');
      shader.fragmentShader='varying vec3 vFinishWorld; uniform float uJointSize; uniform float uTimber;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 grid=abs(fract(vFinishWorld.xz/uJointSize)-0.5);
        vec2 aa=max(fwidth(vFinishWorld.xz/uJointSize),vec2(0.0005));
        vec2 joint=smoothstep(vec2(0.5)-aa-0.006,vec2(0.5)-aa,grid);
        float line=max(joint.x,joint.y)*(1.0-uTimber);
        diffuseColor.rgb*=1.0-line*0.24;`);
    };
    mat.customProgramCacheKey=function(){return cache.call(this)+'|estate-stone-joints-v1';};
    decks[decks.indexOf(mesh)]={mesh,mat,old};
    restores.push(()=>{mat.onBeforeCompile=compile;mat.customProgramCacheKey=cache;Object.assign(mat,old);mat.needsUpdate=true;});
  }
  return {report,setState({terrace='stone',joints='large',stoneColor}={}) {
    uniforms.uJointSize.value=joints==='fine'?.6:1.2;
    uniforms.uTimber.value=terrace==='timber'?1:0;
    for(const {mat,old} of decks) {
      const maps=terrace==='timber'?wood:old;
      const changed=mat.map!==maps.map;
      mat.map=maps.map;mat.normalMap=maps.normalMap;mat.roughnessMap=maps.roughnessMap;
      mat.normalScale.copy(terrace==='timber'?new THREE.Vector2(.35,.35):old.normalScale);
      if(terrace==='timber')mat.color.set('#d6c6a9');
      else if(stoneColor)mat.color.set(stoneColor);
      else if(report.terrace==='timber')mat.color.copy(old.color);
      if(changed)mat.needsUpdate=true;
    }
    report.terrace=terrace;report.joints=joints;
  },dispose(){disposed=true;for(const restore of restores.reverse())restore();textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());}};
}
