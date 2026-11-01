/** Accessibility-inspired horizontal geometry diagnostics, not legal
 * certification. Actual ADA compliance includes slopes, hardware, reach,
 * thresholds, turning/door maneuvering configurations, and context-specific
 * exceptions that a single-level tactical model does not represent.
 * Reference: https://www.access-board.gov/ada/chapter/ch04/
 */
import type {Site,Room} from '../breach-site.ts';
import type {Pt,Obstacle} from '../breach-core.ts';
import {WORLD_UNITS_PER_METRE} from './world-scale.ts';
export const ACCESSIBLE_ROUTE_WIDTH=0.9144*WORLD_UNITS_PER_METRE; // 36 in
export const ACCESSIBLE_DOOR_WIDTH=0.8128*WORLD_UNITS_PER_METRE;  // 32 in
export const TURNING_DIAMETER=1.524*WORLD_UNITS_PER_METRE;       // 60 in
export type AccessibilityIssue={
 kind:'narrow-opening'|'approach-obstructed'|'no-turning-area';
 roomId:string;id:string;detail:string;
};
export type AccessibilityQuality={
 referenceRouteWidth:number;referenceDoorWidth:number;
 turningDiameter:number;issues:AccessibilityIssue[];
 checkedRooms:number;checkedDoors:number;
};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function circleClear(point:Pt,radius:number,room:Room,cover:readonly Obstacle[]):boolean{
 if(point.x-radius<room.x||point.x+radius>room.x+room.w||
   point.y-radius<room.y||point.y+radius>room.y+room.h)return false;
 return !cover.some(o=>{
  const nearestX=Math.max(o.x-o.w/2,Math.min(point.x,o.x+o.w/2));
  const nearestY=Math.max(o.y-o.h/2,Math.min(point.y,o.y+o.h/2));
  return distance(point,{x:nearestX,y:nearestY})<radius+1;
 });
}
function interiorApproach(room:Room,mid:Pt,depth:number):Pt|null{
 const tol=1;
 if(mid.y>=room.y&&mid.y<=room.y+room.h){
  if(Math.abs(mid.x-room.x)<=tol)return {x:room.x+depth,y:mid.y};
  if(Math.abs(mid.x-room.x-room.w)<=tol)return {x:room.x+room.w-depth,y:mid.y};
 }
 if(mid.x>=room.x&&mid.x<=room.x+room.w){
  if(Math.abs(mid.y-room.y)<=tol)return {x:mid.x,y:room.y+depth};
  if(Math.abs(mid.y-room.y-room.h)<=tol)return {x:mid.x,y:room.y+room.h-depth};
 }
 return null;
}
export function assessAccessibilityClearance(
 site:Pick<Site,'rooms'|'doors'|'cover'>):AccessibilityQuality{
 const issues:AccessibilityIssue[]=[];
 const publicRooms=site.rooms.filter(r=>r.kind==='room'&&
  ['sales','checkout','lobby','reception','waiting','restroom','bathroom',
   'dining','exam','treatment','office','meeting','guest','living','studio'].includes(r.purpose??''));
 for(const room of publicRooms){
  const radius=TURNING_DIAMETER/2;
  let found=false;
  for(let y=1;y<=5&&!found;y++)for(let x=1;x<=5&&!found;x++){
   const point={x:room.x+room.w*x/6,y:room.y+room.h*y/6};
   found=circleClear(point,radius,room,site.cover);
  }
  if(!found)issues.push({kind:'no-turning-area',roomId:room.id,
   id:room.id,detail:'No unobstructed 60-inch circular turning reference detected'});
 }
 let checkedDoors=0;
 for(const door of site.doors){
  const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const near=site.rooms.filter(r=>r.kind==='room'&&interiorApproach(r,mid,22));
  if(!near.length)continue;
  checkedDoors++;
  const width=distance(door.a,door.b);
  if(width<ACCESSIBLE_DOOR_WIDTH)
   issues.push({kind:'narrow-opening',roomId:near[0].id,id:door.id,
    detail:'Nominal opening '+width.toFixed(1)+' units below 32-inch reference'});
  for(const room of near){
   const approach=interiorApproach(room,mid,22)!;
   if(!circleClear(approach,ACCESSIBLE_ROUTE_WIDTH/2,room,site.cover))
    issues.push({kind:'approach-obstructed',roomId:room.id,id:door.id,
     detail:'Interior approach lacks an unobstructed 36-inch reference circle'});
  }
 }
 return {referenceRouteWidth:ACCESSIBLE_ROUTE_WIDTH,
  referenceDoorWidth:ACCESSIBLE_DOOR_WIDTH,
  turningDiameter:TURNING_DIAMETER,
  checkedRooms:publicRooms.length,checkedDoors,issues};
}
