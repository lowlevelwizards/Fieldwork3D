/** Isolated, no-frame-loop FAL S1 inspection page, not a production route. */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from './equipment-weapon-assemblies.ts';
import {buildFALStage1Silhouette} from './weapons/geometry/fal-stage1-blockout.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#view');
const side=document.querySelector<HTMLButtonElement>('#side');
const quarter=document.querySelector<HTMLButtonElement>('#quarter');
const left=document.querySelector<HTMLButtonElement>('#left');
const carry=document.querySelector<HTMLInputElement>('#carry');
const factory=document.querySelector<HTMLInputElement>('#factory');
const shaded=document.querySelector<HTMLInputElement>('#shaded');
if(!canvas||!side||!quarter||!left||!carry||!factory||!shaded)
 throw new Error('Incomplete FAL stage 1 comparison lab');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(1.75,window.devicePixelRatio||1));
const scene=new THREE.Scene();
scene.background=new THREE.Color('#172521');
scene.add(new THREE.HemisphereLight(0xe6f0e6,0x29372e,2.25));
const key=new THREE.DirectionalLight(0xffffff,2.8);
key.position.set(30,55,80);scene.add(key);
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
  if(node instanceof THREE.Mesh){
   node.userData.falShadedMaterial=node.material;
   if(!shaded.checked)node.material=monochrome;
  }
 });
 return model;
};
const m4=existing('carbine','ar-m4a1'),g3=existing('rifle','hk-g3a3');
m4.position.y=17.5;g3.position.y=0;
root.add(m4,g3);
const makeFAL=()=>factory.checked?existing('rifle','fal-5000'):
 buildFALStage1Silhouette(monochrome,{raisedCarryHandle:carry.checked});
carry.disabled=factory.checked;
let fal=makeFAL();
fal.position.y=-17.5;
root.add(fal);
let currentView:'side'|'quarter'|'left'='side';
const render=()=>{
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);
 const aspect=w/h;
 const halfH=Math.max(26,22/aspect);
 camera.left=-halfH*aspect;camera.right=halfH*aspect;
 camera.top=halfH;camera.bottom=-halfH;
 camera.updateProjectionMatrix();
 const center=new THREE.Vector3(3.5,-2.6,0);
 camera.position.set(currentView==='quarter'?28:3.5,
  currentView==='quarter'?5:-2.6,currentView==='left'?-80:80);
 camera.lookAt(center);
 camera.updateMatrixWorld();
 renderer.render(scene,camera);
};
const selectView=(view:'side'|'quarter'|'left')=>{
 currentView=view;
 side.setAttribute('aria-pressed',String(view==='side'));
 quarter.setAttribute('aria-pressed',String(view==='quarter'));
 left.setAttribute('aria-pressed',String(view==='left'));
 render();
};
side.addEventListener('click',()=>selectView('side'));
quarter.addEventListener('click',()=>selectView('quarter'));
left.addEventListener('click',()=>selectView('left'));
const refreshFAL=()=>{
 root.remove(fal);clearWeaponSilhouette(fal);
 carry.disabled=factory.checked;
 fal=makeFAL();fal.position.y=-17.5;root.add(fal);render();
};
carry.addEventListener('change',refreshFAL);
factory.addEventListener('change',refreshFAL);
shaded.addEventListener('change',()=>{
 for(const group of [m4,g3,fal])group.traverse(node=>{
  if(node instanceof THREE.Mesh&&node.userData.falShadedMaterial)
   node.material=shaded.checked?node.userData.falShadedMaterial:monochrome;
 });
 render();
});
new ResizeObserver(render).observe(canvas);
render();
