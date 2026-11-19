/** EQA3.16J — the Operator Lab's REAL civilian/hostile pose library.
 * This is a display-only fixture: it samples the exact same shared rigs,
 * physicality and poseOperator used in missions, without introducing any
 * autonomous orders, visibility, custody or firearm authority.
 * State is rebuilt from the selected four-second clock on EVERY sample.
 */
import * as THREE from 'three';
import {advanceFootsteps,createFootstepScheduler,
 type FootTarget,type FootstepInput} from './breach-footsteps.ts';
import {recordedFeet} from './breach-lab-tracks.ts';
import {createCivilian,type CivilianActor,type CivilianState}
 from './breach-civilian-types.ts';
import {civilianPose} from './breach-civilian-pose.ts';
import {civilianPhysicalityAt} from './breach-encounter-physicality.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig,
 type CivilianRig} from './breach-civilian-visuals.ts';
import {createOperatorRig,poseOperator,type OperatorRig}
 from './breach-operator-rig.ts';
import {hostilePhysicalityAt} from './breach-hostile-physicality.ts';

export type NpcLabPose={
 id:string;label:string;group:'CIVILIAN · ROUTINE'|'CIVILIAN · DANGER'|
  'CIVILIAN · CONTACT'|'CIVILIAN · INJURY'|'HOSTILE · ENCOUNTER';
 description:string;
};
/** Every civilianPose output has at least one explicit entry, plus the
 * EQA3.16 sensory/physical-contact variants that share those output poses.
 * Hostile previews map existing AI alert/weapon states (not new AI brains).
 */
