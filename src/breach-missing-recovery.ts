/** OC9: Persistent MIA recovery shares the real rescue casualty
 * transport system. No alternate movement, extraction or instant credit.
 */
import type {Session} from './breach-game.ts';
import {createCivilian} from './breach-civilian-types.ts';
import {civilianRefugePoints} from './breach-civilian-refuge.ts';

const near=(a:{x:number;y:number},b:{x:number;y:number},r:number)=>
 Math.hypot(a.x-b.x,a.y-b.y)<=r;
export type MissingPersonRecovery={operatorId:string;carrierId:string};

/** Install after scenario reset and before GO. A named campaign recovery
 * contract is the ONLY caller. The patient is an actual downed rescue body. */
export function installMissingPersonRecovery(s:Session,id:string):boolean{
 if(s.started||s.phase!=='planning'||s.site?.training||
    s.missionType!=='rescue'||!id.trim()||s.missingRecoveryTargetId)return false;
 let person=s.civilians.find(c=>c.rescueTarget);
 if(!person){
  const at={...s.scenario.objective};
  const room=s.site?.rooms.find(r=>r.kind==='room'&&
   at.x>=r.x&&at.x<=r.x+r.w&&at.y>=r.y&&at.y<=r.y+r.h);
  person=createCivilian({
   id:'civ:missing:'+id+':'+(s.site?.seed??s.variant),
   role:'rescue',persona:'cautious',activity:'waiting',
   position:at,heading:0,roomId:room?.id??'objective',
   zoneId:room?.zoneId??room?.id,
   appearanceSeed:(s.site?.seed??s.variant)^0x34c7ab,
   isRescueTarget:true
  });
  if(s.site)person.refugePoints=civilianRefugePoints(s.site,person);
  s.civilians.push(person);
 }
 person.rescueTarget=true;
 person.health=0;person.injuryStage=3;
 person.state='incapacitated';person.stateSince=s.seconds;
 person.following=null;person.carriedById=null;
 person.transportMode=null;person.goal=null;person.nav=[];
 person.velocity=0;
 s.rescue={p:{...person.p},following:null,trail:[]};
 s.mission='secure';
 s.missingRecoveryTargetId=id;
 return true;
}

/** Only an actual GO-time carry/drag to extraction is admissible.
 * An unrelated mission win, abandoned patient or dead courier does not count. */
export function verifiedMissingPersonRecovery(s:Pick<Session,
 'missingRecoveryTargetId'|'mission'|'missionType'|'phase'|
 'civilians'|'operators'|'scenario'>):MissingPersonRecovery|null{
 const id=s.missingRecoveryTargetId;
 if(!id||s.missionType!=='rescue'||s.phase!=='won'||s.mission!=='done')
  return null;
 const patient=s.civilians.find(c=>c.rescueTarget);
 if(!patient||patient.health>0||!patient.carriedById||
    !near(patient.p,s.scenario.extract,37))return null;
 const courier=s.operators.find(a=>a.id===patient.carriedById&&
   a.side==='blue'&&a.health>0&&a.carryingId===patient.id&&
   near(a.p,s.scenario.extract,37));
 return courier?{operatorId:id,carrierId:courier.id}:null;
}
