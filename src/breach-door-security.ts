/** D3.29G — physical, frame-relative door security.
 * The geometric positive/negative sides are defined by the fixed segment
 * a -> b, independent of hinge, handedness, and swing. A legacy door with
 * only 'locked' retains its historical two-sided behavior.
 *
 * No intelligence is granted by checking this pure capability: callers
 * must independently establish reach and their actor's local knowledge.
 */
import type {Door,Pt} from './breach-core.ts';

export type DoorLockSide='positive'|'negative'|'both';
export type DoorSecurityKind='privacy'|'security'|'restricted';

/** A point exactly on the frame has no safe free-egress side. */
export function doorFrameSide(
 door:Pick<Door,'a'|'b'>,point:Pt
):'positive'|'negative'|'threshold'{
 const x=door.b.x-door.a.x,y=door.b.y-door.a.y;
 const cross=x*(point.y-door.a.y)-y*(point.x-door.a.x);
 return Math.abs(cross)<.001?'threshold':cross>0?'positive':'negative';
}

/** A directional lock is active only for an actor on its secured face. */
export function doorSecuredFrom(
 door:Pick<Door,'a'|'b'|'locked'|'lockSide'>,point:Pt
):boolean{
 if(!door.locked)return false;
 const side=door.lockSide??'both';
 if(side==='both')return true;
 const actual=doorFrameSide(door,point);
 return actual==='threshold'||actual===side;
}

/** Privacy hardware releases its lock on a legitimate interior exit.
 * Security hardware retains its outside-secured state after free egress.
 * Call ONLY on the committed physical OPEN transition, never on a probe.
 */
export function releasePrivacyLockOnOpen(door:Door,actorPosition:Pt):boolean{
 if(door.securityKind!=='privacy'||!door.locked||
    doorSecuredFrom(door,actorPosition))return false;
 door.locked=false;
 return true;
}
