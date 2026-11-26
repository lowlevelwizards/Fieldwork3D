import {hardWindowCovering,coveringControlSide} from './breach-window-covering-physical.ts';
/** WC4: explicit SET orders, shared planning and execution contact rules. */
import type {Session,TeamActor} from './breach-game.ts';
import type {WindowState} from './breach-windows.ts';
import {doorBlocksRay,type Pt} from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {windowBarrierMatches} from './worldgen/window-geometry-contract.ts';
import {segmentHitsBox} from './breach-ray.ts';
import {windowVisualHeadHeight} from './breach-opening-proportions.ts';
import {normalizeWindowCovering,type WindowCovering} from './breach-window-coverings.ts';
import type {PhysicalContact} from './breach-physical-contact-anchor.ts';
export const COVERING_ACTIONS=['open-covering','close-covering','half-covering','tilt-covering','untilt-covering','lock-covering','unlock-covering'] as const;
export type CoveringAction=typeof COVERING_ACTIONS[number];
export const isCoveringAction=(a:unknown):a is CoveringAction=>COVERING_ACTIONS.some(x=>x===a);
export const COVERING_ACTION_SECONDS=.76,COVERING_REACH=23;
export const COVERING_ACTION_LABELS:Record<CoveringAction,string>={'open-covering':'OPEN','close-covering':'CLOSE','half-covering':'HALF OPEN','tilt-covering':'TILT OPEN','untilt-covering':'TILT SHUT','lock-covering':'LOCK','unlock-covering':'UNLOCK'};
export function desiredCovering(c:WindowCovering,action:CoveringAction):WindowCovering|null{
 if(c.integrity===0)return null;
 const hard=hardWindowCovering(c);
 if(action==='lock-covering'||action==='unlock-covering'){
  if(c.family!=='rolling-shutter'||c.opening!==0)return null;
  return normalizeWindowCovering({covering:{...c,locked:action==='lock-covering'}})??null;
 }
 if(c.locked)return null;
 if(hard&&(action==='tilt-covering'||action==='untilt-covering'||action==='half-covering'&&c.family==='hinged-shutter'))return null;
 const blind=c.family.includes('blind');
 if((action==='tilt-covering'||action==='untilt-covering')&&(!blind||c.opening===1))return null;
 return normalizeWindowCovering({covering:{...c,opening:action==='open-covering'?1:action==='close-covering'?0:action==='half-covering'?.5:c.opening,
 ...(blind?{tilted:action==='tilt-covering'?true:action==='untilt-covering'||action==='close-covering'?false:!!c.tilted}:{})}})??null;
}
export function sameCovering(a:WindowCovering,b:WindowCovering):boolean{
 return a.opening===b.opening&&!!a.tilted===!!b.tilted&&a.family===b.family&&a.side===b.side&&a.palette===b.palette&&a.integrity===b.integrity&&!!a.locked===!!b.locked;
}
export function coveringContactPoint(w:WindowState,c:WindowCovering,from:Pt,crouched=false){
 const side=coveringControlSide(c);
 const normal=w.vertical?{x:-side,y:0}:{x:0,y:side};
 const half=Math.max(0,w.width/2-6),center=w.vertical?w.y:w.x,along=w.vertical?from.y:from.x;
 const at=Math.max(center-half,Math.min(center+half,along));
 const p=w.vertical?{x:w.x+normal.x*8,y:at}:{x:at,y:w.y+normal.y*8};
 const bottom=w.sillHeight??14,top=w.headHeight??windowVisualHeadHeight(w.style);
 return {p,normal,height:Math.max(bottom+2,Math.min(top-2,crouched?22:31))};
}
export function coveringContactClear(s:Session,w:WindowState,c:WindowCovering,from:Pt,crouched=false):boolean{
 if(w.treatment==='boarded'||w.treatment==='bars'||c.integrity===0)return false;
 const {p,normal,height}=coveringContactPoint(w,c,from,crouched);
 const side=(from.x-w.x)*normal.x+(from.y-w.y)*normal.y;
 if(side<9||Math.hypot(p.x-from.x,p.y-from.y)>COVERING_REACH||height>(crouched?29:40)||height<8)return false;
 const world=sessionWorldGeometry(s),ray={a:from,b:p};
 if(world.staticWallBlocksRay(ray)||doorBlocksRay(s.doors,ray))return false;
 return !world.someCoverAlongRay(from,p,o=>!o.destroyed&&!windowBarrierMatches(w,o)&&segmentHitsBox(from,p,o));
}
export function nearestCoveringInteraction(s:Session,from:Pt,visible:(p:Pt)=>boolean,crouched=false){
 let best:{window:WindowState;covering:WindowCovering;actions:CoveringAction[]}|undefined,bestDistance=Infinity;
 for(const w of s.windows){
  if(Math.abs(w.x-from.x)>w.width/2+32||Math.abs(w.y-from.y)>w.width/2+32)continue;
  const c=normalizeWindowCovering(w);if(!c||!coveringContactClear(s,w,c,from,crouched))continue;
  if(!visible({x:w.x,y:w.y}))continue;
  const actions=COVERING_ACTIONS.filter(action=>{const next=desiredCovering(c,action);return !!next&&!sameCovering(c,next);});
  if(!actions.length)continue;
  const p=coveringContactPoint(w,c,from,crouched).p,d=Math.hypot(p.x-from.x,p.y-from.y);
  if(d<bestDistance){bestDistance=d;best={window:w,covering:c,actions};}
 }
 return best;
}
/** No closing a hard panel into an active or reserved window crossing. */
export function coveringTransitionClear(s:Session,w:WindowState,c:WindowCovering,next:WindowCovering,actor:TeamActor):boolean{
 if(!hardWindowCovering(c)||next.opening===c.opening)return true;
 if(s.operators.some(o=>o.health>0&&(o.traversal?.windowId===w.id||o.traversalPending?.windowId===w.id)))return false;
 if(c.family!=='hinged-shutter')return true;
 // Coarse swing envelope, evaluated only during a real action. The operating
 // hand is exempt; other bodies must be outside the exterior leaf sweep.
 const occupied=(p:Pt)=>{
  const normal=w.vertical?(w.x-p.x)*c.side:(p.y-w.y)*c.side;
  const along=Math.abs(w.vertical?p.y-w.y:p.x-w.x);
  return normal>0&&normal<w.width/2+16&&along<w.width+10;
 };
 return !s.operators.some(o=>o!==actor&&o.health>0&&occupied(o.p))&&!(s.civilians??[]).some(o=>o.health>0&&occupied(o.p));
}
export function coveringActionSeconds(c:WindowCovering):number{return c.family==='rolling-shutter'?1.35:c.family==='hinged-shutter'?1.05:COVERING_ACTION_SECONDS;}
export function coveringActorAvailable(a:TeamActor,s:Session):boolean{
 return a.health>0&&!a.surrendered&&!a.carryingId&&!a.traversal&&!a.traversalPending&&!a.treatmentActive&&a.reload<=0&&a.flashUntil<=s.seconds;
}
export function coveringHandContact(w:WindowState,c:WindowCovering,a:TeamActor,now:number,prior:PhysicalContact|null):PhysicalContact{
 const {p,normal,height}=coveringContactPoint(w,c,a.p,a.posture==='crouch'),id='covering:'+w.id;
 return {intent:'covering',limb:'support-hand',anchor:{target:'surface',id,point:{x:p.x,y:height,z:p.y},normal:{x:normal.x,y:0,z:normal.y}},
 startedAt:prior?.intent==='covering'&&prior.anchor.id===id&&prior.releasedAt===null?prior.startedAt:now,releasedAt:null};
}
/** Recorded order and hand contact are the seekable animation clock. */
export function coveringMotion(a:Pick<TeamActor,'plan'|'actionTimer'|'health'|'physicalContact'>,c:WindowCovering){
 const order=a.plan[0];
 if(a.health<=0||!order||order.kind!=='interact'||!isCoveringAction(order.interaction)||a.physicalContact?.intent!=='covering'||a.physicalContact.anchor.id!==order.objectId||a.physicalContact.releasedAt!==null||a.actionTimer<=0)return null;
 const next=desiredCovering(c,order.interaction);if(!next)return null;
 const t=Math.max(0,Math.min(1,(a.actionTimer-.24)/(coveringActionSeconds(c)-.24))),blend=t*t*(3-2*t);
 return {opening:c.opening+(next.opening-c.opening)*blend,tilt:Number(!!c.tilted)+(Number(!!next.tilted)-Number(!!c.tilted))*blend};
}
