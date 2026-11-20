/** Read-only TM10 motor telemetry from real Session actor state.
 * Counts operational friction, not synthetic route success. */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export class MovementQualitySurvey{
 private samples=0;
 private tracks=new Map<string,{
   last:Pt;lastAttempts:number;blocked:boolean;waiting:boolean;squeezing:boolean;
   distance:number;stallEpisodes:number;retries:number;
   passageWaitSeconds:number;squeezeSeconds:number;blockedSeconds:number;
   longestStillSeconds:number;stillSeconds:number;invalidPositions:number;
   initialRemaining:number;bestRemaining:number;noProgressSeconds:number;
   longestNoProgressSeconds:number;backtrackDistance:number;
   reversals:number;lastStep:Pt|null;
 }>();
 private goals:ReadonlyMap<string,Pt>;
 constructor(actors:readonly TeamActor[],goals:ReadonlyMap<string,Pt>){
  this.goals=goals;
  for(const a of actors)this.tracks.set(a.id,{
   last:{...a.p},lastAttempts:a.recoveryAttempts,
   initialRemaining:goals.has(a.id)?dist(a.p,goals.get(a.id)!):0,
   bestRemaining:goals.has(a.id)?dist(a.p,goals.get(a.id)!):Infinity,
   noProgressSeconds:0,longestNoProgressSeconds:0,
   backtrackDistance:0,reversals:0,lastStep:null,
   blocked:false,waiting:false,squeezing:false,
   distance:0,stallEpisodes:0,retries:0,passageWaitSeconds:0,
   squeezeSeconds:0,blockedSeconds:0,longestStillSeconds:0,
   stillSeconds:0,invalidPositions:0});
 }
 sample(actors:readonly TeamActor[],dt:number){
  this.samples++;
  for(const a of actors){
   const t=this.tracks.get(a.id);if(!t)continue;
   if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y)){
    t.invalidPositions++;continue;
   }
   const progress=dist(a.p,t.last);
   t.distance+=progress;
   // M1: measure actual physical displacement, never waypoint assignments.
   const goal=this.goals.get(a.id);
   if(goal){
    const before=dist(t.last,goal),remaining=dist(a.p,goal);
    if(progress>.1&&remaining>before+.15)
      t.backtrackDistance+=remaining-before;
    if(remaining<t.bestRemaining-.5){
      t.bestRemaining=remaining;t.noProgressSeconds=0;
    }else if(a.plan.length){
      t.noProgressSeconds+=dt;
      t.longestNoProgressSeconds=Math.max(t.longestNoProgressSeconds,t.noProgressSeconds);
    }else t.noProgressSeconds=0;
    if(progress>.15){
      const step={x:a.p.x-t.last.x,y:a.p.y-t.last.y};
      const prior=t.lastStep;
      if(prior&&step.x*prior.x+step.y*prior.y<
         -.25*progress*Math.hypot(prior.x,prior.y))t.reversals++;
      t.lastStep=step;
    }
   }
   // Only an *attempted* goal can be classified as a stuck arrival.
   if(this.goals.has(a.id)&&progress<.1){
    t.stillSeconds+=dt;
    t.longestStillSeconds=Math.max(t.longestStillSeconds,t.stillSeconds);
   }else t.stillSeconds=0;
   if(a.blockedTime>=.85&&!t.blocked)t.stallEpisodes++;
   t.blocked=a.blockedTime>=.85;
   if(t.blocked)t.blockedSeconds+=dt;
   if(a.motorPause==='passage')t.passageWaitSeconds+=dt;
   if(a.squeeze)t.squeezeSeconds+=dt;
   if(a.recoveryAttempts>t.lastAttempts)
    t.retries+=a.recoveryAttempts-t.lastAttempts;
   t.lastAttempts=a.recoveryAttempts;
   t.last={...a.p};
  }
 }
 finish(actors:readonly TeamActor[]){
  const details=actors.map(a=>{
   const t=this.tracks.get(a.id)!;
   const goal=this.goals.get(a.id);
   const arrived=!!goal&&dist(a.p,goal)<16;
   return {actor:a.id,planned:!!goal,arrived,
    remaining:goal?+dist(a.p,goal).toFixed(2):null,
    distance:+t.distance.toFixed(2),
    stallEpisodes:t.stallEpisodes,retries:t.retries,
    blockedSeconds:+t.blockedSeconds.toFixed(2),
    passageWaitSeconds:+t.passageWaitSeconds.toFixed(2),
    squeezeSeconds:+t.squeezeSeconds.toFixed(2),
    longestStillSeconds:+t.longestStillSeconds.toFixed(2),
    longestNoProgressSeconds:+t.longestNoProgressSeconds.toFixed(2),
    backtrackDistance:+t.backtrackDistance.toFixed(2),
    reversals:t.reversals,
    routeStretch:arrived&&t.initialRemaining>1?
      +(t.distance/t.initialRemaining).toFixed(2):null,
    invalidPositions:t.invalidPositions,
    orderIssue:a.orderIssue?.reason??null};
  });
  const total=(key:keyof typeof details[number])=>details.reduce((n,d)=>
    n+(typeof d[key]==='number'?d[key] as number:0),0);
  return {seconds:+(this.samples/60).toFixed(2),
   plansAccepted:details.filter(d=>d.planned).length,
   arrivals:details.filter(d=>d.arrived).length,
   incomplete:details.filter(d=>d.planned&&!d.arrived).length,
   stallEpisodes:total('stallEpisodes'),retries:total('retries'),
   passageWaitSeconds:+total('passageWaitSeconds').toFixed(2),
   squeezeSeconds:+total('squeezeSeconds').toFixed(2),
   backtrackDistance:+total('backtrackDistance').toFixed(2),
   reversals:total('reversals'),
   longestNoProgressSeconds:Math.max(0,...details.map(d=>d.longestNoProgressSeconds)),
   invalidPositions:total('invalidPositions'),details};
 }
}