export const NPC_LAB_POSES:readonly NpcLabPose[]=[
 {id:'civ-idle',label:'CALM · IDLE',group:'CIVILIAN · ROUTINE',description:'Unarmed neutral idle'},
 {id:'civ-work',label:'WORK / INSPECT',group:'CIVILIAN · ROUTINE',description:'Everyday work gestures'},
 {id:'civ-seated',label:'SEATED',group:'CIVILIAN · ROUTINE',description:'Seated activity and folded legs'},
 {id:'civ-walk',label:'WALK',group:'CIVILIAN · ROUTINE',description:'Natural civilian gait'},
 {id:'civ-attentive',label:'ATTENTIVE',group:'CIVILIAN · ROUTINE',description:'Stops activity, attentive posture'},
 {id:'civ-heard',label:'HEARD NOISE / GLANCE',group:'CIVILIAN · DANGER',description:'Recent personal acoustic estimate'},
 {id:'civ-sighted',label:'VISIBLE THREAT / GAZE',group:'CIVILIAN · DANGER',description:'Recognized visible threat, bounded head turn'},
 {id:'civ-flinch',label:'GUNFIRE / FLINCH',group:'CIVILIAN · DANGER',description:'Timed recoil and protective arms'},
 {id:'civ-startled',label:'STARTLED / HANDS UP',group:'CIVILIAN · DANGER',description:'Raised hands after a perceived danger'},
 {id:'civ-frozen',label:'FROZEN / GUARD',group:'CIVILIAN · DANGER',description:'Defensive crouch distinct from hiding'},
 {id:'civ-hiding',label:'HIDING / SETTLING',group:'CIVILIAN · DANGER',description:'Settled lower refuge pose'},
 {id:'civ-hide-walk',label:'MOVING TO REFUGE',group:'CIVILIAN · DANGER',description:'Walking before reaching hiding posture'},
 {id:'civ-flee',label:'FLEEING / HEAD COVER',group:'CIVILIAN · DANGER',description:'Full leg run with guarded head'},
 {id:'civ-flee-blocked',label:'FLEE BLOCKED / ALARM',group:'CIVILIAN · DANGER',description:'Fleeing state at zero speed remains alarmed'},
 {id:'civ-secure',label:'SECURE / CONTACT',group:'CIVILIAN · CONTACT',description:'Brief gaze after a genuine physical SECURE'},
 {id:'civ-compliant',label:'COMPLIANT / KNEEL',group:'CIVILIAN · CONTACT',description:'Hands up to compliant kneel'},
 {id:'civ-restrained',label:'RESTRAINED / HANDS BACK',group:'CIVILIAN · CONTACT',description:'Actual restraint, never merely SECURE'},
 {id:'civ-follow',label:'FOLLOW / HANDOFF',group:'CIVILIAN · CONTACT',description:'Physical FOLLOW contact and first escort steps'},
 {id:'civ-escorted',label:'ESCORTED / WALK',group:'CIVILIAN · CONTACT',description:'Normal escort gait'},
 {id:'civ-injured',label:'INJURED / GUARD',group:'CIVILIAN · INJURY',description:'Wounded, protective stationary posture'},
 {id:'civ-injured-walk',label:'INJURED / WALK',group:'CIVILIAN · INJURY',description:'Wounded ambulatory gait'},
 {id:'civ-carried',label:'CARRIED',group:'CIVILIAN · INJURY',description:'Physical carry mode; transport-only silhouette'},
 {id:'civ-dragged',label:'DRAGGED',group:'CIVILIAN · INJURY',description:'Physical drag mode; transport-only silhouette'},
 {id:'civ-down',label:'INCAPACITATED / DOWN',group:'CIVILIAN · INJURY',description:'Actual incapacitation'},
 {id:'host-idle',label:'IDLE / WATCH',group:'HOSTILE · ENCOUNTER',description:'Existing armed idle body pose'},
 {id:'host-heard',label:'HEARD / INVESTIGATE',group:'HOSTILE · ENCOUNTER',description:'Acoustic head turn from personal evidence'},
 {id:'host-suspicious',label:'SUSPICIOUS / LOOK',group:'HOSTILE · ENCOUNTER',description:'Existing suspicion state and hearing'},
 {id:'host-aim',label:'FIRST CONTACT / AIM',group:'HOSTILE · ENCOUNTER',description:'Weapon handling owns the contact pose'},
 {id:'host-fire',label:'ENGAGE / RECOIL',group:'HOSTILE · ENCOUNTER',description:'Firing and recoil with no decorative head override'},
 {id:'host-cover',label:'TAKING COVER',group:'HOSTILE · ENCOUNTER',description:'Existing defensive posture'},
 {id:'host-suppressed',label:'SUPPRESSED / GUARD',group:'HOSTILE · ENCOUNTER',description:'Bounded protective head inclination'},
 {id:'host-retreat',label:'WITHDRAW / MOVE',group:'HOSTILE · ENCOUNTER',description:'Existing retreat gait'},
 {id:'host-lookback',label:'WITHDRAW / LOOK BACK',group:'HOSTILE · ENCOUNTER',description:'Retreat head glance to recent personally heard sound'},
 {id:'host-reload',label:'RELOADING',group:'HOSTILE · ENCOUNTER',description:'Weapon reload outranks decorative attention'},
 {id:'host-surrender',label:'SURRENDER',group:'HOSTILE · ENCOUNTER',description:'Existing weapon and surrender handling'},
 {id:'host-down',label:'INCAPACITATED',group:'HOSTILE · ENCOUNTER',description:'Existing down pose'}
] as const;
export const NPC_LAB_DURATION=4;
export function npcLabPose(id:string):NpcLabPose|undefined{
 return NPC_LAB_POSES.find(p=>p.id===id);
}
export function isNpcLabPose(id:string):boolean{return !!npcLabPose(id);}
const bound=(n:number)=>Math.max(0,Math.min(NPC_LAB_DURATION,
 Number.isFinite(n)?n:0));
const delayed=(now:number)=>Math.max(0,now-.8);
// A moving preview must advance at the same world-units/second as its
// recorded motor velocity. The previous *.28 visual travel moved the root
// slower than the footsteps, leaving both knees/boots ahead of the hips.
// The preview stage is camera-locked below, not the authoritative gait.
const gait=(now:number,speed:number)=>
 speed>5?Math.max(0,now)*speed:0;

