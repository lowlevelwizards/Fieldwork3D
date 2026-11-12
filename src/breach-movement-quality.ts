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
 }>();
 private goals:ReadonlyMap<string,Pt>;
 constructor(actors:readonly TeamActor[],goals:ReadonlyMap<string,Pt>){
  this.goals=goals;
  for(const a of actors)this.tracks.set(a.id,{
   last:{...a.p},lastAttempts:a.recoveryAttempts,
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
   invalidPositions:total('invalidPositions'),details};
 }
}
