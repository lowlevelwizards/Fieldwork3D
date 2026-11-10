/** Opt-in authentic historical operator rig, neutral pose not an impact pose.
 * No 3D view or GPU work unless a player selects it from the combat report.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../breach-operator-rig.ts';
import type {ReplayActorIdentity} from '../breach-replay-manifest.ts';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function mountAfterActionModel(host:HTMLElement,
 identity:ReplayActorIdentity):()=>void{
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,
    powerPreference:'low-power'});}
 catch{host.textContent='3D UNAVAILABLE · PAPER DOLL REMAINS AVAILABLE';return ()=>{};}
 let disposed=false;
 const dim=Math.min(420,Math.max(220,Math.round(host.clientWidth||320)));
 renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
 renderer.setSize(dim,Math.min(400,dim),false);
 const canvas=renderer.domElement;
 canvas.className='fw-after-model-canvas';
 canvas.style.width='100%';canvas.style.height='auto';canvas.style.touchAction='none';
 host.replaceChildren(canvas);
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#192b26');
 scene.add(new THREE.AmbientLight(0xffffff,1.8));
 const key=new THREE.DirectionalLight(0xffebc8,2.3);
 key.position.set(-45,100,-70);scene.add(key);
 const fill=new THREE.DirectionalLight(0xd5e9f5,1);
 fill.position.set(45,30,55);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(35,1,.1,2000);
 const rig=createOperatorRig(identity.id,identity.side);
 scene.add(rig.root);
 poseOperator(rig,{
   x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:identity.weapon,
   weaponConfiguration:identity.weaponConfiguration,
   equipment:identity.equipment,wardrobe:identity.wardrobe,
   appearanceSeed:identity.appearanceSeed,
   reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   poseDiagnostics:false,deterministic:true
 },0);
 let yaw=0,pitch=.22,distance=115;
 const focus=new THREE.Vector3(0,26,0);
 function redraw(){
   if(disposed)return;
   camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,
     focus.y+Math.sin(pitch)*distance,
     -Math.cos(yaw)*Math.cos(pitch)*distance);
   camera.lookAt(focus);renderer.render(scene,camera);
 }
 redraw();
 let dragId:number|null=null,lastX=0,lastY=0;
 const down=(e:PointerEvent)=>{
   if(dragId!==null)return;dragId=e.pointerId;
   lastX=e.clientX;lastY=e.clientY;
   canvas.setPointerCapture(e.pointerId);
 };
 const move=(e:PointerEvent)=>{
   if(e.pointerId!==dragId)return;
   yaw+=(e.clientX-lastX)*.013;
   pitch=clamp(pitch+(e.clientY-lastY)*.009,-.55,.85);
   lastX=e.clientX;lastY=e.clientY;redraw();
 };
 const up=(e:PointerEvent)=>{
   if(e.pointerId!==dragId)return;dragId=null;
   if(canvas.hasPointerCapture(e.pointerId))
     canvas.releasePointerCapture(e.pointerId);
 };
 const zoom=(e:WheelEvent)=>{
   e.preventDefault();distance=clamp(distance+Math.sign(e.deltaY)*8,65,180);
   redraw();
 };
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',zoom,{passive:false});
 return ()=>{
   if(disposed)return;disposed=true;
   canvas.removeEventListener('pointerdown',down);
   canvas.removeEventListener('pointermove',move);
   canvas.removeEventListener('pointerup',up);
   canvas.removeEventListener('pointercancel',up);
   canvas.removeEventListener('wheel',zoom);
   rig.dispose();scene.remove(rig.root);
   renderer.dispose();renderer.forceContextLoss();canvas.remove();
 };
}
