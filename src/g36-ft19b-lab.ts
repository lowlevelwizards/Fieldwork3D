/** FT1.9E1: ALL seven meshes now use the real production family builders.
 * Fixed orthographic row framing in all views: rotate each mesh at its own
 * row pivot, never look down the axis used to separate the comparison rows.
 * One flat black silhouette or shared softly lit clay; only render on events.
 */
import * as THREE from 'three';
import {applyG36FactoryMaterials,buildG36OriginalBlockout,type G36ArtReview} from './weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART} from './weapons/geometry/g36-art-layout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from './breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from './equipment-weapon-assemblies.ts';
import {weaponVisualLayout} from './weapons/geometry/weapon-visual-layout.ts';
import {addArsenalInspectionLighting} from './arsenal/inspection-lighting.ts';
import {applyG36PixelDetails} from './weapons/geometry/g36-pixel-details.ts';
import {HK_BLACK_METAL,HK_MUZZLE_METAL,
 G36_DARK_POLYMER,G36_OPTIC_RIM,G36_LENS_BLACK,G36_RUBBER,
 G36_SMOKED_MAGAZINE} from './weapons/geometry/weapon-visual-palette.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#view');
const detail=document.querySelector<HTMLCanvasElement>('#detail');
const small128=document.querySelector<HTMLCanvasElement>('#thumb128');
const small64=document.querySelector<HTMLCanvasElement>('#thumb64');
if(!canvas||!detail||!small128||!small64)
 throw Error('FT1.9C: missing comparison, detail, or thumbnail canvases');
const mainCanvas=canvas,detailCanvas=detail;
const renderer=new THREE.WebGLRenderer({canvas:mainCanvas,antialias:false,powerPreference:'low-power'});
const detailRenderer=new THREE.WebGLRenderer({canvas:detailCanvas,antialias:true,powerPreference:'low-power'});
const thumbnail128=new THREE.WebGLRenderer({canvas:small128,antialias:false,powerPreference:'low-power'});
const thumbnail64=new THREE.WebGLRenderer({canvas:small64,antialias:false,powerPreference:'low-power'});
for(const r of [renderer,detailRenderer,thumbnail128,thumbnail64])r.setPixelRatio(1);

const scene=new THREE.Scene();
addArsenalInspectionLighting(scene);
const mono=new THREE.MeshBasicMaterial({color:0x27372e,side:THREE.DoubleSide});
const clay=new THREE.MeshStandardMaterial({
 color:0x68766a,roughness:.96,metalness:0,flatShading:true,side:THREE.DoubleSide
});
type View='side'|'quarter'|'opposite'|'top'|'front';
type Finish='flat'|'clay'|'factory';
const names:[string,'rifle'|'carbine',string][]=[
 ['FNC service','rifle','fnc-service'],
 ['FAL 50.00','rifle','fal-5000'],
 ['G3A3','rifle','hk-g3a3'],
 ['M16A2','rifle','ar-m16a2'],
 ['M4A1','carbine','ar-m4a1'],
 ['AKM','rifle','ak-akm']
];
const items:{name:string;model:THREE.Group;pivot:THREE.Group}[]=[];
// E1: the review's G36 is now the EXACT live production builder path,
 // just like the other six original peer models. No isolated look-alike.
const g36Config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
if(g36Config.build?.family!=='g36')throw Error('G36 E1 factory configuration unavailable');
const g36=buildWeaponSilhouette('rifle',mono,mono,g36Config);
if(!g36.userData.g36OriginalFactory)throw Error('G36 review bypassed production renderer');
g36.traverse(node=>{if(node instanceof THREE.Mesh)node.material=mono;});
g36.scale.x=weaponVisualLayout(g36Config).longitudinalScale;
if(Math.abs(g36.scale.x-G36_B_ART.displayLongitudinalScale)>.001)
 throw Error('G36 rig presentation scale deviates from authored master');
