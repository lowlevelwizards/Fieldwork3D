/** M3.0C1: actual WebGL production vs pre-compile shotgun testbed.
 * Standalone review page, never included in gameplay or per-frame updates.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette,
 weaponSilhouetteParts,weaponDetailParts,weaponSignatureParts}
 from './breach-weapon-geometry.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
const width=720,height=405;
const steel=new THREE.MeshStandardMaterial({color:0x58645d,roughness:.86});
const dark=new THREE.MeshStandardMaterial({color:0x202928,roughness:.94});
const material=[steel,dark];
const raw=new THREE.Group();
const add=(x:number,y:number,z:number,w:number,h:number,d:number,mat:0|1)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),
  w,h,d),material[mat]);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 raw.add(mesh);
};
// The unchanged legacy authoring arrays are an independent pre-compile source.
for(const [baseX,y,z,baseW,h,d,mat] of weaponSilhouetteParts('shotgun')){
 let x=baseX,w=baseW;
 if(baseX< -12)x=-13.5+baseW/2;
 else if(baseX< -8){
  const front=baseX+baseW/2;
  w=Math.max(1.2,front+13.5);x=(front-13.5)/2;
 }
 add(x,y,z,w,h,d,mat);
}
for(const [x,y,z,w,h,d,mat] of
 [...weaponDetailParts('shotgun'),...weaponSignatureParts('shotgun')])
 add(x,y,z,w,h,d,mat);
const compiled=buildWeaponSilhouette('shotgun',steel,dark);
const renderer=new THREE.WebGLRenderer({antialias:false,
 preserveDrawingBuffer:true});
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
if(!(sheet instanceof HTMLElement))throw Error('Shotgun review sheet missing');
type Capture=Readonly<{pixels:Uint8Array;calls:number;triangles:number;image:string}>;
const capture=(model:THREE.Group):Capture=>{
 scene.add(model);
 renderer.setRenderTarget(target);renderer.info.reset();
 renderer.render(scene,camera);
 const pixels=new Uint8Array(width*height*4);
 renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
 const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
 renderer.setRenderTarget(null);
 renderer.render(scene,camera);
 const image=renderer.domElement.toDataURL('image/png');
 scene.remove(model);
 return {pixels,calls,triangles,image};
};
const views=[
 {name:'right-side',position:[2,9,75]},
 {name:'left-side',position:[2,9,-75]},
 {name:'three-quarter',position:[29,21,60]}
] as const;
const stats=[];
for(const view of views){
 camera.position.set(view.position[0],view.position[1],view.position[2]);
 camera.lookAt(2,0,0);
 camera.updateProjectionMatrix();
 const before=capture(raw),after=capture(compiled);
 let differing=0,sum=0,max=0;
 for(let i=0;i<before.pixels.length;i+=4){
  let delta=0;
  for(let c=0;c<3;c++)delta+=
   Math.abs(before.pixels[i+c]-after.pixels[i+c]);
  if(delta>9)differing++;
  sum+=delta;max=Math.max(max,delta);
 }
 const record={view:view.name,originalCalls:before.calls,
  compiledCalls:after.calls,originalTriangles:before.triangles,
  compiledTriangles:after.triangles,differingPixels:differing,
  meanRgbDelta:sum/(width*height*3),maxRgbDelta:max,
  width,height};
 stats.push(record);
 for(const item of [{label:'Original',data:before},
  {label:'Compiled',data:after}]){
  const panel=document.createElement('section');panel.className='panel';
  const title=document.createElement('h2');
  title.textContent=view.name+' · '+item.label;
  const image=document.createElement('img');
  image.src=item.data.image;image.width=width;image.height=height;
  image.style.width='100%';
  panel.append(title,image);sheet.append(panel);
 }
}
document.body.dataset.m30Stats=JSON.stringify(stats);
document.body.dataset.m30Complete='true';
clearWeaponSilhouette(raw);clearWeaponSilhouette(compiled);
target.dispose();renderer.dispose();steel.dispose();dark.dispose();
