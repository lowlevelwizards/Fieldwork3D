/** After Action V4-3 — one retained, read-only historical model presentation.
 * This is NOT a second pose system: both live play and debrief use the same
 * createOperatorRig/poseOperator pipeline and recorded visual identity.
 * One renderer and one rig per identity; nothing renders on an idle frame.
 */
import * as THREE from 'three';
import {createOperatorRig,poseOperator,type OperatorRig}
 from '../breach-operator-rig.ts';
import type * as THREEType from 'three';
import type {ReplayActorIdentity} from '../breach-replay-manifest.ts';
import type {ForensicEvidence} from '../breach-forensic-evidence.ts';
import {createForensicModelOverlay,type ForensicModelOverlay}
 from './breach-after-action-anatomy-overlay.ts';

export type AfterActionModelPresenter={
 show:(host:HTMLElement,operatorId:string|null)=>void;
 setOperatorTapHandler:(handler:((id:string)=>void)|null)=>void;
 setEvidence:(evidence:ForensicEvidence|null)=>void;
 hide:()=>void;
 dispose:()=>void;
};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
// One and a half of the former 0.12 zoom-in button steps, for the
// full debrief lineup only. Individual inspection keeps its prior framing.
const DEFAULT_SQUAD_ZOOM=.82;
type Model={rig:OperatorRig|null;holder:THREE.Group;overlay:ForensicModelOverlay|null};
const pose=(rig:OperatorRig,actor:ReplayActorIdentity)=>{
 poseOperator(rig,{
   x:0,z:0,heading:-Math.PI/2,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:actor.weapon,
   weaponConfiguration:actor.weaponConfiguration,
   equipment:actor.equipment,wardrobe:actor.wardrobe,
   appearanceSeed:actor.appearanceSeed,
   reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,
   handlingOverride:'low',aimBlend:0,
   poseDiagnostics:false,deterministic:true
 },0);
};
export function createAfterActionModelPresenter(
 identities:readonly ReplayActorIdentity[],onUnavailable?:()=>void,
 liveSnapshots?:ReadonlyMap<string,THREEType.Group>
):AfterActionModelPresenter|null{
 if(!identities.some(actor=>actor.side==='blue'))return null;
 let renderer:THREE.WebGLRenderer;
 const compact=typeof window!=='undefined'&&window.innerWidth<=700;
 try{
   renderer=new THREE.WebGLRenderer({alpha:false,antialias:!compact,
     powerPreference:'low-power',preserveDrawingBuffer:false});
 }catch(error){
   console.warn('[After Action 3D] WebGL context unavailable',error);
   return null;
 }
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
 canvas.style.touchAction='pan-y';
 canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label',
   'Historical 3D operators. Tap to inspect a record; drag to rotate; scroll to zoom.');
 const roster=identities.filter(a=>a.side==='blue');
 const byId=new Map(identities.map(actor=>[actor.id,actor]));
 const models=new Map<string,Model>();
 // During a live terminal transition, all already-built friendly geometry is
 // available on the first paint. The tactical renderer keeps the original
 // rigs; these independent scene-graph clones share immutable GPU assets.
 for(const actor of roster){
   const snapshot=liveSnapshots?.get(actor.id);
   if(!snapshot)continue;
   const holder=new THREE.Group();holder.add(snapshot);scene.add(holder);
   models.set(actor.id,{rig:null,holder,overlay:null});
 }
 // Historical/replay-only visits still build lazily. Forensic inspection
 // upgrades just the inspected clone to the actual instrumented rig.
 const needsBuild=(id:string)=>!models.has(id)||
   (selected===id&&forensicEvidence!==null&&!models.get(id)?.rig);
 const build=(actor:ReplayActorIdentity)=>{
   const existing=models.get(actor.id);
   if(existing&&!needsBuild(actor.id))return existing;
   const rig=createOperatorRig(actor.id,actor.side);
   try{pose(rig,actor);}
   catch(error){rig.dispose();throw error;}
   const overlay=createForensicModelOverlay(rig);
   const holder=new THREE.Group();holder.add(rig.root);scene.add(holder);
   const entry:Model={rig,holder,overlay};
   if(existing)scene.remove(existing.holder);
   models.set(actor.id,entry);return entry;
 };
 // Rigs are expensive to construct and pose on mobile. Never block the
 // debrief mount by building an entire roster synchronously.
 let disposed=false,lost=false,host:HTMLElement|null=null;
 let selected:string|null=null,dragId:number|null=null,lastX=0,lastY=0;
 let downX=0,downY=0,dragged=false;
 let dragTarget:string|null=null;
 let operatorTapHandler:((id:string)=>void)|null=null;
 let forensicEvidence:ForensicEvidence|null=null;
 let pitch=.16,zoom=DEFAULT_SQUAD_ZOOM;
 const individualYaw=new Map<string,number>();
 const lookAt=new THREE.Vector3(0,28,0);
 const loading=document.createElement('div');
 loading.className='fw-v6-model-loading';
 loading.setAttribute('role','status');
 const pending:string[]=[];
 let buildTimer:number|null=null,frameRequest:number|null=null;
 let lastWidth=0,lastHeight=0;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,
   compact?1:1.25));
 const syncLoading=()=>{
   if(!host)return;
   const remaining=selected?Number(needsBuild(selected)):
     roster.filter(actor=>needsBuild(actor.id)).length;
   if(!remaining){loading.remove();return;}
   loading.textContent=selected?'PREPARING RECORDED MODEL':
     'PREPARING SQUAD · '+models.size+' / '+roster.length;
   if(loading.parentElement!==host)host.append(loading);
 };
 const buildQueued=()=>{
   if(disposed||lost||buildTimer!==null||!host||!pending.length)return;
   // Yield between rigs. A single rig may be expensive, but an entire
   // roster must never be built in one event-loop task.
   buildTimer=window.setTimeout(()=>{
     buildTimer=null;
     if(disposed||lost||!host)return;
     const id=pending.shift(),actor=id?byId.get(id):undefined;
     if(actor&&needsBuild(actor.id)){
       try{build(actor);}
       catch(error){
         console.warn('[After Action 3D] Historical rig could not build',
           actor.id,error);
         onUnavailable?.();return;
       }
     }
     syncLoading();draw();buildQueued();
   },24);
 };
 const queueModels=(operatorId:string|null)=>{
   const requested=operatorId?[operatorId]:roster.map(actor=>actor.id);
   for(const id of requested){
     if(!needsBuild(id)||pending.includes(id))continue;
     if(operatorId)pending.unshift(id);
     else pending.push(id);
   }
   if(operatorId){
     const index=pending.indexOf(operatorId);
     if(index>0){pending.splice(index,1);pending.unshift(operatorId);}
   }
   syncLoading();buildQueued();
 };
 const focus=()=>{
   // Drawing cannot synchronously construct a rig: this is a critical
   // responsiveness boundary on mobile.
   if(selected&&!models.has(selected))return false;
   const squad=!selected;
   const n=roster.length;
   const spacing=n>5?30:34;
   const base=squad?Math.max(158,88+n*17):100;
   lookAt.set(0,28,0);
   const dist=base*zoom;
   // The camera does not spin the entire lineup as a single rigid object.
   camera.position.set(0,lookAt.y+Math.sin(pitch)*dist,
     -Math.cos(pitch)*dist);
   camera.lookAt(lookAt);
   for(const [id,model] of models){
     const i=roster.findIndex(a=>a.id===id);
     model.holder.visible=squad?i>=0:id===selected;
     model.holder.position.set(squad?(i-(n-1)/2)*spacing:0,0,0);
     // Each canonical -Z-facing actor turns toward its own camera bearing.
     const dx=camera.position.x-model.holder.position.x;
     const dz=camera.position.z-model.holder.position.z;
     model.holder.rotation.y=Math.atan2(-dx,-dz)+(individualYaw.get(id)??0);
     // A cloned live pose has no instrumented forensic sockets; the actual
     // rig is lazily installed when a Combat inspector needs an overlay.
     model.overlay?.update(!squad&&id===selected?forensicEvidence:null);
   }
   return true;
 };
 const drawNow=()=>{
   if(disposed||lost||!host||!host.isConnected)return;
   const bounds=host.getBoundingClientRect();
   const width=Math.floor(bounds.width),height=Math.floor(bounds.height);
   if(width<16||height<16)return;
   if(width!==lastWidth||height!==lastHeight){
     renderer.setSize(width,height,false);
     camera.aspect=width/height;
     camera.updateProjectionMatrix();
     lastWidth=width;lastHeight=height;
   }
   if(focus())renderer.render(scene,camera);
 };
 const draw=()=>{
   if(disposed||lost||!host||frameRequest!==null)return;
   // Coalesce pointer moves, selection changes and resize notifications.
   frameRequest=window.requestAnimationFrame(()=>{
     frameRequest=null;drawNow();
   });
 };
 const observer=typeof ResizeObserver==='undefined'?null:
   new ResizeObserver(()=>draw());
 const down=(event:PointerEvent)=>{
   if(dragId!==null||lost)return;
   dragId=event.pointerId;
   lastX=downX=event.clientX;lastY=downY=event.clientY;
   dragged=false;
   // Project each visible actor's body into the canvas; tapping empty stage
   // space must not unexpectedly select the closest squad member.
   const rect=canvas.getBoundingClientRect();
   const pointerX=(event.clientX-rect.left)/Math.max(1,rect.width)*2-1;
   const pointerY=1-(event.clientY-rect.top)/Math.max(1,rect.height)*2;
   let nearest=Infinity;dragTarget=null;
   for(const [id,model] of models){
     if(!model.holder.visible)continue;
     const center=model.holder.getWorldPosition(new THREE.Vector3());
     const foot=center.clone().project(camera);
     const head=center.clone();head.y+=60;head.project(camera);
     center.y+=26;center.project(camera);
     const delta=Math.abs(center.x-pointerX);
     const insideBody=pointerY>=Math.min(head.y,foot.y)-.12&&
       pointerY<=Math.max(head.y,foot.y)+.12;
     if(insideBody&&delta<.26&&delta<nearest){
       nearest=delta;dragTarget=id;
     }
   }
   // Rotation still works with a selected model even outside the body hit
   // region; only a short tap actually over the actor opens navigation.
   if(selected&&!dragTarget)dragTarget=selected;
   canvas.setPointerCapture(event.pointerId);
 };
 const move=(event:PointerEvent)=>{
   if(event.pointerId!==dragId)return;
   if(!dragged&&Math.hypot(event.clientX-downX,event.clientY-downY)<8)
     return;
   dragged=true;
   if(dragTarget)individualYaw.set(dragTarget,
     (individualYaw.get(dragTarget)??0)+(event.clientX-lastX)*.012);
   if(selected)pitch=clamp(pitch+(event.clientY-lastY)*.008,-.55,.85);
   lastX=event.clientX;lastY=event.clientY;
   draw();
 };
 const up=(event:PointerEvent)=>{
   if(event.pointerId!==dragId)return;
   const tapped=!dragged&&
     Math.hypot(event.clientX-downX,event.clientY-downY)<8?
       dragTarget:null;
   dragId=null;dragTarget=null;dragged=false;
   if(canvas.hasPointerCapture(event.pointerId))
     canvas.releasePointerCapture(event.pointerId);
   if(tapped)operatorTapHandler?.(tapped);
 };
 const cancel=(event:PointerEvent)=>{
   if(event.pointerId!==dragId)return;
   dragId=null;dragTarget=null;dragged=false;
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
   onUnavailable?.();
 };
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',cancel);
 canvas.addEventListener('wheel',wheel,{passive:false});
 canvas.addEventListener('webglcontextlost',contextLost);
 return {
   show(nextHost,operatorId){
     if(disposed)return;
     if(lost){
       nextHost.textContent='3D VIEW UNAVAILABLE · HISTORICAL RECORD REMAINS AVAILABLE';
       return;
     }
     if(operatorId!==null&&!byId.has(operatorId)){
       observer?.disconnect();
       canvas.remove();host=null;
       nextHost.textContent='NO RECORDED MODEL FOR THIS CONTACT';
       return;
     }
     if(selected!==operatorId){
       pitch=.16;
       zoom=operatorId===null?DEFAULT_SQUAD_ZOOM:1;
     }
     selected=operatorId;
     canvas.setAttribute('aria-label',operatorId===null?
       'Tap an operator for their full record, or drag to rotate':
       'Tap the selected operator to return to squad, or drag to rotate');
     if(host!==nextHost){
       observer?.disconnect();
       host=nextHost;
       host.replaceChildren(canvas);
       observer?.observe(host);
     }
     queueModels(operatorId);
     draw();
   },
   setOperatorTapHandler(handler){
     operatorTapHandler=handler;
   },
   setEvidence(evidence){
     forensicEvidence=evidence;
   },
   hide(){
     forensicEvidence=null;
     observer?.disconnect();
     canvas.remove();
     host=null;dragId=null;dragTarget=null;dragged=false;
   },
   dispose(){
     if(disposed)return;
     disposed=true;observer?.disconnect();
     if(buildTimer!==null)window.clearTimeout(buildTimer);
     if(frameRequest!==null)window.cancelAnimationFrame(frameRequest);
     pending.length=0;loading.remove();operatorTapHandler=null;
     canvas.removeEventListener('pointerdown',down);
     canvas.removeEventListener('pointermove',move);
     canvas.removeEventListener('pointerup',up);
     canvas.removeEventListener('pointercancel',cancel);
     canvas.removeEventListener('wheel',wheel);
     canvas.removeEventListener('webglcontextlost',contextLost);
     canvas.remove();
     for(const model of models.values()){
       model.rig?.dispose();scene.remove(model.holder);
     }
     models.clear();scene.clear();
     renderer.dispose();renderer.forceContextLoss();
     host=null;
   }
 };
}