items.push({name:'G36 original',model:g36,pivot:new THREE.Group()});
// P7 alternatives invoke the same actual source builder, not painted lookalikes.
type ReviewMode='production'|'p6'|'lower'|'rear'|'sweep'|'combined';
const reviewOptions:Readonly<Record<Exclude<ReviewMode,'production'|'p6'>,G36ArtReview>>={
 lower:{optic:'lower-emphasis'},rear:{optic:'rear-integrated'},
 sweep:{magazine:'curve'},
 combined:{optic:'rear-integrated',magazine:'curve'}
};
const reviewModels=new Map<ReviewMode,THREE.Group>([['production',g36]]);
let review:ReviewMode='production';
for(const [name,weapon,preset] of names){
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset);
 const model=buildWeaponSilhouette(weapon,mono,mono,cfg);
 model.traverse(node=>{if(node instanceof THREE.Mesh)node.material=mono;});
 model.scale.x=weaponVisualLayout(cfg).longitudinalScale;
 items.push({name,model,pivot:new THREE.Group()});
}
items.forEach(({model,pivot},i)=>{
 pivot.position.y=69-i*23;
 pivot.add(model);
 scene.add(pivot);
});
// Measured from REAL authored peer builders, at the same display scales.
// Never normalize individual peers merely to improve a contact sheet.
const lengthX=(g:THREE.Group)=>new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).x;
const g36Length=lengthX(g36);
const m16Length=lengthX(items.find(item=>item.name==='M16A2')!.model);
const fncLength=lengthX(items.find(item=>item.name==='FNC service')!.model);
const ratio=g36Length/m16Length;
const dimensionLabel=document.getElementById('dimensions');
if(dimensionLabel)dimensionLabel.textContent='Displayed art units: G36 '+g36Length.toFixed(2)+
 ' / M16A2 '+m16Length.toFixed(2)+' / FNC '+fncLength.toFixed(2)+
 ' · G36:M16A2 '+ratio.toFixed(3)+' (observed, not normalized)';
