/** M3.0C3 real WebGL proof, isolated from game/Arsenal runtime.
 * Two independently produced factory weapons. Compile only the opt-in copy.
 * Count actual render.calls and compare GPU framebuffer pixels from 3 views.
 * Do NOT call commit(): authoring components are kept for restoration.
 */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from './arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from './equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from './breach-weapon-geometry.ts';
import {compileRigidWeaponPartPilot}
 from './weapons/geometry/rigid-weapon-part-pilot.ts';
import {partVisualBounds,workbenchVisualAnchors}
 from './weapons/geometry/weapon-visual-anchors.ts';

const width=720,height=405;
const steel=new THREE.MeshStandardMaterial({color:0x58645d,roughness:.86});
const polymer=new THREE.MeshStandardMaterial({color:0x202928,roughness:.94});
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setSize(width,height);renderer.setPixelRatio(1);
renderer.info.autoReset=false;
const target=new THREE.WebGLRenderTarget(width,height);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#2c3536');
scene.add(new THREE.AmbientLight(0xffffff,2));
const sun=new THREE.DirectionalLight(0xffffff,2.7);
sun.position.set(-12,22,27);scene.add(sun);
const camera=new THREE.OrthographicCamera(-24,24,13.5,-13.5,.1,200);
const sheet=document.querySelector('#sheet');
if(!(sheet instanceof HTMLElement))throw Error('M3.0C3 capture sheet missing');
type Shot={pixels:Uint8Array;calls:number;triangles:number;image:string};
const capture=(model:THREE.Group):Shot=>{
 scene.add(model);
 renderer.setRenderTarget(target);renderer.info.reset();
 renderer.render(scene,camera);
 const pixels=new Uint8Array(width*height*4);
 renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
 const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
 renderer.setRenderTarget(null);renderer.render(scene,camera);
 const image=renderer.domElement.toDataURL('image/png');
 scene.remove(model);
 return {pixels,calls,triangles,image};
};
const views=[
 {name:'right',xyz:[2,9,75]},
 {name:'left',xyz:[2,9,-75]},
 {name:'three-quarter',xyz:[29,21,60]}
] as const;
const trials=['ak-akms','ak-aks74u','ar-m4a1'] as const;
// C3 continues proving the isolated compiler; C4 additionally proves the
// default live shared-builder path with two independent production builds.
const liveMode=new URLSearchParams(location.search).get('mode')==='production';
const slots=['receiver','barrel','handguard','stock','grip'] as const;
const records=[];
for(const id of trials){
 const preset=ARSENAL_REFERENCES.find(x=>x.id===id);
 if(!preset)throw Error('Missing production weapon '+id);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.legacy.weapon),preset.id);
 if(!config.build)throw Error('Missing installed parts '+id);
 const baseline=buildWeaponSilhouette(config.weapon,steel,polymer,config,
  {rigidCompilation:'disabled'});
 const optimized=buildWeaponSilhouette(config.weapon,steel,polymer,config,
  liveMode?{}:{rigidCompilation:'disabled'});
 try{
  const originalAnchors=workbenchVisualAnchors(config,baseline,'body');
  const originalMagazine=baseline.children.filter(x=>
   x.name.startsWith('family-magazine-')).map(x=>x.name);
  const originalBounds=new THREE.Box3().setFromObject(baseline);
  const slotBoxes=new Map(slots.map(slot=>[
   slot,partVisualBounds(baseline,slot)] as const));
  const changes=liveMode?[]:slots.map(slot=>
   compileRigidWeaponPartPilot(optimized,slot,config.build!.parts[slot]));
  const report=optimized.userData.rigidCompilation;
  const predictedSaved=liveMode?
   report?.avoidedSubmissions??0:
   changes.reduce((n,c)=>n+c.avoidedSubmissions,0);
  if(liveMode&&report?.factoryId!==id)
   throw Error('Shared production builder did not compile '+id);
  if(predictedSaved<5)throw Error('Insufficient opt-in saving for '+id);
  const magazine=optimized.children.filter(x=>
   x.name.startsWith('family-magazine-')).map(x=>x.name);
  if(JSON.stringify(magazine)!==JSON.stringify(originalMagazine))
   throw Error('Reload magazine changed for '+id);
  const updatedAnchors=workbenchVisualAnchors(config,optimized,'body');
  for(const a of originalAnchors){
   const b=updatedAnchors.find(x=>x.slot===a.slot);
   if(!b||Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>.0001)
    throw Error('Workbench selection anchor changed: '+id+'/'+a.slot);
  }
  const bounds=new THREE.Box3().setFromObject(optimized);
  const boxDiff=(a:THREE.Box3,b:THREE.Box3)=>{
   const coords=[...a.min.toArray(),...a.max.toArray()],
    other=[...b.min.toArray(),...b.max.toArray()];
   return Math.max(...coords.map((x,i)=>Math.abs(x-other[i])));
  };
  if(boxDiff(originalBounds,bounds)>.0001)
   throw Error('Whole-weapon envelope changed: '+id);
  for(const slot of slots){
   const a=slotBoxes.get(slot),b=partVisualBounds(optimized,slot);
   if(!a||!b||boxDiff(a,b)>.0001)
    throw Error('Authoritative part hitbox changed: '+id+'/'+slot);
  }
  for(const view of views){
   camera.position.set(view.xyz[0],view.xyz[1],view.xyz[2]);
   camera.lookAt(2,0,0);camera.updateProjectionMatrix();
   const before=capture(baseline),after=capture(optimized);
   let differingPixels=0,sum=0,maxRgbDelta=0;
   for(let i=0;i<before.pixels.length;i+=4){
    let delta=0;
    for(let c=0;c<3;c++)
     delta+=Math.abs(before.pixels[i+c]-after.pixels[i+c]);
    if(delta>9)differingPixels++;
    sum+=delta;maxRgbDelta=Math.max(maxRgbDelta,delta);
   }
   const result={id,view:view.name,predictedSaved,
    originalCalls:before.calls,compiledCalls:after.calls,
    originalTriangles:before.triangles,compiledTriangles:after.triangles,
    differingPixels,meanRgbDelta:sum/(width*height*3),maxRgbDelta,
    magazineMeshes:magazine.length,anchors:updatedAnchors.length,
    width,height};
   records.push(result);
   for(const item of [{label:'factory',shot:before},
    {label:'opt-in',shot:after}]){
    const panel=document.createElement('section');panel.className='panel';
    const title=document.createElement('h2');
    title.textContent=id+' / '+view.name+' / '+item.label;
    const image=document.createElement('img');
    image.src=item.shot.image;image.width=width;image.height=height;
    panel.append(title,image);sheet.append(panel);
   }
  }
  // Validate original references can still be reattached after every render.
  if(!liveMode){
   changes.slice().reverse().forEach(x=>x.restore());
   if(optimized.children.length!==baseline.children.length)
    throw Error('Restore did not recover every authored part: '+id);
  }else if(optimized.userData.rigidCompilation?.avoidedSubmissions!==
   predictedSaved)throw Error('Live compilation was not retained: '+id);
 }finally{
  clearWeaponSilhouette(baseline);clearWeaponSilhouette(optimized);
 }
}
if(liveMode){
 document.body.dataset.m30C4Stats=JSON.stringify(records);
 document.body.dataset.m30C4Complete='true';
}else{
 document.body.dataset.m30C3Stats=JSON.stringify(records);
 document.body.dataset.m30C3Complete='true';
}
target.dispose();renderer.dispose();steel.dispose();polymer.dispose();
