/** Pure training evaluation from actual target evidence, squad state and
 * fixed-step elapsed time. No damage authority or physics in this module. */
import type {Session} from '../breach-game.ts';
import {trainingTargetProgress} from './training-targets.ts';
import type {TrialDefinition} from './training-trials.ts';
export type TrialAssessment=Readonly<{
 outcome:'incomplete'|'passed'|'failed';score:number;grade:'S'|'A'|'B'|'C'|'D'|'F';
 elapsed:number;shots:number;targetsHit:number;targetsTotal:number;
 noShootHits:number;
 squadSurvived:number;squadSize:number;
 components:readonly {name:string;points:number}[];
}>;
export function assessTrainingTrial(s:Session,t:TrialDefinition):TrialAssessment{
 const target=trainingTargetProgress(s),squad=s.operators.filter(a=>a.side==='blue');
 const alive=squad.filter(a=>a.health>0).length;
 const safe=alive===squad.length&&target.noShootHits===0&&
  s.civilianHarmEvents.every(e=>e.sourceSide!=='blue');
 const allTargets=target.targets>0&&target.remaining===0;
 const near=(a:{p:{x:number;y:number}},p:{x:number;y:number})=>
  Math.hypot(a.p.x-p.x,a.p.y-p.y)<37;
 const finish=s.site?.extract??{x:0,y:0};
 const room=s.site?.objective??finish;
 const goalMet=t.goal==='squad'?squad.length===t.squadSize&&squad.every(a=>
  a.health>0&&near(a,finish)):
  t.goal==='room'?squad.some(a=>a.health>0&&near(a,room)):true;
 const complete=allTargets&&goalMet&&safe;
 const failed=!safe||s.seconds>t.maxSeconds||s.phase==='lost';
 const outcome=complete?'passed':failed?'failed':'incomplete';
 const components=[
  {name:'OBJECTIVE',points:complete?35:0},
  {name:'TEAM AND CIVILIAN SAFETY',points:safe?30:0},
  // Evidence is unique confirmed plates per real shots, not simulated aim.
  {name:'TARGET EFFICIENCY',points:Math.round(20*
   (target.targets?target.hits/target.targets:0)*
   (target.shots?Math.min(1,target.hits/target.shots):0))},
  {name:'EXECUTION',points:goalMet?15:0}
 ];
 const score=outcome==='failed'?0:
  Math.min(100,components.reduce((n,c)=>n+c.points,0));
 const grade=outcome==='failed'?'F':score>=98?'S':score>=90?'A':
  score>=78?'B':score>=62?'C':'D';
 return {outcome,score,grade,elapsed:s.seconds,shots:target.shots,
  targetsHit:target.hits,targetsTotal:target.targets,
  noShootHits:target.noShootHits,
  squadSurvived:alive,squadSize:squad.length,components};
}
