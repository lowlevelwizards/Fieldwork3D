/** ST connected side-road extension. A full-width edge-to-edge branch
 * is admitted only where a genuine unused corridor exists. Do not cut
 * through buildings, authored property uses, parking, actors or fixtures. */
import type {Site} from '../breach-site.ts';
import type {StreetInfrastructure} from './street-infrastructure.ts';
import type {StreetRect} from './public-street-layout.ts';
import {exteriorDoorReserves,intersectsExteriorDoorReserve} from './exterior-door-reserve.ts';
import {propDefinition} from './asset-catalog.ts';
import type {Obstacle} from '../breach-core.ts';
const overlap=(a:StreetRect,b:StreetRect,pad=0)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&Math.abs(a.y-b.y)<(a.depth+b.depth)/2+pad;
export function attachStreetJunction(site:Site):StreetInfrastructure|undefined{
 const p=site.streetInfrastructure;if(!p)return undefined;
 // A side road needs a full two-lane main section and a real walk edge.
 // Rural shoulders and verge layouts are deferred rather than clipped incorrectly.
 if(p.cropped||!p.frontage.sidewalk||p.verge||p.shoulder||p.curbside||p.junction)return p;
 const b=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const axis=p.axis,across=axis==='x'?'y':'x',sign=p.entry==='south'||p.entry==='east'?1:-1;
 const alongMin=axis==='x'?b.minX:b.minY,alongMax=axis==='x'?b.maxX:b.maxY;
 const road=p.frontage.road,inner=road[across]-sign*p.visibleRoadWidth/2;
 const far=across==='x'?(sign===1?b.minX:b.maxX):(sign===1?b.minY:b.maxY);
 const length=Math.abs(inner-far);if(length<160)return p;
 const lane=p.nominalLaneWidth;
 const rect=(along:number,cross:number,w:number,h:number):StreetRect=>axis==='x'?{x:along,y:cross,width:w,depth:h}:{x:cross,y:along,width:h,depth:w};
 const box=(c:{x:number;y:number;w:number;h:number}):StreetRect=>({x:c.x,y:c.y,width:c.w,depth:c.h});
 const blocked=[...site.cover,...(site.structures??[]),...(site.exteriorZones??[]),...exteriorDoorReserves(site.doors)].map(box);
 blocked.push(...site.rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2,width:r.w,depth:r.h})));
 const points=[...site.spawn,...site.enemies,site.entrance,site.extract,site.objective,
  ...(site.encounter?.actors??[]).flatMap(a=>[a.position,...(a.routine??[])]),
  ...(site.encounter?.neutrals??[]).flatMap(a=>[a.position,...(a.routine??[])])];
 const preferred=axis==='x'?sign:-sign; // inside shoulder on incoming driver's right
 for(const side of [preferred,-preferred]){
  const width=lane*2,at=side===-1?alongMin+width/2:alongMax-width/2;
  const branch=rect(at,(inner+far)/2,width,length);
  if(blocked.some(r=>overlap(r,branch,6))||points.some(pt=>overlap({x:pt.x,y:pt.y,width:40,depth:40},branch)))continue;
  if([p.frontage.approach,p.frontage.curbRamp,p.accessConnection].some(r=>r&&overlap(r,branch,6)))continue;
  const lo=at-width/2,hi=at+width/2;
  const trim=(r:StreetRect):StreetRect[]=>{
   const w=axis==='x'?r.width:r.depth,a=r[axis]-w/2,z=r[axis]+w/2;
   if(z<=lo||a>=hi)return [r];
   const spans=[[a,Math.min(z,lo)],[Math.max(a,hi),z]].filter(([a,z])=>z-a>1);
   return spans.map(([a,z])=>rect((a+z)/2,r[across],z-a,axis==='x'?r.depth:r.width));
  };
  const sidewalkPieces=p.frontage.sidewalkPieces.flatMap(trim),curb=p.frontage.curb.flatMap(trim);
  if(!sidewalkPieces.length||!curb.length)continue;
  // This is a cropped T/corner at the map edge. The main street does not
  // claim an off-map intersection or crossing beyond its visible extent.
  return {...p,frontage:{...p.frontage,sidewalkPieces,curb},
   junction:{road:branch,axis:across,laneWidth:lane,side:side as -1|1,mainEdge:inner},
   diagnostics:[...p.diagnostics,'connected-side-road']};
 }
 return p;
}

/** Author a stop-controlled approach only when its physical sign can fit.
 * The sign's front faces the incoming branch; paint and sign share stopAt. */
export function proposeJunctionStop(site:Site):{site:Site;sign:Obstacle}|null{
 const p=site.streetInfrastructure,j=p?.junction;if(!p||!j||j.stopAt!==undefined)return null;
 const asset=propDefinition('traffic-stop-sign');if(!asset)return null;
 const axis=p.axis,sign=p.entry==='south'||p.entry==='east'?1:-1;
 const right=axis==='x'?-sign:sign;
 if(right!==-j.side)return null;
 const orientation=p.entry==='south'?2:p.entry==='north'?0:p.entry==='east'?3:1;
 const w=orientation%2?asset.depth:asset.width,h=orientation%2?asset.width:asset.depth;
 const sidewalk=p.frontage.sidewalk;
 const walk=sidewalk?(axis==='x'?sidewalk.depth:sidewalk.width):0;
 const b=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const points=[...site.spawn,...site.enemies,site.entrance,site.extract,site.objective,
  ...(site.encounter?.actors??[]).flatMap(a=>[a.position,...(a.routine??[])]),
  ...(site.encounter?.neutrals??[]).flatMap(a=>[a.position,...(a.routine??[])])];
 const reserved=exteriorDoorReserves(site.doors);
 for(const offset of [10,18,28]){
  const at=j.road[axis]+right*(j.laneWidth+(axis==='x'?w:h)/2+4);
  const stopAt=j.mainEdge-sign*(walk+3+offset);
  const c:Obstacle={x:axis==='x'?at:stopAt,y:axis==='x'?stopAt:at,w,h,orientation,fixture:'traffic-stop-sign',low:true};
  if(c.x-w/2<b.minX+17||c.x+w/2>b.maxX-17||c.y-h/2<b.minY+23||c.y+h/2>b.maxY-22)continue;
  const r={x:c.x,y:c.y,width:w,depth:h};
  const collision=[...site.cover,...(site.structures??[]),...(site.exteriorZones??[])].some(o=>overlap(r,{x:o.x,y:o.y,width:o.w,depth:o.h},5));
  if(collision||intersectsExteriorDoorReserve(reserved,c)||
   site.rooms.some(o=>overlap(r,{x:o.x+o.w/2,y:o.y+o.h/2,width:o.w,depth:o.h},8))||
   points.some(pt=>Math.abs(pt.x-c.x)<w/2+32&&Math.abs(pt.y-c.y)<h/2+32))continue;
  if([p.frontage.road,p.frontage.sidewalk,p.frontage.approach,p.frontage.curbRamp,j.road,p.accessConnection].some(s=>s&&overlap(r,s,2)))continue;
  return {sign:c,site:{...site,streetInfrastructure:{...p,junction:{...j,stopAt},diagnostics:[...p.diagnostics,'stop-controlled-side-road']}}};
 }
 return null;
}
