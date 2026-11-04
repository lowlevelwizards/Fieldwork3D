/** R8C: explain outcomes only from immutable combat/replay evidence.
 * Debrief is post-round only: it never grants live enemy coordinates.
 * Projectile counts use unique authoritative shot IDs (not a guess from
 * transient muzzle flashes); event counts are independently labeled.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {BattleEvent} from './breach-combat.ts';
import type {ShotEvent} from './breach-game.ts';
import {summarizeMissionPacing} from './breach-mission-pacing.ts';
export type CombatReview={
 observedProjectiles:number;verifiedHits:number;armorOrCoverImpacts:number;
 hitRate:number;woundEvents:number;downEvents:number;shotEvents:number;
 contactToFireSeconds:number|null;preContactShots:number;peakSuppression:number;
 pointShots:number;aimedShots:number;
};
const rounded=(n:number)=>Math.round(n*10)/10;
export function summarizeCombatReview(frames:readonly ReplayFrame[],
 events:readonly BattleEvent[]):CombatReview{
 const shots=new Map<number,ShotEvent>();
 let peakSuppression=0;
 for(const frame of frames){
  for(const shot of frame.shots)shots.set(shot.id,shot);
  for(const actor of frame.actors)
   if(actor.health>0)peakSuppression=Math.max(peakSuppression,actor.suppression);
 }
 const all=[...shots.values()];
 const hits=all.filter(shot=>shot.hit).length;
 const pace=summarizeMissionPacing(events);
 // The first shot in the encounter can precede any visual contact (e.g.
 // a concealed defender fires). That cannot be described as a zero-second
 // response. Find the first *subsequent* shot from immutable battle events.
 const contactAt=pace.firstContactAt;
 const timedShots=events.filter(e=>e.kind==='shot');
 const preContactShots=contactAt===null?0:
   timedShots.filter(e=>e.t<contactAt).length;
 const subsequent=contactAt===null?[]:
   timedShots.filter(e=>e.t>=contactAt).map(e=>e.t);
 const firstAfter=subsequent.length?Math.min(...subsequent):null;
 const contactToFireSeconds=contactAt===null||firstAfter===null?
   null:rounded(firstAfter-contactAt);
 return {observedProjectiles:all.length,verifiedHits:hits,
  armorOrCoverImpacts:all.filter(s=>s.surface==='metal'||s.surface==='wood').length,
  hitRate:all.length?rounded(hits/all.length*100):0,
  woundEvents:events.filter(e=>e.kind==='wound').length,
  downEvents:events.filter(e=>e.kind==='down').length,
  shotEvents:events.filter(e=>e.kind==='shot').length,
  contactToFireSeconds,preContactShots,peakSuppression:rounded(peakSuppression),
  pointShots:all.filter(s=>s.mode==='point').length,
  aimedShots:all.filter(s=>s.mode==='ads').length};
}
export function formatCombatReview(frames:readonly ReplayFrame[],
 events:readonly BattleEvent[]):string{
 const r=summarizeCombatReview(frames,events);
 const delay=r.contactToFireSeconds===null?
   'NO RECORDED POST-CONTACT SHOT':
   r.contactToFireSeconds.toFixed(1)+'s CONTACT→NEXT SHOT';
 return 'CONTACT RESPONSE '+(r.contactToFireSeconds===null&&
   !frames.length&&!events.length?'NO CONFIRMED CONTACT · ':'')+delay+
  (r.preContactShots?' · PRE-CONTACT GUNFIRE '+r.preContactShots:'')+
  '\nRECORDED SHOT EVENTS '+r.shotEvents+
  ' · OBSERVED PROJECTILES '+r.observedProjectiles+
  '\nVERIFIED HITS '+r.verifiedHits+' / '+r.observedProjectiles+
  ' ('+r.hitRate+'% of sampled projectiles)'+
  '\nPOINT / AIMED '+r.pointShots+' / '+r.aimedShots+
  ' · SURFACE IMPACTS '+r.armorOrCoverImpacts+
  '\nWOUND / DOWN EVENTS '+r.woundEvents+' / '+r.downEvents+
  ' · PEAK SUPPRESSION '+r.peakSuppression;
}
