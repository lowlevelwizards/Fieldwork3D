/** Exact signed floor clearance against authoritative site geometry. */
import {W,H,WALLS,COVER,pointToSegment,type Pt,type Obstacle}
  from './breach-core.ts';
export type ClearanceReason='bounds'|'wall'|'furniture'|'clear';
const rectDistance=(p:Pt,r:Obstacle)=>{
  const dx=Math.abs(p.x-r.x)-r.w/2,dy=Math.abs(p.y-r.y)-r.h/2;
  if(dx<=0&&dy<=0)return Math.max(dx,dy);
  return Math.hypot(Math.max(0,dx),Math.max(0,dy));
};
export function floorClearance(p:Pt){
  let free=Math.min(p.x-13,p.y-20,W-13-p.x,H-13-p.y);
  let reason:ClearanceReason='bounds';
  for(const w of WALLS){
    const d=pointToSegment(p,w)-1;
    if(d<free){free=d;reason='wall';}
  }
  for(const r of COVER){
    const d=rectDistance(p,r);
    if(d<free){free=d;reason='furniture';}
  }
  return {radius:free,diameter:Math.max(0,free*2),reason,
    walkable:free>=8};
}