export function sampleNpcCivilian(id:string,clock:number):CivilianActor{
 if(!npcLabPose(id)||!id.startsWith('civ-'))
  throw Error('Not a supported civilian Lab pose: '+id);
 const now=bound(clock);
 const c=createCivilian({id:'lab-npc-civilian',role:'visitor',persona:'steady',
  activity:'idle',position:{x:0,y:0},heading:0,
  roomId:'lab',appearanceSeed:44});
 c.stateSince=.8;
 const set=(state:CivilianState,velocity=0)=>{
  c.state=state;c.velocity=velocity;
  // Reactive tracks begin after .8 seconds, not during quiet idle.
  c.p.x=gait(state==='routine'||state==='escorted'?now:delayed(now),
   velocity);
  c.priorP={...c.p};
 };
 const audio=()=>{
  c.lastEvidenceAt=.9;c.lastEvidenceId='audio/271';
  c.threatEstimate={x:50,y:65};
 };
 const sight=()=>{
  c.lastEvidenceAt=.9;c.lastEvidenceId='visual/red/room/1';
  c.threatEstimate={x:65,y:70};
 };
 const contact=()=>{
  c.lastContactAt=.85;c.lastContactPoint={x:16,y:50};
 };
 switch(id){
 case 'civ-work':c.activity='working';break;
 case 'civ-seated':c.activity='seated';break;
 case 'civ-walk':set('routine',26);break;
 case 'civ-attentive':set('attentive');break;
 case 'civ-heard':set('attentive');audio();break;
 case 'civ-sighted':set('attentive');sight();break;
 case 'civ-flinch':set('startled');sight();c.lastFlinchAt=1;break;
 case 'civ-startled':set('startled');sight();break;
 case 'civ-frozen':set('frozen');audio();break;
 case 'civ-hiding':set('hiding');audio();break;
 case 'civ-hide-walk':set('hiding',26);audio();break;
 case 'civ-flee':set('fleeing',66);sight();break;
 case 'civ-flee-blocked':set('fleeing');sight();break;
 case 'civ-secure':set('compliant');contact();break;
 case 'civ-compliant':set('compliant');break;
 case 'civ-restrained':set('compliant');c.restrained=true;contact();break;
 case 'civ-follow':set('escorted',20);contact();break;
 case 'civ-escorted':set('escorted',26);break;
 case 'civ-injured':set('wounded');c.health=1;c.injuryStage=1;break;
 case 'civ-injured-walk':
  set('escorted',20);c.health=1;c.injuryStage=1;break;
 case 'civ-carried':
  set('incapacitated');c.health=0;c.injuryStage=3;
  c.carriedById='lab-operator';c.transportMode='carry';break;
 case 'civ-dragged':
  set('incapacitated');c.health=0;c.injuryStage=3;
  c.carriedById='lab-operator';c.transportMode='drag';break;
 case 'civ-down':set('incapacitated');c.health=0;c.injuryStage=3;break;
 }
 if(now<.8&&id!=='civ-idle'&&id!=='civ-work'&&id!=='civ-seated'&&
   id!=='civ-walk'&&id!=='civ-escorted'&&id!=='civ-injured-walk'){
  // Start with the actual pre-event baseline. Nothing visually happens
  // before the authored sensory/contact/state-change timestamp.
  c.state='routine';c.stateSince=0;c.velocity=0;c.health=2;
  c.injuryStage=0;c.restrained=false;c.carriedById=null;
  c.transportMode=null;c.lastEvidenceAt=-1;c.threatEstimate=null;
  c.lastContactAt=-100;c.lastContactPoint=null;c.lastFlinchAt=-100;
 }
 return c;
}

