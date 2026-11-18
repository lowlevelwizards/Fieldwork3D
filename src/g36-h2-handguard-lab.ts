/** Game-independent interactive H2 sculpture study.
 * No Arsenal load/save, equipment or gameplay wiring. Renders only on input.
 */
import * as THREE from 'three';
import {
 buildG36H2Handguard,buildG36H1HandguardComparison,h2StudyStatistics
} from './weapons/geometry/g36-h2-handguard-study.ts';

type View='side'|'quarter'|'top'|'front'|'opposite';
type Mode='h1'|'h2';
const canvas=document.querySelector<HTMLCanvasElement>('#render');
const thumb128=document.querySelector<HTMLCanvasElement>('#thumb128');
const thumb64=document.querySelector<HTMLCanvasElement>('#thumb64');
if(!canvas||!thumb128||!thumb64)throw Error('H2 study canvases missing');
const main=canvas;
const renderer=new THREE.WebGLRenderer({canvas:main,antialias:true,powerPreference:'low-power'});
const small128=new THREE.WebGLRenderer({canvas:thumb128,antialias:false,powerPreference:'low-power'});
const small64=new THREE.WebGLRenderer({canvas:thumb64,antialias:false,powerPreference:'low-power'});
for(const r of [renderer,small128,small64]){
 r.setPixelRatio(1);
 r.setClearColor(0xa1aaa0);
}
const scene=new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff,1.8));
const directional=new THREE.DirectionalLight(0xffffff,2);
directional.position.set(-3,9,14);scene.add(directional);
const fill=new THREE.DirectionalLight(0xbfcfbf,1.3);
fill.position.set(5,-5,-8);scene.add(fill);
const camera=new THREE.OrthographicCamera(-6.6,6.6,4.2,-4.2,.1,80);
camera.position.set(0,0,26);camera.lookAt(0,0,0);
const tiny=new THREE.OrthographicCamera(-6.3,6.3,6.3,-6.3,.1,80);
tiny.position.set(0,0,26);tiny.lookAt(0,0,0);
const pivot=new THREE.Group();scene.add(pivot);
const h1=buildG36H1HandguardComparison(),modes:Mode[]=['h1','h2'];
let h2=buildG36H2Handguard();
pivot.add(h1,h2);
let mode:Mode='h2',view:View='side',yaw=0,pitch=0;
h1.visible=false;
const byId=(id:string)=>{
 const elem=document.getElementById(id);
 if(!elem)throw Error('Missing H2 control: '+id);
 return elem;
};
const selected=(id:string,value:boolean)=>byId(id).setAttribute('aria-pressed',String(value));
function orient():void{
 pivot.rotation.set(pitch,yaw,0);
}
function cameraSetup():void{
 const w=Math.max(1,main.clientWidth),h=Math.max(1,main.clientHeight);
 renderer.setSize(w,h,false);
 const halfH=4.05,halfW=Math.max(5.9,halfH*w/h);
 camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;
 camera.updateProjectionMatrix();
}
function draw():void{
 orient();cameraSetup();
 renderer.render(scene,camera);
 const restore=pivot.rotation.clone(),visible=h1.visible;
 h1.visible=false;h2.visible=true;
 pivot.rotation.set(0,0,0);
 for(const [r,size] of [[small128,128],[small64,64]] as const){
  r.setSize(size,size,false);r.render(scene,tiny);
 }
 pivot.rotation.copy(restore);h1.visible=visible;h2.visible=mode==='h2';
 const stats=h2StudyStatistics(h2);
 byId('status').textContent=mode.toUpperCase()+' • '+view+' • H2: '+
  stats.stations+' longitudinal stations / '+stats.corners+
  ' outer corners / '+stats.ventsPerSide+' vents per side';
 document.body.dataset.g36H2Mode=mode;
 document.body.dataset.g36H2View=view;
}
function chooseView(v:View){
 view=v;
 const poses:Record<View,[number,number]>={
  side:[0,0],quarter:[.16,-.57],front:[0,-Math.PI/2],
  top:[Math.PI/2,0],opposite:[0,Math.PI]
 };
 [pitch,yaw]=poses[v];
 for(const id of ['side','quarter','front','top','opposite'])
  selected(id,id===v);
 draw();
}
for(const v of ['side','quarter','front','top','opposite'] as const)
 byId(v).addEventListener('click',()=>chooseView(v));
function chooseMode(m:Mode):void{
 mode=m;h1.visible=mode==='h1';h2.visible=mode==='h2';
 for(const id of modes)selected(id,id===m);
 draw();
}
for(const m of modes)byId(m).addEventListener('click',()=>chooseMode(m));
const width=byId('width') as HTMLInputElement;
const mouth=byId('mouth') as HTMLInputElement;
const boss=byId('boss') as HTMLInputElement;
const vents=byId('vents') as HTMLInputElement;
function revise():void{
 const prev=h2;
 pivot.remove(prev);
 prev.traverse(obj=>{
  if(obj instanceof THREE.Mesh){
   obj.geometry.dispose();
   const materials=Array.isArray(obj.material)?obj.material:[obj.material];
   materials.forEach(m=>m.dispose());
  }
 });
 h2=buildG36H2Handguard({
  width:Number(width.value),showMouth:mouth.checked,
  showBoss:boss.checked,showVents:vents.checked
 });
 pivot.add(h2);
 h2.visible=mode==='h2';
 byId('width-label').textContent=Math.round(Number(width.value)*100)+'%';
 draw();
}
for(const el of [width,mouth,boss,vents])el.addEventListener('input',revise);
let dragging=false,lastX=0,lastY=0;
main.addEventListener('pointerdown',e=>{
 dragging=true;lastX=e.clientX;lastY=e.clientY;
 main.setPointerCapture(e.pointerId);
});
main.addEventListener('pointermove',e=>{
 if(!dragging)return;
 yaw+=(e.clientX-lastX)*.012;
 pitch=Math.max(-1.32,Math.min(1.32,pitch+(e.clientY-lastY)*.008));
 lastX=e.clientX;lastY=e.clientY;
 view='quarter';
 for(const id of ['side','quarter','front','top','opposite'])selected(id,false);
 draw();
});
for(const ev of ['pointerup','pointercancel'])
 main.addEventListener(ev,()=>{dragging=false;});
window.addEventListener('resize',draw);
draw();
