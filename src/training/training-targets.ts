/** Only committed physical projectile impacts can score training targets. */
import type {Session} from '../breach-game.ts';
import type {Obstacle} from '../breach-core.ts';
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
