/** R870 P10 production WebGL review surface, using the exact shared
 * factory silhouette builder and materials used in Arsenal/Operator Studio.
 * No proxy mesh, no separate geometry source, no gameplay writes.
 */
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from './breach-weapon-geometry.ts';
import {partVisualBounds} from './weapons/geometry/weapon-visual-anchors.ts';
import {FAMILY_PART_SLOTS} from './equipment-weapon-families.ts';
import {R870_P07} from './weapons/geometry/r870-art-contract.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from './weapons/geometry/weapon-visual-palette.ts';

const config=selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),
 'r870-police-wood');
if(config.build?.family!=='r870')throw Error('R870 factory reference missing');
const assembly=resolveWeaponAssembly(config);
if(assembly.muzzleX!==R870_P07.muzzleX||
 assembly.stockX!==R870_P07.stockX)
 throw Error('Shot-time muzzle/shoulder datum differs from visible model');
const gun=buildWeaponSilhouette('shotgun',
 WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,config);
if(!gun.userData.r870P10)throw Error('R870 P10 art is not using live silhouette');
const whole=new THREE.Box3().setFromObject(gun);
if(Math.abs(whole.min.x-R870_P07.stockX)>.02||
 Math.abs(whole.max.x-R870_P07.muzzleX)>.02)
 throw Error('R870 visible shell does not fit its contact landmarks');
for(const slot of FAMILY_PART_SLOTS)
 if(!partVisualBounds(gun,slot))
  throw Error('R870 missing actual Arsenal pickable body '+slot);
const sheet=document.querySelector('#sheet');
if(!(sheet instanceof HTMLElement))throw Error('Missing R870 WebGL sheet');
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setSize(720,420);renderer.setPixelRatio(1);
const target=new THREE.WebGLRenderTarget(720,420);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#253330');
scene.add(new THREE.AmbientLight(0xffffff,2.1));
const light=new THREE.DirectionalLight(0xffffff,2.8);
light.position.set(-11,24,24);scene.add(light,gun);
const camera=new THREE.OrthographicCamera(-23,23,13.42,-13.42,.1,200);
const views=[
 {name:'right',x:0,y:4,z:75},
 {name:'three-quarter',x:29,y:21,z:60},
 {name:'left',x:0,y:4,z:-75}
] as const;
const results=[];
try{
 for(const view of views){
  camera.position.set(view.x,view.y,view.z);
  camera.lookAt(1.4,-1,0);
  camera.updateProjectionMatrix();
  renderer.setRenderTarget(target);renderer.render(scene,camera);
  const pixels=new Uint8Array(720*420*4);
  renderer.readRenderTargetPixels(target,0,0,720,420,pixels);
  const bg=pixels.slice(0,3);
  let visible=0;
  for(let i=0;i<pixels.length;i+=4)
   if(Math.abs(pixels[i]-bg[0])+Math.abs(pixels[i+1]-bg[1])+
     Math.abs(pixels[i+2]-bg[2])>25)visible++;
  renderer.setRenderTarget(null);renderer.render(scene,camera);
  if(visible<3000)throw Error('Blank R870 '+view.name+' screenshot: '+visible);
  const panel=document.createElement('section');
  panel.className='panel';
  const name=document.createElement('h2');
  name.textContent='P10 / '+view.name;
  const img=document.createElement('img');
  img.src=renderer.domElement.toDataURL('image/png');
  img.width=720;img.height=420;
  panel.append(name,img);sheet.append(panel);
  results.push({view:view.name,occupiedPixels:visible,
   triangles:renderer.info.render.triangles,
   calls:renderer.info.render.calls});
 }
 document.body.dataset.r870P07Stats=JSON.stringify(results);
 document.body.dataset.r870P07Complete='true';
}finally{
 scene.remove(gun);clearWeaponSilhouette(gun);
 target.dispose();renderer.dispose();
}
