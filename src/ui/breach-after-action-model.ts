/** After Action V4-3 — one retained, read-only historical model presentation.
 * This is NOT a second pose system: both live play and debrief use the same
 * createOperatorRig/poseOperator pipeline and recorded visual identity.
 * One renderer and one rig per identity; nothing renders on an idle frame.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator,type OperatorRig}
 from '../breach-operator-rig.ts';
import type {ReplayActorIdentity} from '../breach-replay-manifest.ts';

export type AfterActionModelPresenter={
 show:(host:HTMLElement,operatorId:string|null)=>void;
 hide:()=>void;
 dispose:()=>void;
};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
type Model={rig:OperatorRig;holder:THREE.Group};
const pose=(rig:OperatorRig,actor:ReplayActorIdentity)=>{
 poseOperator(rig,{
   x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:actor.weapon,
   weaponConfiguration:actor.weaponConfiguration,
   equipment:actor.equipment,wardrobe:actor.wardrobe,
   appearanceSeed:actor.appearanceSeed,
   reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   poseDiagnostics:false,deterministic:true
 },0);
};
export function createAfterActionModelPresenter(
 identities:readonly ReplayActorIdentity[]
):AfterActionModelPresenter|null{
 if(!identities.some(actor=>actor.side==='blue'))return null;
 let renderer:THREE.WebGLRenderer;
 try{
   renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,
     powerPreference:'low-power',preserveDrawingBuffer:false});
 }catch{return null;}
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#1b3028');
 scene.add(new THREE.AmbientLight(0xffffff,1.75));
 const key=new THREE.DirectionalLight(0xffebc8,2.2);
 key.position.set(-45,100,-70);scene.add(key);
 const fill=new THREE.DirectionalLight(0xd5e9f5,1);
 fill.position.set(45,30,55);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(36,1,.1,2000);
 const canvas=renderer.domElement;
 canvas.className='fw-after-model-canvas fw-v4-model-canvas';
 canvas.style.width='100%';
 canvas.style.height='100%';
 canvas.style.touchAction='none';
 canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label',
   'Historical 3D operator models. Drag to rotate, scroll to zoom.');
 const roster=identities.filter(a=>a.side==='blue');
 const byId=new Map(identities.map(actor=>[actor.id,actor]));
 const models=new Map<string,Model>();
 // Actual rigs and equipment are built once per recorder. Host/selection
 // changes move this canvas; they never construct another WebGL context.
 const build=(actor:ReplayActorIdentity)=>{
   const existing=models.get(actor.id);if(existing)return existing;
   const rig=createOperatorRig(actor.id,actor.side);
   try{pose(rig,actor);}
   catch(error){rig.dispose();throw error;}
   const holder=new THREE.Group();holder.add(rig.root);scene.add(holder);
   const entry={rig,holder};models.set(actor.id,entry);return entry;
 };
 try{for(const actor of roster)build(actor);}
 catch{
   for(const model of models.values()){model.rig.dispose();scene.remove(model.holder);}
   renderer.dispose();renderer.forceContextLoss();return null;
 }
 let disposed=false,lost=false,host:HTMLElement|null=null;
 let selected:string|null=null,dragId:number|null=null,lastX=0,lastY=0;
 let yaw=0,pitch=.16,zoom=1;
 const lookAt=new THREE.Vector3(0,28,0);
 const focus=()=>{
   const actor=selected?byId.get(selected):null;
   if(actor&&!models.has(actor.id)){
     try{build(actor);}
     catch{return false;}
   }
   if(selected&&!models.has(selected))return false;
   const squad=!selected;
   const n=roster.length;
   const spacing=n>5?30:34;
   for(const [id,model] of models){
     const i=roster.findIndex(a=>a.id===id);
     model.holder.visible=squad?i>=0:id===selected;
     model.holder.position.set(squad?(i-(n-1)/2)*spacing:0,0,0);
   }
   const base=squad?Math.max(166,90+n*18):112;
   lookAt.set(0,28,0);
   const dist=base*zoom;
   camera.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,
     lookAt.y+Math.sin(pitch)*dist,
     -Math.cos(yaw)*Math.cos(pitch)*dist);
   camera.lookAt(lookAt);
   return true;
 };
 const draw=()=>{
   if(disposed||lost||!host||!host.isConnected)return;
   const bounds=host.getBoundingClientRect();
   const width=Math.floor(bounds.width),height=Math.floor(bounds.height);
   if(width<16||height<16)return;
   const ratio=Math.min(window.devicePixelRatio||1,1.25);
   renderer.setPixelRatio(ratio);
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   camera.updateProjectionMatrix();
   if(focus())renderer.render(scene,camera);
 };
 const observer=typeof ResizeObserver==='undefined'?null:
   new ResizeObserver(()=>draw());
 const down=(event:PointerEvent)=>{
   if(dragId!==null||lost)return;
   dragId=event.pointerId;
   lastX=event.clientX;lastY=event.clientY;
   canvas.setPointerCapture(event.pointerId);
 };
 const move=(event:PointerEvent)=>{
   if(event.pointerId!==dragId)return;
   yaw+=(event.clientX-lastX)*.012;
   pitch=clamp(pitch+(event.clientY-lastY)*.008,-.55,.85);
   lastX=event.clientX;lastY=event.clientY;
   draw();
 };
 const up=(event:PointerEvent)=>{
   if(event.pointerId!==dragId)return;
   dragId=null;
   if(canvas.hasPointerCapture(event.pointerId))
     canvas.releasePointerCapture(event.pointerId);
 };
 const wheel=(event:WheelEvent)=>{
   event.preventDefault();
   zoom=clamp(zoom+Math.sign(event.deltaY)*.1,.65,1.7);
   draw();
 };
 const contextLost=(event:Event)=>{
   event.preventDefault();lost=true;
   if(host)host.textContent='3D VIEW UNAVAILABLE · HISTORICAL RECORD REMAINS AVAILABLE';
 };
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',up);
 canvas.addEventListener('wheel',wheel,{passive:false});
 canvas.addEventListener('webglcontextlost',contextLost);
 return {
   show(nextHost,operatorId){
     if(disposed||lost)return;
     if(selected!==operatorId){yaw=0;pitch=.16;zoom=1;}
     selected=operatorId;
     if(host!==nextHost){
       observer?.disconnect();
       host=nextHost;
       host.replaceChildren(canvas);
       observer?.observe(host);
     }
     draw();
   },
   hide(){
     observer?.disconnect();
     canvas.remove();
     host=null;dragId=null;
   },
   dispose(){
     if(disposed)return;
     disposed=true;observer?.disconnect();
     canvas.removeEventListener('pointerdown',down);
     canvas.removeEventListener('pointermove',move);
     canvas.removeEventListener('pointerup',up);
     canvas.removeEventListener('pointercancel',up);
     canvas.removeEventListener('wheel',wheel);
     canvas.removeEventListener('webglcontextlost',contextLost);
     canvas.remove();
     for(const model of models.values()){
       model.rig.dispose();scene.remove(model.holder);
     }
     models.clear();scene.clear();
     renderer.dispose();renderer.forceContextLoss();
     host=null;
   }
 };
}
