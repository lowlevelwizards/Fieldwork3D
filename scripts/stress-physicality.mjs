/** On-demand deterministic physicality smoke. Run npm run audit:physicality.
 * This is intentionally not in the default 30 Hz mobile render loop. */
import {newSession,planMove,stepSession} from '../src/breach-game.ts';
import {bodyClear} from '../src/breach-navigation.ts';
const seeds=[7,19,31,47];
const outcomes=[];
for(const seed of seeds){
 const session=newSession(0,seed,'full-view','small');
 const goals=session.site?.objective;
 let authored=0;
 if(goals)for(const actor of session.operators.filter(a=>a.side==='blue'))
  if(planMove(session,actor.id,goals))authored++;
 session.phase='running';
 let blockedFrames=0,physicalFrames=0;
 for(let tick=0;tick<120;tick++){
  stepSession(session,1/30);
  for(const actor of session.operators.filter(a=>a.side==='blue'&&a.health>0)){
   if(actor.blockedTime>.25)blockedFrames++;
   if(!bodyClear(actor.p,session.doors)&&!actor.squeeze)physicalFrames++;
   if(!Number.isFinite(actor.p.x)||!Number.isFinite(actor.p.y))
    throw Error('Nonfinite operator position in seed '+seed);
  }
 }
 outcomes.push({seed,authored,blockedFrames,physicalFrames,
  travelled:session.operators.filter(a=>a.side==='blue').map(a=>({
   id:a.id,x:+a.p.x.toFixed(2),y:+a.p.y.toFixed(2),
   blocker:a.lastBlocker
  }))});
}
console.log(JSON.stringify({physicality:outcomes},null,2));
if(outcomes.some(x=>x.authored===0))process.exitCode=1;
