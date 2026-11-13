/** Pure, bounded reactions to real combat evidence.
 * Never change authored orders, spawn intel, teleport, or waive firing safety.
 */
import type {Pt} from './breach-core.ts';
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
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
 let tests=0;
 const lateral={x:-Math.sin(aimYaw),y:Math.cos(aimYaw)};
 const lengths=reason==='friendly'?[4,7,10,12,20,28]:
   [4,7,10,14,22,30];
 for(const length of lengths){
  const candidates:{dx:number;dy:number;kind:PhysicalCorrectionKind}[]=
   reason==='friendly'?[
    {dx:-lateral.x*length,dy:-lateral.y*length,kind:'lateral-left'},
    {dx:lateral.x*length,dy:lateral.y*length,kind:'lateral-right'}
   ]:[
    {dx:-Math.cos(aimYaw)*length,dy:-Math.sin(aimYaw)*length,kind:'back'},
    {dx:Math.cos(aimYaw+Math.PI-.30)*length,
     dy:Math.sin(aimYaw+Math.PI-.30)*length,kind:'back-left'},
    {dx:Math.cos(aimYaw+Math.PI+.30)*length,
     dy:Math.sin(aimYaw+Math.PI+.30)*length,kind:'back-right'},
    {dx:Math.cos(aimYaw+Math.PI-.55)*length,
     dy:Math.sin(aimYaw+Math.PI-.55)*length,kind:'back-left'},
    {dx:Math.cos(aimYaw+Math.PI+.55)*length,
     dy:Math.sin(aimYaw+Math.PI+.55)*length,kind:'back-right'}
   ];
  for(const candidate of candidates){
   const next={x:p.x+candidate.dx,y:p.y+candidate.dy};
   tests++;
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
