/** A3.9-H: committed stationary cover posture, not a second command.
 * The player's stand/crouch choice remains absolute. Height varies inside
 * that band only while the real cover face is in front and within reach.
 */
import {coverHeight} from './breach-cover-height.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {Obstacle,Pt} from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';

export const STAND_COVER_DROP_MAX=7.5;
export const CROUCH_COVER_DROP_MIN=-6;
export const CROUCH_COVER_DROP_MAX=2.5;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const toward=(from:number,to:number,max:number)=>
 from+clamp(to-from,-max,max);
export type StanceSurface={id:string;top:number;face:Pt;distance:number};
/** True nearby FACE, not center-radius proximity or a hidden obstacle. */
export function stanceSurface(a:Pick<TeamActor,'p'|'heading'>,
 c:Obstacle,index:number):StanceSurface|null{
 if(c.destroyed||c.toppled||/fence|foliage|bush|tree|cloth|glass/i
   .test(c.fixture??''))return null;
 const top=coverHeight(c),halfX=Math.abs(c.w)/2,halfY=Math.abs(c.h)/2;
 if(!Number.isFinite(top)||top<13||top>43||halfX<2||halfY<2)
  return null;
 const px=clamp(a.p.x,c.x-halfX,c.x+halfX);
 const py=clamp(a.p.y,c.y-halfY,c.y+halfY);
 const dx=px-a.p.x,dy=py-a.p.y,dist=Math.hypot(dx,dy);
 if(dist<5||dist>21)return null;
 const f={x:Math.cos(a.heading),y:Math.sin(a.heading)};
 if((dx*f.x+dy*f.y)/dist<.52)return null;
 return {id:'cover:'+index,top,face:{x:px,y:py},distance:dist};
}
export function coverStanceTarget(
 posture:'stand'|'crouch',top:number,hasKnownThreat:boolean
):number{
 if(posture==='stand'){
  // A high shelf or counter permits a modest defensive tuck. A lower
  // tabletop asks for more knee flexion before a natural hand rest.
  const tuck=clamp(32-top-1.5,1.5,STAND_COVER_DROP_MAX);
  return hasKnownThreat?tuck:Math.min(4.5,tuck);
 }
 // The crouched band can elevate just enough to see across low cover,
 // or settle slightly behind taller cover when not engaging.
 return hasKnownThreat?clamp(-(top-11+1.5),
   CROUCH_COVER_DROP_MIN,0):clamp((top-17)*.40,0,CROUCH_COVER_DROP_MAX);
}
export function coverStanceEligible(a:TeamActor,s:Session):boolean{
 const order=a.plan[0];
 return s.phase==='running'&&a.health>0&&!a.surrendered&&
  a.velocity<4&&!a.traversal&&!a.traversalPending&&!a.squeeze&&
  a.pace!=='run'&&!a.treatmentActive&&a.reload<=0&&
  !a.carryingId&&!a.carriedById&&!a.fireRetreatTarget&&
  a.flashUntil<=s.seconds&&a.lastThrowAt<s.seconds-.7&&
  (!order||!['move','door','tool','treat','flash','evacuate','pie']
   .includes(order.kind));
}
/** Fixed-step speed limit and dwell avoid cover-height oscillation.
 * Never changes feet or authored posture; consumers of this recorded
 * value use identical actual chest, muzzle and body safety geometry.
 */
export function advanceCoverStances(s:Session,dt=1/60):void{
 const world=sessionWorldGeometry(s);
 for(const a of s.operators){
  let picked:StanceSurface|null=null;
  if(coverStanceEligible(a,s)){
   world.someCoverNearPoint(a.p,35,(cover,index)=>{
    const face=stanceSurface(a,cover,index);
    if(!face||!world.isClear(a.p,{
      x:a.p.x+(face.face.x-a.p.x)*.90,
      y:a.p.y+(face.face.y-a.p.y)*.90
    },s.doors))return false;
    if(!picked||face.id===a.coverStanceSource||
       face.distance<picked.distance-.5)
      picked=face;
    return false;
   });
  }
  const threat=!!a.targetId||a.side==='red'&&
    (!!a.contact||a.alert==='cover'||a.alert==='suspicious');
  const target=picked?
    coverStanceTarget(a.posture,picked.top,threat):0;
  const previous=a.coverStanceDrop??0;
  const next=toward(previous,target,Math.max(0,dt)*13.5);
  a.coverStanceDrop=Math.abs(next)<.005?0:next;
  a.coverStanceSource=picked?.id??null;
 }
}
