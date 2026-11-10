/** Build 141D: CPU occlusion rays produce a continuous directional visibility
 * polygon. The renderer only composites it; intelligence remains authoritative
 * in breach-game. Endpoints and cone edges are included for crisp corners. */
import {WALLS,COVER,type Pt,type Segment,type Door} from './breach-core.ts';
import {opticalBlockerSegments} from './breach-optical-occlusion.ts';
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
  walls:readonly Segment[]=WALLS,doors:readonly Door[]=[],lowObstructs=false,
  cover:readonly import('./breach-core.ts').Obstacle[]=COVER):Pt[]{
  const blockers=opticalBlockerSegments(walls,doors,cover,lowObstructs);
  // Preserve every original angle sample and resulting polygon vertex.
  // Only the ray intersection loop is culled: segments outside the
  // enclosing square cannot intersect a finite ray of this range.
  const reach=Math.max(0,range),minX=origin.x-reach,maxX=origin.x+reach,
    minY=origin.y-reach,maxY=origin.y+reach;
  const rayBlockers=blockers.filter(edge=>
    Math.max(edge.a.x,edge.b.x)>=minX&&
    Math.min(edge.a.x,edge.b.x)<=maxX&&
    Math.max(edge.a.y,edge.b.y)>=minY&&
    Math.min(edge.a.y,edge.b.y)<=maxY);
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
    for(const edge of rayBlockers){
      hit=Math.min(hit,rayHit(origin,dx,dy,edge,hit));
      if(hit<=.05)break;
    }
    polygon.push({x:origin.x+dx*hit,y:origin.y+dy*hit});
  }
  return polygon;
}
