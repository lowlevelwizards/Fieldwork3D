/** Pure, bounded reactions to real combat evidence.
 * Never change authored orders, spawn intel, teleport, or waive firing safety.
 */
import type {Pt} from './breach-core.ts';
import {combatCostDiagnosticsEnabled,combatCostCounts}
 from './breach-combat-cost-counters.ts';
import type {TeamActor} from './breach-game.ts';
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
/** Fixed-step precedence for an optional incoming-hit *facing* request.
 * A real hit can interrupt idle LOOK/WATCH, but not a committed physical
 * maneuver, hands-on tool, stun, authenticated contact stop or already
 * firing contact. No LOS work, simulation timer or additional motor.
 */
export function hitFacingInterrupted(a:TeamActor,now:number):boolean{
 if(a.health<=0||a.surrendered||a.traversal||a.traversalPending||
    a.squeeze||a.fireRetreatTarget||a.carryingId||a.treatmentActive||
    a.reload>0||a.flashUntil>now||(a.doorStunUntil??0)>now||
    a.pace==='run'||a.motorPause==='contact')return true;
 if(a.targetId!==null&&now-a.lastShotAt<.48)return true;
 const n=a.plan[0];
 return !!n&&(n.moveMode==='sprint'||
   ['door','tool','treat','evacuate','flash','reload'].includes(n.kind));
}
/** The hit yaw is projectile travel direction: reverse to face the source.
 * A brief reaction can override gaze, not route ownership or fire policy.
 */
export function incomingHitFacing(heading:number,hitYaw:number,
 age:number,{busy=false}:Readonly<{busy?:boolean}>={}):number|null{
 if(busy||age<.16||age>1.20)return null;
 const toward=wrap(hitYaw+Math.PI);
 return Math.abs(wrap(toward-heading))>.20?toward:null;
}
/** Pre-rehearsed motor micro-maneuvers. The only things this resolver
 * authors are candidate positions and a readable reason; live motor sweep
 * and actual muzzle/fire validation come from the caller.
 */
export type PhysicalCorrectionKind='lateral-left'|'lateral-right'|
 'back'|'back-left'|'back-right';
export type PhysicalCorrection={point:Pt;kind:PhysicalCorrectionKind;
 distance:number;tests:number};
// Compile immutable, ranked maneuver descriptions ONCE. The original
// search rebuilt up to eight arrays, 56 offset objects and 56 Math.hypot
// normalizers per failed attempt. Preserve the same arithmetic/order, but
// only construct the actual candidate Pt passed to the swept motor checks.
type CorrectionPattern={side:number;back:number;kind:PhysicalCorrectionKind;
 norm:number};
const pattern=(side:number,back:number,kind:PhysicalCorrectionKind):
 CorrectionPattern=>({side,back,kind,norm:Math.hypot(side,back)});
const FRIENDLY_LENGTHS=[4,7,10,12,20,28] as const;
const MUZZLE_LENGTHS=[2,3,4,7,10,14,22,30] as const;
const FRIENDLY_PATTERNS:readonly CorrectionPattern[]=[
 pattern(-1,0,'lateral-left'),pattern(1,0,'lateral-right'),
 pattern(-1,1,'back-left'),pattern(1,1,'back-right'),
 pattern(0,1,'back')
];
const MUZZLE_PATTERNS:readonly CorrectionPattern[]=[
 pattern(0,1,'back'),
 pattern(-.5,1,'back-left'),pattern(.5,1,'back-right'),
 pattern(-1,1,'back-left'),pattern(1,1,'back-right'),
 pattern(-1,0,'lateral-left'),pattern(1,0,'lateral-right')
];
export function choosePhysicalCorrection(p:Pt,aimYaw:number,
 reason:'friendly'|'muzzle',canMove:(next:Pt)=>boolean,
 canShoot:(next:Pt)=>boolean):PhysicalCorrection|null{
 if(combatCostDiagnosticsEnabled)combatCostCounts.correctionSearches++;
 let tests=0;
 const lateral={x:-Math.sin(aimYaw),y:Math.cos(aimYaw)};
 const lengths=reason==='friendly'?FRIENDLY_LENGTHS:MUZZLE_LENGTHS;
 const patterns=reason==='friendly'?FRIENDLY_PATTERNS:MUZZLE_PATTERNS;
 const forward={x:Math.cos(aimYaw),y:Math.sin(aimYaw)};
 // The exact previous rank, floating-point evaluation, and early exit
 // remain unchanged. No per-length offset closure or candidate array.
 for(const length of lengths){
  for(const candidate of patterns){
   const next={
    x:p.x+(lateral.x*candidate.side-forward.x*candidate.back)*
      length/candidate.norm,
    y:p.y+(lateral.y*candidate.side-forward.y*candidate.back)*
      length/candidate.norm
   };
   tests++;
   if(combatCostDiagnosticsEnabled)combatCostCounts.correctionCandidates++;
   if(canMove(next)&&canShoot(next))return {
    point:next,kind:candidate.kind,distance:length,tests
   };
  }
 }
 return null;
}
/** The motor remains the sole owner of the actual correction step.
 * Keep compatibility with tactical callers expecting only the endpoint.
 */
export function chooseMuzzleRecoveryStep(p:Pt,aimYaw:number,
 canMove:(next:Pt)=>boolean,canShoot:(next:Pt)=>boolean):Pt|null{
 return choosePhysicalCorrection(p,aimYaw,'muzzle',canMove,canShoot)?.point??null;
}
/** A teammate in the lane must never be moved or ignored. Try the smallest
 * lateral self-correction with safe full swept motion and shot geometry.
 */
export function chooseFriendlyLaneStep(p:Pt,aimYaw:number,
 canMove:(next:Pt)=>boolean,canShoot:(next:Pt)=>boolean):Pt|null{
 return choosePhysicalCorrection(p,aimYaw,'friendly',canMove,canShoot)?.point??null;
}
