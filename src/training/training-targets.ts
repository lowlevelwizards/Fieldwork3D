/** Training strikes arise only from the real committed projectile path. */
import type {Session} from '../breach-game.ts';
import type {Obstacle} from '../breach-core.ts';
export type TrainingTargetStrike={
 targetId:string;shooterId:string;shotId:number;at:number;
};
export function recordTrainingCoverStrike(s:Session,piece:Obstacle,
 shooterId:string,shotId:number):boolean{
 if(!s.site?.training||piece.fixture!=='target-plate'||!piece.id||
  !s.operators.some(a=>a.id===shooterId&&a.side==='blue'))
  return false;
 const hits=s.trainingHits??(s.trainingHits={});
 if(hits[piece.id])return false;
 hits[piece.id]={targetId:piece.id,shooterId,shotId,at:s.seconds};
 return true;
}
export function trainingTargetProgress(s:Session){
 const targets=s.site?.training?
  s.site.cover.filter(o=>o.fixture==='target-plate'&&o.id):[];
 const hits=s.trainingHits??{};
 const scored=targets.filter(o=>!!hits[o.id!]).length;
 const shots=s.operators.reduce((n,a)=>n+(a.side==='blue'?a.shots:0),0);
 return {targets:targets.length,hits:scored,remaining:targets.length-scored,
  shots,accuracy:shots>0?Math.min(100,Math.round(100*scored/shots)):0};
}
