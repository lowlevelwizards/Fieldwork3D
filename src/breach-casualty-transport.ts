/** Build 22.07: deterministic tandem body placement.
 * No secondary motor, no teleporting a casualty and no expanding the
 * carrier's collision capsule. The tactical motor still owns navigation.
 */
import type {Pt} from './breach-core.ts';
export type TransportMode='drag'|'carry';
export const TRANSPORT_GAP:Readonly<Record<TransportMode,number>>={
 drag:16,carry:9
};
export function casualtyTrailingPosition(from:Pt,to:Pt,heading:number,
 mode:TransportMode):Pt{
 const length=Math.hypot(to.x-from.x,to.y-from.y);
 const facing=length>.01?Math.atan2(to.y-from.y,to.x-from.x):heading;
 const gap=TRANSPORT_GAP[mode];
 return {x:to.x-Math.cos(facing)*gap,y:to.y-Math.sin(facing)*gap};
}
export function transportIsClear(previous:Pt,next:Pt,
 bodyClear:(from:Pt,to:Pt)=>boolean,
 teammates:readonly Pt[]):boolean{
 if(!bodyClear(previous,next))return false;
 return teammates.every(p=>Math.hypot(p.x-next.x,p.y-next.y)>=10);
}
