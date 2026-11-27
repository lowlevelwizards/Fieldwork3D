/** CT14 deterministic isolated transport audition. Reuses production movement
 * proposals; intentionally not the full Session, AI, or mission simulator. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
import {proposeDragTrail,type DragTrail} from './breach-drag-trail.ts';
import {proposeAttachedCarry} from './breach-attached-carry.ts';
import {chooseTransportStep} from './breach-transport-recovery.ts';
import {loadedMotorSample} from './breach-transport-weight.ts';
import {makeTransportContact,transportContactDuration,type TransportContact} from './breach-transport-contact.ts';
import {readTransportPatientPose,type TransportPatientPose} from './breach-transport-patient-pose.ts';
export type LabScenario='idle'|'straight'|'corner'|'doorway';
export type LabSample={time:number;carrier:Pt;patient:Pt;heading:number;speed:number;stride:number;
 stage:'pickup'|'loaded'|'release'|'released';contact?:TransportContact;pose?:TransportPatientPose;blocked:number};
export type LabObstacle={x:number;y:number;w:number;h:number};
export function labObstacles(s:LabScenario):LabObstacle[]{
 return s==='corner'?[{x:10,y:12,w:40,h:42}]:s==='doorway'?
 [{x:18,y:-65,w:6,h:48},{x:18,y:17,w:6,h:48}]:[];
}
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function buildTransportLabTrack(mode:TransportMode,scenario:LabScenario):LabSample[]{
 const dt=1/60, pickup=transportContactDuration(mode,'pickup'), release=transportContactDuration(mode,'release');
 const route:Pt[]=scenario==='idle'?[]:scenario==='corner'?[{x:55,y:0},{x:55,y:65}]:[{x:75,y:0}];
 const obstacles=labObstacles(scenario);
 const clear=(radius:number)=>(a:Pt,b:Pt)=>{
  const n=Math.max(1,Math.ceil(d(a,b)/2));
  for(let i=0;i<=n;i++){
   const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;
   if(obstacles.some(o=>Math.hypot(x-Math.max(o.x,Math.min(x,o.x+o.w)),y-Math.max(o.y,Math.min(y,o.y+o.h)))<radius))return false;
  }
  return true;
 };
 let carrier:Pt={x:-25,y:0},patient:Pt={x:-47,y:0},heading=Math.PI,speed=0,stride=0,trail:DragTrail|undefined;
 let index=0,blocked=0;const samples:LabSample[]=[];
 const travelEnd=pickup+7;
 for(let i=0;i<=Math.ceil((travelEnd+release+1)*60);i++){
  const time=i*dt,stage=time<pickup?'pickup':time<travelEnd?'loaded':time<travelEnd+release?'release':'released';
  const contact=stage==='pickup'||stage==='release'?makeTransportContact(1,{id:'patient',p:patient,heading:Math.PI},mode,stage,time-(stage==='pickup'?0:travelEnd)):undefined;
  if(stage==='loaded'){
   const goal=route[index];let next={...carrier};
   if(goal){
    const gap=d(carrier,goal);
    if(gap<1){index++;speed=0;}else{
     const angle=Math.atan2(goal.y-carrier.y,goal.x-carrier.x);
     const turn=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));
     speed=loadedMotorSample(mode,53,53,speed,dt,turn).velocity;heading=angle;
     const amount=Math.min(gap,speed*dt);
     next={x:carrier.x+Math.cos(angle)*amount,y:carrier.y+Math.sin(angle)*amount};
    }
   }else speed=0;
   const pair=chooseTransportStep(carrier,next,to=>{
    if(mode==='drag')return proposeDragTrail('patient',patient,carrier,to,trail,clear(6.5));
    const point=proposeAttachedCarry(patient,carrier,to,heading,dt,clear(7));
    return point?{point,trail:undefined}:null;
   },clear(8));
   if(pair){stride+=d(carrier,pair.carrier);carrier=pair.carrier;patient=pair.body.point;trail=pair.body.trail;}
   else{blocked++;speed=0;}
  }else speed=0;
  const loaded=stage==='loaded'||stage==='release';
  const pose=loaded?readTransportPatientPose({id:'patient',p:patient,health:0,heading:Math.PI,carriedById:'carrier',transportMode:mode},
   [{id:'carrier',p:carrier,health:4,heading,carryingId:'patient',velocity:speed,stride,transportContact:contact}]):undefined;
  samples.push({time,carrier:{...carrier},patient:{...patient},heading,speed,stride,stage,contact,pose,blocked});
 }
 return samples;
}
