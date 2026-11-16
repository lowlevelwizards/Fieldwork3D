/** FT1.9B: real model, shared camera and monochrome peer reference capture.
 * Isolated development entry only; no factory registration or gameplay writes.
 */
import * as THREE from 'three';
import {buildG36OriginalBlockout} from './weapons/geometry/g36-silhouettes.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from './equipment-weapon-assemblies.ts';
import {weaponVisualLayout} from './weapons/geometry/weapon-visual-layout.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#view');
const small128=document.querySelector<HTMLCanvasElement>('#thumb128');
const small64=document.querySelector<HTMLCanvasElement>('#thumb64');
if(!canvas||!small128||!small64)throw Error('FT1.9B: missing lab canvases');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
const thumb128=new THREE.WebGLRenderer({canvas:small128,antialias:false,powerPreference:'low-power'});
const thumb64=new THREE.WebGLRenderer({canvas:small64,antialias:false,powerPreference:'low-power'});
renderer.setPixelRatio(1);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xa1aaa0);
const mono=new THREE.MeshBasicMaterial({color:0x29392f,side:THREE.DoubleSide});
const items:{name:string;model:THREE.Group}[]=[];
const g36=buildG36OriginalBlockout(mono);
g36.scale.x=.94;
items.push({name:'G36 original',model:g36});
for(const [name,weapon,preset] of [
 ['FNC service','rifle','fnc-service'],['FAL 50.00','rifle','fal-5000'],
 ['G3A3','rifle','hk-g3a3'],['M16A2','rifle','ar-m16a2'],
 ['M4A1','carbine','ar-m4a1'],['AKM','rifle','ak-akm']
] as const){
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset);
 const model=buildWeaponSilhouette(weapon,mono,mono,cfg);
 model.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.material=mono;});
 model.scale.x=weaponVisualLayout(cfg).longitudinalScale;
 items.push({name,model});
}
items.forEach(({model},i)=>{model.position.y=69-i*23;scene.add(model);});
const camera=new THREE.OrthographicCamera(-60,60,83,-83,.1,400);
const singleCamera=new THREE.OrthographicCamera(-19,19,19,-19,.1,400);
type View='side'|'quarter'|'opposite'|'top'|'front';
let view:View='side';
function poseCamera(camera:THREE.OrthographicCamera,mode:View,targetY:number):void{
 const target=new THREE.Vector3(1,targetY,0);
 const vec=mode==='quarter'?new THREE.Vector3(26,18,90):
  mode==='opposite'?new THREE.Vector3(1,0,-94):
  mode==='top'?new THREE.Vector3(1,94,.01):
  mode==='front'?new THREE.Vector3(94,0,.01):new THREE.Vector3(1,0,94);
 camera.up.set(0,mode==='top'?0:1,mode==='top'?-1:0);
 camera.position.copy(target).add(vec);
 camera.lookAt(target);camera.updateProjectionMatrix();
}
function render():void{
 const w=Math.max(canvas.clientWidth,1),h=Math.max(canvas.clientHeight,1);
 renderer.setSize(w,h,false);
 const halfH=Math.max(81,28/(w/h));
 camera.top=halfH;camera.bottom=-halfH;
 camera.left=-halfH*w/h;camera.right=halfH*w/h;
 poseCamera(camera,view,0);
 renderer.render(scene,camera);
 for(const [side,preview] of [[128,thumb128],[64,thumb64]] as const){
  preview.setPixelRatio(1);preview.setSize(side,side,false);
  singleCamera.left=-19;singleCamera.right=19;
  singleCamera.top=19;singleCamera.bottom=-19;
  poseCamera(singleCamera,'side',69);
  preview.render(scene,singleCamera);
 }
}
const views:View[]=['side','quarter','opposite','top','front'];
for(const mode of views){
 const button=document.getElementById(mode);
 if(!(button instanceof HTMLButtonElement))throw Error('Missing G36 view: '+mode);
 button.addEventListener('click',()=>{
  view=mode;
  for(const id of views)document.getElementById(id)?.setAttribute('aria-pressed',String(id===mode));
  render();
 });
}
let resizeObserver:ResizeObserver|undefined;
resizeObserver=new ResizeObserver(render);resizeObserver.observe(canvas);
window.addEventListener('pagehide',()=>{
 resizeObserver?.disconnect();
 items.forEach(({model})=>clearWeaponSilhouette(model));
 mono.dispose();renderer.dispose();thumb128.dispose();thumb64.dispose();
},{once:true});
render();
document.body.dataset.g36LabReady='true';
document.body.dataset.g36LabCount=String(items.length);
