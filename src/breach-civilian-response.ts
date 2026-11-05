/** E5-B4: individual, evidence-driven civilian reactions.
 * Reads only an actor's physically audible events and geometrically
 * confirmed visual contacts. Never consults enemy AI intent/omniscient
 * player positions to choose a refuge. Does not change the pause state. */
import type {Pt,Door,Segment} from './breach-core.ts';
import type {WindowState} from './breach-windows.ts';
import {setCivilianState,civilianCondition,type CivilianActor,type CivilianState} from './breach-civilian-types.ts';
import type {AcousticEvent} from './breach-sound-evidence.ts';
import {interpretSound,soundResponse} from './breach-sound-evidence.ts';
import {advanceSight,visualGain,confirmedSight}
 from './breach-visual-perception.ts';
import {chooseCivilianRefuge} from './breach-civilian-refuge.ts';

type ArmedPerson={id:string;p:Pt;heading:number;health:number;
 velocity:number;posture:'stand'|'crouch';side:'blue'|'red';
 lastShotAt?:number;};
export type CivilianSensoryWorld={
 noise:readonly AcousticEvent[];
 people:readonly ArmedPerson[];
 doors:readonly Door[];walls:readonly Segment[];windows:readonly WindowState[];
 canSee:(from:Pt,to:Pt)=>boolean;
 canReach:(from:Pt,to:Pt)=>boolean;
 routeTo?:(from:Pt,to:Pt)=>Pt[];
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const offAxis=(from:number,to:number)=>
 Math.atan2(Math.sin(to-from),Math.cos(to-from));
function setState(c:CivilianActor,state:CivilianState,now:number){
 setCivilianState(c,state,now);
}
function addEvidence(c:CivilianActor,id:string,at:number,
  kind:'orient'|'investigate'|'alarm'|'visual',
  point:Pt,estimateReliable:boolean){
 if(c.lastEvidenceId===id)return;
 c.lastEvidenceId=id;c.lastEvidenceAt=at;
 const strength=kind==='visual'?.78:
  kind==='alarm'?.72:kind==='investigate'?.31:.15;
 c.fear=Math.min(1,Math.max(c.fear,strength)+
   (kind==='orient'?.025:kind==='investigate'?.055:.09));
 // The estimate is observer-derived for audio, observed for confirmed sight.
 // This field is never exposed to the player's current-fog display.
 if(kind!=='orient'||estimateReliable)c.threatEstimate={...point};
}
export function stepCivilianResponse(c:CivilianActor,now:number,dt:number,
  world:CivilianSensoryWorld):void{
 if(civilianCondition(c)!=='healthy')return;
 // Use a low-frequency observer tick; actor movement still runs at 60 Hz.
 if(now-c.lastSenseAt<.12)return;
 const elapsed=Math.max(.12,dt,now-c.lastSenseAt);
 c.lastSenseAt=now;
 if(c.lastEvidenceAt>=0&&now-c.lastEvidenceAt>2)
  c.fear=Math.max(0,c.fear-elapsed*.020);
 for(const noise of world.noise){
  const id=noise.id??Math.round(noise.time*1000);
  if(id<=c.lastNoiseId)continue;
  c.lastNoiseId=id;
  const heard=interpretSound(noise,c.id,c.p,
    world.doors,world.walls,world.windows);
  if(!heard)continue;
  const response=soundResponse(heard.kind,heard.intensity);
  if(response==='ignore')continue;
  addEvidence(c,'audio/'+id,heard.at,response==='alarm'?'alarm':
    response==='investigate'?'investigate':'orient',
    heard.estimate,false);
 }
 // Being armed alone does not mark a resident guard dangerous. A red
 // actor creates a *visual* alarm only when the observer has line of sight
 // to that actor's RECENT real shot; distant/unseen firing is audio only.
 let sighted:string|null=null;
 for(const person of world.people){
  if(person.health<=0)continue;
  const recentHostileShot=person.side==='red'&&
    person.lastShotAt!==undefined&&person.lastShotAt>=0&&
    now>=person.lastShotAt&&now-person.lastShotAt<=1.2;
  if(person.side==='red'&&!recentHostileShot){
    c.visualProgress[person.id]=0;continue;
  }
  const range=dist(c.p,person.p);
  if(range>175) {c.visualProgress[person.id]=0;continue;}
  const yaw=Math.atan2(person.p.y-c.p.y,person.p.x-c.p.x);
  const delta=offAxis(c.heading,yaw);
  const geometric=Math.abs(delta)<.96&&world.canSee(c.p,person.p);
  const gain=geometric?visualGain(range,delta,person.velocity>10,
    person.posture==='crouch'):0;
  c.visualProgress[person.id]=advanceSight(
    c.visualProgress[person.id]??0,elapsed,gain,geometric);
  if(confirmedSight(c.visualProgress[person.id])){
    sighted=person.id;
    if(c.lastVisualId!==person.id)
      addEvidence(c,'visual/'+person.id+'/'+Math.floor(now*60),
        now,'visual',person.p,true);
    else {
      // Sustained REAL sight prevents falsely calming in front of the squad,
      // without stacking a new event each 60 Hz frame.
      c.fear=Math.max(c.fear,.72);
      c.lastEvidenceAt=now;
      c.threatEstimate={...person.p};
    }
    break;
  }
 }
 c.lastVisualId=sighted;
 if(c.state==='compliant'||c.state==='escorted')return;
 if(c.state==='routine'&&c.fear>=.12)setState(c,'attentive',now);
 if((c.state==='routine'||c.state==='attentive')&&c.fear>=.49)
   setState(c,'startled',now);
 if(c.state==='startled'){
  const delay=c.persona==='startled'?.35:
    c.persona==='cautious'?.60:.80;
  if(now-c.stateSince>=delay){
   const safe=chooseCivilianRefuge(c,world);
   if(safe&&c.persona!=='startled'){
    c.goal={...safe.goal};c.nav=safe.path.map(p=>({...p}));
    c.dwellUntil=now;setState(c,'fleeing',now);
   }else{
    c.goal=null;c.nav=[];setState(c,'frozen',now);
   }
  }
 }
 if(c.fear<.10&&c.lastEvidenceAt>=0&&
    now-c.lastEvidenceAt>8&&
    ['attentive','frozen','hiding'].includes(c.state)){
    c.goal=null;c.dwellUntil=now+1;
    setState(c,'routine',now);
 }
}
