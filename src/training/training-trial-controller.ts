/** Explicit trial outcome authority, called only in the EXISTING
 * mission phase of the fixed-step tactical simulation. */
import type {Session} from '../breach-game.ts';
import {TRIALS} from './training-trials.ts';
import {assessTrainingTrial} from './training-scoring.ts';
export function advanceTrainingTrial(s:Session):void{
 const context=s.site?.trainingTrial;
 if(!context||s.phase!=='running')return;
 const trial=TRIALS[context.id];
 if(!trial||trial.version!==context.version)return;
 const result=assessTrainingTrial(s,trial);
 if(result.outcome==='incomplete')return;
 s.phase=result.outcome==='passed'?'won':'lost';
 s.mission=result.outcome==='passed'?'done':'clear';
 s.report=[result.outcome==='passed'?'TRAINING COMPLETE':'TRAINING FAILED',
  trial.name,result.score+' / 100'];
 // The normal bounded mission event history remains usable in replay.
 const text=result.outcome==='passed'?'TRAINING COMPLETE':'TRAINING FAILED';
 s.events.push(text);if(s.events.length>12)s.events.shift();
 s.battleEvents.push({id:s.nextBattleId++,t:s.seconds,kind:'objective',
  p:{...s.scenario.objective},text:text+' · '+trial.id});
}