export type NpcHostileSample={
 pose:Parameters<typeof poseOperator>[1];
 physical:ReturnType<typeof hostilePhysicalityAt>;
};
export function sampleNpcHostile(id:string,clock:number):NpcHostileSample{
 if(!npcLabPose(id)||!id.startsWith('host-'))
  throw Error('Not a supported hostile Lab pose: '+id);
 const now=bound(clock),started=now>=.8;
 let alert:'idle'|'suspicious'|'investigating'|'engaging'|'cover'|'retreat'='idle';
 let suppression=0,aim=0,velocity=0,reload=0;
 let surrendered=false,down=false,firing=false;
 switch(id){
 case 'host-heard':alert='investigating';break;
 case 'host-suspicious':alert='suspicious';break;
 case 'host-aim':alert='engaging';aim=.95;break;
 case 'host-fire':alert='engaging';aim=.95;firing=true;break;
 case 'host-cover':alert='cover';break;
 case 'host-suppressed':alert='cover';suppression=.9;break;
 case 'host-retreat':alert='retreat';velocity=22;break;
 case 'host-lookback':alert='retreat';velocity=22;suppression=.75;break;
 case 'host-reload':alert='cover';reload=1.15;break;
 case 'host-surrender':alert='engaging';surrendered=true;break;
 case 'host-down':down=true;alert='engaging';break;
 }
 if(!started){alert='idle';suppression=0;aim=0;velocity=0;reload=0;
  surrendered=false;down=false;firing=false;}
 const p={x:gait(delayed(now),velocity),y:0};
 const heard=id==='host-heard'||id==='host-suspicious'||id==='host-lookback';
 const actor={
  side:'red' as const,p,heading:0,health:down?0:2,
  surrendered,alert,aim,velocity,reload,suppression,
  lastNoiseAt:started&&heard?0.9:-100,
  heard:started&&heard?{x:60,y:70}:null,contact:null
 };
 const physical=hostilePhysicalityAt(actor,now);
 const pose:Parameters<typeof poseOperator>[1]={
  x:p.x,z:0,heading:0,velocity,
  seconds:now,stride:now*velocity*.25,posture:'stand',
  injury:down?3:0,weapon:'carbine',
  reload,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
  down,surrender:surrendered,aiming:aim>.2,firing,
  turning:0,deterministic:true,aimBlend:aim,
  recoil:firing?.45:0,poseDiagnostics:false,
  downProgress:down||surrendered?
   Math.min(1,Math.max(0,(now-.8)/.55)):0
 };
 return {pose,physical};
}

/** Lazily owns one real neutral and one real hostile model. No clone or
 * alternate animation engine. Mounts only when the NPC tab is active,
 * and disposes both when leaving (important on iOS/WebGL).
 */
/** Fixed-tick contacts for one selected track, not a mutating replay clock.
 * Switching tracks, reverse seek and frame stepping reconstruct valid feet.
 */
