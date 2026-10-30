/** Build 141D: CPU occlusion rays produce a continuous directional visibility
 * polygon. The renderer only composites it; intelligence remains authoritative
 * in breach-game. Endpoints and cone edges are included for crisp corners. */
import {WALLS,COVER,doorLeafSegment,
  type Pt,type Segment,type Door} from './breach-core.ts';
export const VISION_HALF_ANGLE=1.15;
const cross=(ax:number,ay:number,bx:number,by:number)=>ax*by-ay*bx;
function rayHit(p:Pt,dx:number,dy:number,s:Segment,range:number){
  const ex=s.b.x-s.a.x,ey=s.b.y-s.a.y;
  const ox=s.a.x-p.x,oy=s.a.y-p.y,denom=cross(dx,dy,ex,ey);
  if(Math.abs(denom)<1e-8)return range;
  const t=cross(ox,oy,ex,ey)/denom;
  const u=cross(ox,oy,dx,dy)/denom;
  return t>=0&&u>=0&&u<=1?Math.min(range,t):range;
}
export function visionPolygon(origin:Pt,heading:number,range=240,
  walls:Segment[]=WALLS,doors:Door[]=[],lowObstructs=false,
  cover= COVER):Pt[]{
  const blockers:Segment[]=[...walls,...doors.map(doorLeafSegment)];
  for(const c of cover){
    if(c.low&&!lowObstructs)continue;
    const l=c.x-c.w/2,r=c.x+c.w/2,t=c.y-c.h/2,b=c.y+c.h/2;
    const pts=[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}];
    for(let i=0;i<4;i++)blockers.push({a:pts[i],b:pts[(i+1)%4]});
  }
  const angles:number[]=[];
  for(let i=0;i<=64;i++)
    angles.push(-VISION_HALF_ANGLE+2*VISION_HALF_ANGLE*i/64);
  for(const line of blockers)for(const point of [line.a,line.b]){
    const absolute=Math.atan2(point.y-origin.y,point.x-origin.x);
    const delta=Math.atan2(Math.sin(absolute-heading),
      Math.cos(absolute-heading));
    if(Math.abs(delta)>VISION_HALF_ANGLE+.004)continue;
    for(const eps of [-.0015,0,.0015])
      angles.push(Math.max(-VISION_HALF_ANGLE,
        Math.min(VISION_HALF_ANGLE,delta+eps)));
  }
  angles.sort((a,b)=>a-b);
  const polygon:Pt[]=[{...origin}];
  let last=-Infinity;
  for(const delta of angles){
    if(delta-last<.0001)continue;
    last=delta;
    const angle=heading+delta,dx=Math.cos(angle),dy=Math.sin(angle);
    let hit=range;
    for(const edge of blockers){
      hit=Math.min(hit,rayHit(origin,dx,dy,edge,hit));
      if(hit<=.05)break;
    }
    polygon.push({x:origin.x+dx*hit,y:origin.y+dy*hit});
  }
  return polygon;
}
