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
export function choosePhysicalCorrection(p:Pt,aimYaw:number,
 reason:'friendly'|'muzzle',canMove:(next:Pt)=>boolean,
 canShoot:(next:Pt)=>boolean):PhysicalCorrection|null{
 if(combatCostDiagnosticsEnabled)combatCostCounts.correctionSearches++;
 let tests=0;
 const lateral={x:-Math.sin(aimYaw),y:Math.cos(aimYaw)};
 const lengths=reason==='friendly'?[4,7,10,12,20,28]:
   [2,3,4,7,10,14,22,30];
 const forward={x:Math.cos(aimYaw),y:Math.sin(aimYaw)};
 // Rank by minimal displacement; either blockage can benefit from lateral
 // or rear-oblique footwork. Each actual lane and swept move remains checked.
 // Fixed ordering keeps outcomes stable under deterministic replay.
 for(const length of lengths){
  const offset=(side:number,back:number,kind:PhysicalCorrectionKind)=>{
   const norm=Math.hypot(side,back);
   return {dx:(lateral.x*side-forward.x*back)*length/norm,
    dy:(lateral.y*side-forward.y*back)*length/norm,kind};
  };
  const candidates=reason==='friendly'?[
   offset(-1,0,'lateral-left'),offset(1,0,'lateral-right'),
   offset(-1,1,'back-left'),offset(1,1,'back-right'),
   offset(0,1,'back')
  ]:[
   offset(0,1,'back'),
   offset(-.5,1,'back-left'),offset(.5,1,'back-right'),
   offset(-1,1,'back-left'),offset(1,1,'back-right'),
   offset(-1,0,'lateral-left'),offset(1,0,'lateral-right')
  ];
  for(const candidate of candidates){
   const next={x:p.x+candidate.dx,y:p.y+candidate.dy};
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