export class NpcLabFootFilm{
 readonly id:string;
 readonly frames:[FootTarget,FootTarget][]=[];
 constructor(id:string){
  this.id=id;
  const scheduler=createFootstepScheduler();
  for(let tick=0;tick<=NPC_LAB_DURATION*60;tick++){
   const time=tick/60;
   let p:{x:number;y:number},heading:number,speed:number,
     down:boolean,posture:'stand'|'crouch',gait:'run'|'walk';
   if(id.startsWith('civ-')){
    const c=sampleNpcCivilian(id,time);
    const physical=civilianPhysicalityAt(c,time);
    p=c.p;heading=c.heading;
    speed=physical.pose==='walk'||physical.pose==='run'||
      physical.pose==='injured-walk'?c.velocity:0;
    down=physical.pose==='down'||physical.pose==='dragged'||
      physical.pose==='carried';
    posture=physical.pose==='hide'||physical.pose==='seated'?
      'crouch':'stand';
    gait=physical.pose==='run'?'run':'walk';
   }else{
    const pose=sampleNpcHostile(id,time).pose;
    p={x:pose.x,y:pose.z};heading=pose.heading;
    speed=pose.velocity;down=pose.down;
    posture=pose.posture;gait='walk';
   }
   const input:FootstepInput={time,position:p,rootYaw:-heading,
    travelYaw:heading,facingYaw:heading,speed,turning:0,
    posture,injury:0,down,gait};
   const feet=advanceFootsteps(scheduler,input);
   this.frames.push(feet.map(foot=>({...foot,
    position:{...foot.position}})) as [FootTarget,FootTarget]);
  }
 }
 sample(now:number):[FootTarget,FootTarget]{
  return recordedFeet(this.frames,bound(now));
 }
}
export class NpcLabPreview{
 private civilian:CivilianRig|null=null;
 private hostile:OperatorRig|null=null;
 private civilianDisplay:THREE.Group|null=null;
 private hostileDisplay:THREE.Group|null=null;
 private film:NpcLabFootFilm|null=null;
 private readonly scene:THREE.Scene;
 constructor(scene:THREE.Scene){this.scene=scene;}
 render(id:string,clock:number):{label:string;pose:string;headYaw:number;
  headPitch:number;model:'civilian'|'hostile'}{
  const chosen=npcLabPose(id);
  if(!chosen)throw Error('Unsupported NPC animation '+id);
  if(this.film?.id!==id)this.film=new NpcLabFootFilm(id);
  const feet=this.film.sample(clock);
  if(id.startsWith('civ-')){
   if(!this.civilian){
    const initial=sampleNpcCivilian('civ-idle',0);
    this.civilian=createCivilianRig(initial,true);
    // Keep the long, physically correct world-space gait visible in a
    // stationary lab camera without slowing the motor or moving footfalls.
    this.civilianDisplay=new THREE.Group();
    this.civilianDisplay.add(this.civilian.root);
    this.scene.add(this.civilianDisplay);
   }
   const c=sampleNpcCivilian(id,clock);
   updateCivilianRig(this.civilian,c,bound(clock),feet);
   this.civilianDisplay!.position.set(-c.p.x,0,-c.p.y);
   this.civilian.root.visible=true;
   if(this.hostile)this.hostile.root.visible=false;
   const physical=civilianPhysicalityAt(c,bound(clock));
   const head='character' in this.civilian?
     this.civilian.character.head:null;
   return {label:chosen.label,pose:civilianPose(c),
    headYaw:head?.rotation.y??physical.headYaw,
    headPitch:head?.rotation.x??0,model:'civilian'};
  }
  if(!this.hostile){
   this.hostile=createOperatorRig('lab-npc-hostile','red',true);
   this.hostileDisplay=new THREE.Group();
   this.hostileDisplay.add(this.hostile.root);
   this.scene.add(this.hostileDisplay);
  }
  const state=sampleNpcHostile(id,clock);
  // The same single-rig blend used for civilians also covers hostile
  // reaction-track switching. A rewind of the same track remains exact.
  poseOperator(this.hostile,{...state.pose,replayFeet:feet,
   npcTransitionKey:'hostile/'+id+'/'+
     (state.pose.surrender?'surrender':
       state.pose.down?'down':
       state.pose.reload>0?'reload':
       state.pose.aiming?'aim':state.pose.firing?'fire':'hold'),
   npcTransitionDuration:state.pose.down?.15:
     state.pose.surrender?.20:.25},0);
  this.hostileDisplay!.position.set(-state.pose.x,0,-state.pose.z);
  this.hostile.head.rotation.y+=state.physical.headYaw;
  this.hostile.head.rotation.x+=state.physical.headPitch;
  this.hostile.root.visible=true;
  if(this.civilian)this.civilian.root.visible=false;
  return {label:chosen.label,pose:id.slice(5),
   headYaw:this.hostile.head.rotation.y,
   headPitch:this.hostile.head.rotation.x,model:'hostile'};
 }
 dispose(){
  if(this.civilian){
   if(this.civilianDisplay)this.scene.remove(this.civilianDisplay);
   disposeCivilianRig(this.civilian);this.civilian=null;
   this.civilianDisplay=null;
  }
  if(this.hostile){
   if(this.hostileDisplay)this.scene.remove(this.hostileDisplay);
   this.hostile.dispose();this.hostile=null;
   this.hostileDisplay=null;
  }
  this.film=null;
 }
}
