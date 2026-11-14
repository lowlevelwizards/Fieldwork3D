/** Isolated, no-frame-loop FAL S1 inspection page, not a production route. */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from './equipment-weapon-assemblies.ts';
import {buildFALStage1Silhouette} from './weapons/geometry/fal-stage1-blockout.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#view');
const side=document.querySelector<HTMLButtonElement>('#side');
const quarter=document.querySelector<HTMLButtonElement>('#quarter');
const carry=document.querySelector<HTMLInputElement>('#carry');
if(!canvas||!side||!quarter||!carry)
 throw new Error('Incomplete FAL stage 1 comparison lab');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(1.75,window.devicePixelRatio||1));
const scene=new THREE.Scene();
scene.background=new THREE.Color('#172521');
const monochrome=new THREE.MeshBasicMaterial({color:0xaebbad,side:THREE.DoubleSide});
const camera=new THREE.OrthographicCamera(-22,22,26,-26,.1,300);
const root=new THREE.Group();
scene.add(root);

const existing=(weapon:'rifle'|'carbine',preset:string)=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset);
 const model=buildWeaponSilhouette(weapon,monochrome,monochrome,config);
 // Existing family art uses authored materials. Override the newly created
 // meshes for silhouette comparison only, without modifying shared palettes.
 model.traverse(node=>{
  if(node instanceof THREE.Mesh)node.material=monochrome;
 });
 return model;
};
const m4=existing('carbine','ar-m4a1'),g3=existing('rifle','hk-g3a3');
m4.position.y=17.5;g3.position.y=0;
root.add(m4,g3);
let fal=buildFALStage1Silhouette(monochrome);
fal.position.y=-17.5;
root.add(fal);
let isSide=true;
const render=()=>{
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);
 const aspect=w/h;
 const halfH=Math.max(26,22/aspect);
 camera.left=-halfH*aspect;camera.right=halfH*aspect;
 camera.top=halfH;camera.bottom=-halfH;
 camera.updateProjectionMatrix();
 const center=new THREE.Vector3(3.5,-2.6,0);
 camera.position.set(isSide?3.5:28,isSide?-2.6:5.0,80);
 camera.lookAt(center);
 camera.updateMatrixWorld();
 renderer.render(scene,camera);
};
side.addEventListener('click',()=>{
 isSide=true;side.setAttribute('aria-pressed','true');
 quarter.setAttribute('aria-pressed','false');render();
});
quarter.addEventListener('click',()=>{
 isSide=false;side.setAttribute('aria-pressed','false');
 quarter.setAttribute('aria-pressed','true');render();
});
carry.addEventListener('change',()=>{
 root.remove(fal);
 clearWeaponSilhouette(fal);
 fal=buildFALStage1Silhouette(monochrome,{raisedCarryHandle:carry.checked});
 fal.position.y=-17.5;
 root.add(fal);render();
});
new ResizeObserver(render).observe(canvas);
render();
