/** Only committed physical projectile impacts can score training targets. */
import type {Session} from '../breach-game.ts';
import type {Obstacle} from '../breach-core.ts';
import {OPERATOR_RADIUS} from '../breach-core.ts';
import {materialForFixture,MATERIALS} from '../breach-materials.ts';
import {publishSessionCoverToActiveSite} from '../breach-world-context.ts';
export type TrainingTargetStrike={
 targetId:string;shooterId:string;shotId:number;at:number;
 kind?:'hostile'|'no-shoot';
};
export function recordTrainingCoverStrike(s:Session,piece:Obstacle,
 shooterId:string,shotId:number):boolean{
 if(!s.site?.training||!['target-plate','target-no-shoot'].includes(piece.fixture??'')||
  !piece.id||!s.operators.some(a=>a.id===shooterId&&a.side==='blue'))
  return false;
 const hits=s.trainingHits??(s.trainingHits={});
 if(hits[piece.id])return false;
 hits[piece.id]={targetId:piece.id,shooterId,shotId,at:s.seconds,
  kind:piece.fixture==='target-no-shoot'?'no-shoot':'hostile'};
 return true;
}
export function trainingTargetProgress(s:Session){
 const plates=s.site?.training?
  s.site.cover.filter(o=>['target-plate','target-no-shoot'].includes(o.fixture??'')):[];
 const hits=s.trainingHits??{};
 const hostile=plates.filter(o=>o.fixture==='target-plate');
 const noShoot=plates.filter(o=>o.fixture==='target-no-shoot');
 const scored=hostile.filter(o=>o.id&&hits[o.id]).length;
 const mistakes=noShoot.filter(o=>o.id&&hits[o.id]).length;
 const shots=s.operators.reduce((n,a)=>n+(a.side==='blue'?a.shots:0),0);
 return {targets:hostile.length,hits:scored,remaining:hostile.length-scored,
  noShootTargets:noShoot.length,noShootHits:mistakes,shots,
  // First-confirmed unique targets per shot, not conventional hit accuracy.
  efficiency:shots>0?Math.min(100,Math.round(100*scored/shots)):0};
}

/** Free-practice target reset. Never modifies scored courses or Campaign.
 * An all-or-nothing occupancy preflight prevents restoring a solid target
 * around an actor who walked through a previously destroyed plate. */
export function resetPracticeTargets(s:Session):boolean{
 if(!s.site?.training||s.site.trainingTrial||
  (s.phase!=='planning'&&s.phase!=='running'))return false;
 const originals=s.site.cover.filter(o=>o.id&&
  (o.fixture==='target-plate'||o.fixture==='target-no-shoot'));
 if(!originals.length)return false;
 const byId=new Map(s.coverState.map(o=>[o.id,o]));
 if(originals.some(o=>!byId.has(o.id)))return false;
 const occupants=[
  ...s.operators.filter(a=>a.health>0).map(a=>a.p),
  ...s.civilians.filter(a=>a.health>0).map(a=>a.p)
 ];
 if(originals.some(o=>occupants.some(p=>
  Math.abs(p.x-o.x)<=o.w/2+OPERATOR_RADIUS&&
  Math.abs(p.y-o.y)<=o.h/2+OPERATOR_RADIUS)))return false;
 for(const source of originals){
  const target=byId.get(source.id)!;
  const material=source.material??materialForFixture(source.fixture);
  Object.assign(target,source,{material,
   integrity:MATERIALS[material].integrity,destroyed:false,
   toppled:false,low:source.low??false});
 }
 s.trainingHits={};s.objectRevision++;
 publishSessionCoverToActiveSite(s);
 s.battleEvents.push({id:s.nextBattleId++,t:s.seconds,
  kind:'interaction',text:'TRAINING TARGETS RESET'});
 return true;
}
