/** CT5: game-space shoulder support frame. Carry occupies a compact
 * footprint near the carrier rather than a second trailing ground body.
 * The acquisition approach is bounded; after seating, translation is rigid. */
import type {Pt} from './breach-core.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function carrySupportPoint(carrier:Pt,heading:number):Pt{
 return {x:carrier.x-Math.sin(heading)*2,y:carrier.y+Math.cos(heading)*2};
}
export function proposeAttachedCarry(body:Pt,from:Pt,to:Pt,heading:number,dt:number,
 clear:(a:Pt,b:Pt)=>boolean,lowering=false):Pt|null{
 if(lowering&&d(from,to)<.00001)return {...body};
 const target=carrySupportPoint(to,heading),gap=d(body,target);
 const travel=d(from,to);
 const limit=travel+Math.max(0,dt)*36;
 if(gap<.00001)return {...target};
 const ratio=Math.min(1,limit/gap);
 const next={x:body.x+(target.x-body.x)*ratio,y:body.y+(target.y-body.y)*ratio};
 return clear(body,next)?next:null;
}