document.body.dataset.g36LengthRatio=ratio.toFixed(4);
console.log('G36 D1 peer scale audit',JSON.stringify({
 g36:g36Length,m16a2:m16Length,fnc:fncLength,ratio
}));
let view:View='side',finish:Finish='flat';
const camera=new THREE.OrthographicCamera(-58,58,83,-83,.1,400);
const oneCamera=new THREE.OrthographicCamera(-21,21,13,-13,.1,400);
const smallCamera=new THREE.OrthographicCamera(-19,19,19,-19,.1,400);
function orient():void{
 // The model rotates in its own row; the Y-stacked comparison row NEVER
 // disappears in TOP or FRONT (prior FT1.9B camera-axis mistake).
 for(const {pivot} of items){
  pivot.rotation.set(0,0,0);
  if(view==='quarter')pivot.rotation.set(.13,-.30,0);
  else if(view==='opposite')pivot.rotation.y=Math.PI;
  else if(view==='top')pivot.rotation.x=Math.PI/2;
  else if(view==='front')pivot.rotation.y=-Math.PI/2;
 }
}
function cameraAt(cam:THREE.OrthographicCamera,y:number):void{
 cam.position.set(1,y,160);
 cam.up.set(0,1,0);
 cam.lookAt(1,y,0);
 cam.updateProjectionMatrix();
}
function render():void{
 orient();
 const w=Math.max(1,mainCanvas.clientWidth),h=Math.max(1,mainCanvas.clientHeight);
 renderer.setSize(w,h,false);
 const halfH=Math.max(83,28/(w/h));
 camera.top=halfH;camera.bottom=-halfH;
 camera.left=-halfH*w/h;camera.right=halfH*w/h;
 cameraAt(camera,0);
 renderer.render(scene,camera);

 const dw=Math.max(1,detailCanvas.clientWidth);
 const dh=Math.max(1,detailCanvas.clientHeight);
 detailRenderer.setSize(dw,dh,false);
 const halfW=Math.max(19,13*dw/dh);
 oneCamera.left=-halfW;oneCamera.right=halfW;
 oneCamera.top=halfW*dh/dw;oneCamera.bottom=-halfW*dh/dw;
 cameraAt(oneCamera,69);
 detailRenderer.render(scene,oneCamera);

 // Native 64px/128px comparisons retain SIDE view even when inspector rotates.
 const restore=items[0].pivot.rotation.clone();
 items[0].pivot.rotation.set(0,0,0);
 cameraAt(smallCamera,69);
 for(const [width,preview] of [[128,thumbnail128],[64,thumbnail64]] as const){
  preview.setSize(width,width,false);
  preview.render(scene,smallCamera);
 }
 items[0].pivot.rotation.copy(restore);
}
function setView(next:View):void{
 view=next;
 for(const id of ['side','quarter','opposite','top','front'])
  document.getElementById(id)?.setAttribute('aria-pressed',String(id===view));
 document.body.dataset.g36LabView=view;
 render();
}
function setFinish(next:Finish):void{
 finish=next;
 const material=finish==='flat'?mono:clay;
 for(const {model} of items){
  model.traverse(node=>{if(node instanceof THREE.Mesh)node.material=material;});
 }
 if(finish==='factory')applyG36FactoryMaterials(items[0].model,{
  polymer:G36_DARK_POLYMER,steel:HK_BLACK_METAL,
  magazine:G36_SMOKED_MAGAZINE,buttpad:G36_RUBBER,
  optic:G36_DARK_POLYMER,opticRim:G36_OPTIC_RIM,lens:G36_LENS_BLACK,
  muzzle:HK_MUZZLE_METAL
 });
 if(finish==='factory')applyG36PixelDetails(items[0].model);
 for(const id of ['flat','clay','factory'])
  document.getElementById(id)?.setAttribute('aria-pressed',String(id===finish));
 document.body.dataset.g36LabFinish=finish;
 render();
}
for(const id of ['side','quarter','opposite','top','front'] as const){
 const btn=document.getElementById(id);
 if(!(btn instanceof HTMLButtonElement))throw Error('Missing G36 view '+id);
 btn.addEventListener('click',()=>setView(id));
}
function setReview(mode:ReviewMode):void{
 if(mode===review)return;
 const slot=items[0];
 let next=reviewModels.get(mode);
 if(!next){
  next=buildG36OriginalBlockout(mono,mode==='p6'
   ?{optic:'p6',magazine:'p6'}
   :reviewOptions[mode as Exclude<ReviewMode,'production'|'p6'>]);
  next.scale.x=g36.scale.x;
  reviewModels.set(mode,next);
 }
 slot.pivot.remove(slot.model);
 slot.model=next;
 slot.pivot.add(next);
 review=mode;
 document.body.dataset.g36LabReview=mode;
 for(const id of ['production','p6','lower','rear','sweep','combined'] as const)
  document.getElementById('review-'+id)?.setAttribute('aria-pressed',String(id===mode));
 setFinish(finish);
}
for(const id of ['production','p6','lower','rear','sweep','combined'] as const){
 const btn=document.getElementById('review-'+id);
 if(!(btn instanceof HTMLButtonElement))throw Error('Missing G36 review '+id);
 btn.addEventListener('click',()=>setReview(id));
}
for(const id of ['flat','clay','factory'] as const){
 const btn=document.getElementById(id);
 if(!(btn instanceof HTMLButtonElement))throw Error('Missing G36 finish '+id);
 btn.addEventListener('click',()=>setFinish(id));
}
const observer=new ResizeObserver(render);
observer.observe(mainCanvas);observer.observe(detailCanvas);
window.addEventListener('pagehide',()=>{
 observer.disconnect();
 items.slice(1).forEach(({model})=>clearWeaponSilhouette(model));
 for(const model of reviewModels.values())clearWeaponSilhouette(model);
 mono.dispose();clay.dispose();
 renderer.dispose();detailRenderer.dispose();
 thumbnail128.dispose();thumbnail64.dispose();
},{once:true});
document.body.dataset.g36LabView=view;
document.body.dataset.g36LabFinish=finish;
document.body.dataset.g36LabReview=review;
render();
document.body.dataset.g36LabReady='true';
document.body.dataset.g36LabCount=String(items.length);
