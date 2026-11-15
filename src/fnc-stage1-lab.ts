/** Isolated five-rifle comparison page: FNC P1 vs existing production models. */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from './equipment-weapon-assemblies.ts';
import {buildFNCStage1Silhouette} from './weapons/geometry/fnc-stage1-blockout.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#view');
const side=document.querySelector<HTMLButtonElement>('#side');
const quarter=document.querySelector<HTMLButtonElement>('#quarter');
const reverse=document.querySelector<HTMLButtonElement>('#left');
if(!canvas||!side||!quarter||!reverse)
 throw new Error('Incomplete FNC P1 silhouette lab');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a1aaa0');
const mono=new THREE.MeshBasicMaterial({color:0x27352d,side:THREE.DoubleSide});
const root=new THREE.Group();
scene.add(root);
const camera=new THREE.OrthographicCamera(-25,25,55,-55,.1,300);
const baseline=(weapon:'rifle'|'carbine',id:string)=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
 const model=buildWeaponSilhouette(weapon,mono,mono,config);
 model.traverse(node=>{
  if(node instanceof THREE.Mesh)node.material=mono;
 });
 return model;
};
const rows:readonly (readonly [string,THREE.Group])[]=[
 ['FNC',buildFNCStage1Silhouette(mono)],
 ['FAL',baseline('rifle','fal-5000')],
 ['G3',baseline('rifle','hk-g3a3')],
 ['AK-74',baseline('rifle','ak-ak74')],
 ['M16A2',baseline('rifle','ar-m16a2')]
];
rows.forEach(([,model],index)=>{
 model.position.y=42-index*21;
 root.add(model);
});
let view:'side'|'quarter'|'left'='side';
const render=()=>{
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);
 const aspect=w/h,halfH=Math.max(53,24/aspect);
 camera.left=-halfH*aspect;camera.right=halfH*aspect;
 camera.top=halfH;camera.bottom=-halfH;
 camera.updateProjectionMatrix();
 const target=new THREE.Vector3(3.25,-2.2,0);
 camera.position.set(view==='quarter'?27:3.25,view==='quarter'?12:-2.2,
  view==='left'?-82:82);
 camera.lookAt(target);
 camera.updateMatrixWorld();
 renderer.render(scene,camera);
};
const setView=(next:typeof view)=>{
 view=next;
 side.setAttribute('aria-pressed',String(next==='side'));
 quarter.setAttribute('aria-pressed',String(next==='quarter'));
 reverse.setAttribute('aria-pressed',String(next==='left'));
 render();
};
side.addEventListener('click',()=>setView('side'));
quarter.addEventListener('click',()=>setView('quarter'));
reverse.addEventListener('click',()=>setView('left'));
window.addEventListener('pagehide',()=>{
 rows.forEach(([,g])=>clearWeaponSilhouette(g));
 mono.dispose();renderer.dispose();
},{once:true});
new ResizeObserver(render).observe(canvas);
render();
