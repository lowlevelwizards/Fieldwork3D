/** ST2: versioned public frontage plan. Pure shadow planner initially;
 * no default generator change until parking and pedestrian integration.
 * All rectangles use actual world coordinates; nominal lanes never shrink.
 */
import type {Site} from '../breach-site.ts';
import type {PublicStreet,StreetRect} from './public-street-layout.ts';
import {STREET_DIMENSIONS as D,STREET_SECTIONS,streetKindFor,type StreetKind} from './street-standards.ts';
type Entry='north'|'south'|'east'|'west';
export type StreetInfrastructure=Readonly<{
 version:1;kind:StreetKind;entry:Entry;axis:'x'|'y';
 nominalLaneWidth:number;nominalLanes:1|2;visibleRoadWidth:number;
 cropped:boolean;completeLanes:number;frontage:PublicStreet;
 verge:StreetRect|null;shoulder:StreetRect|null;privateEdge:number;
 privateReserve:number;accessConnection:StreetRect|null;
 centerline:StreetRect|null;diagnostics:readonly string[];
}>;
export function proposeStreetInfrastructure(site:Site,override?:StreetKind,privateReserve:number=D.propertyAccess):StreetInfrastructure|null{
 const b=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 if(!site.rooms.length)return null;
 const entry=site.entrySide??'south',axis=entry==='north'||entry==='south'?'x':'y';
 const sign=entry==='south'||entry==='east'?1:-1;
 const facade=entry==='south'?Math.max(...site.rooms.map(r=>r.y+r.h)):entry==='north'?Math.min(...site.rooms.map(r=>r.y)):entry==='east'?Math.max(...site.rooms.map(r=>r.x+r.w)):Math.min(...site.rooms.map(r=>r.x));
 const border=entry==='south'?b.maxY:entry==='north'?b.minY:entry==='east'?b.maxX:b.minX;
 const start=axis==='x'?b.minX:b.minY,end=axis==='x'?b.maxX:b.maxY,span=end-start;
 const gap=(border-facade)*sign;
 const reserve=Math.max(D.propertyAccess,privateReserve);
 if(span<60||gap<reserve+18)return null;
 const kind=override??streetKindFor(site.archetype,site.seed),spec=STREET_SECTIONS[kind];
 const nominal=spec.lanes*spec.laneWidth;
 // Protect a real private approach. Sidewalk first, then visible road,
 // optional furnishing verge only if a whole useful strip fits.
 const available=gap-reserve;
 const sidewalkWidth=spec.sidewalkWidth&&available>=D.sidewalk.min+D.curb+18?
  Math.min(spec.sidewalkWidth,available-D.curb-18):0;
 const curbWidth=sidewalkWidth?D.curb:0;
 const shoulderWidth=spec.shoulderWidth&&available>=spec.shoulderWidth+18?spec.shoulderWidth:0;
 const roadWidth=Math.min(nominal,available-sidewalkWidth-curbWidth-shoulderWidth);
 if(roadWidth<18)return null;
 const vergeWidth=available-roadWidth-sidewalkWidth-curbWidth-shoulderWidth>=spec.vergeWidth?spec.vergeWidth:0;
 const mid=(start+end)/2;
 const rect=(along:number,length:number,inner:number,thickness:number):StreetRect=>axis==='x'?
  {x:along,y:border-sign*(inner+thickness/2),width:length,depth:thickness}:
  {x:border-sign*(inner+thickness/2),y:along,width:thickness,depth:length};
 const road=rect(mid,span,0,roadWidth);
 const shoulder=shoulderWidth?rect(mid,span,roadWidth,shoulderWidth):null;
 const curbAt=roadWidth+shoulderWidth;
 const sidewalkAt=curbAt+curbWidth;
 const sidewalk=sidewalkWidth?rect(mid,span,sidewalkAt,sidewalkWidth):null;
 const vergeAt=sidewalkAt+sidewalkWidth;
 const verge=vergeWidth?rect(mid,span,vergeAt,vergeWidth):null;
 const front=site.doors.find(d=>d.id==='FRONT');
 const entrance=front?(front.a[axis]+front.b[axis])/2:site.entrance[axis];
 const alongAt=Math.min(end-16,Math.max(start+16,entrance));
 const privateDepth=vergeAt+vergeWidth;
 // Connect the actual sidewalk inner edge to the facade, crossing any
 // grass verge rather than ending the walkway in grass.
 const walkStart=sidewalk?vergeAt:privateDepth;
 const approachDepth=gap-walkStart-4;
 const approach=approachDepth>0?rect(alongAt,D.pedestrianClear,walkStart,approachDepth):null;
 const curb:StreetRect[]=[],sidewalkPieces:StreetRect[]=[];
 let curbRamp:StreetRect|null=null,accessConnection:StreetRect|null=null;
 const domestic=site.exteriorZones?.find(z=>z.vehicleParking?.role==='residential')?.vehicleParking;
 const parking=site.exteriorZones?.find(z=>z.id==='arrival-forecourt')?.vehicleParking;
 const cutWidth=domestic?D.driveway.single:parking?.access?.width??(parking?.role==='loading'?D.industrialAccess:parking?D.curbCutMin:0);
 const cutAt=domestic?.alongCenter??parking?.access?.alongCenter??alongAt;
 const left=cutAt-cutWidth/2-start,right=end-(cutAt+cutWidth/2);
 if(sidewalk){
  if(cutWidth&&left>=12&&right>=12){
   curb.push(rect(start+left/2,left,curbAt,curbWidth),rect(end-right/2,right,curbAt,curbWidth));
   sidewalkPieces.push(rect(start+left/2,left,sidewalkAt,sidewalkWidth),rect(end-right/2,right,sidewalkAt,sidewalkWidth));
   curbRamp=rect(cutAt,cutWidth,curbAt,curbWidth+sidewalkWidth);
  }else{curb.push(rect(mid,span,curbAt,curbWidth));sidewalkPieces.push(sidewalk);}
 }
 // Near lane is adjacent to the curb. A centerline exists only if the
 // nominal boundary between lanes is actually visible inside the crop.
 const centerline=spec.lanes===2&&roadWidth>spec.laneWidth+D.paintWidth?
  rect(mid,span,roadWidth-spec.laneWidth-D.paintWidth/2,D.paintWidth):null;
 const cropped=roadWidth<nominal;
 const diagnostics:string[]=[];
 if(cropped)diagnostics.push('cropped-carriageway');
 if(!sidewalk&&spec.sidewalkWidth)diagnostics.push('no-space-for-sidewalk');
 if(vergeWidth<spec.vergeWidth)diagnostics.push('verge-omitted');
 if(cutWidth&&!curbRamp&&sidewalk)diagnostics.push('curb-cut-omitted');
 if(cutWidth&&left>=12&&right>=12&&(curbRamp||!sidewalk)){
  const begin=sidewalk?vergeAt:roadWidth;
  const depth=privateDepth-begin+6;
  if(depth>0)accessConnection=rect(cutAt,cutWidth,begin,depth);
 }
 return {version:1,kind,entry,axis,nominalLaneWidth:spec.laneWidth,nominalLanes:spec.lanes,
  visibleRoadWidth:roadWidth,cropped,completeLanes:Math.floor(roadWidth/spec.laneWidth),
  frontage:{road,sidewalk,sidewalkPieces,approach,curb,curbRamp,entry},
  verge,shoulder,privateEdge:border-sign*privateDepth,privateReserve:reserve,accessConnection,centerline,diagnostics};
}
/** Existing physical props are never deleted by the shadow planner. */
export function streetConflicts(site:Site,plan:StreetInfrastructure):string[]{
 const regions=[plan.frontage.road,plan.frontage.sidewalk,plan.shoulder,plan.verge].filter((r):r is StreetRect=>!!r);
 const intersects=(r:StreetRect,c:{x:number;y:number;w:number;h:number})=>
  Math.abs(r.x-c.x)<(r.width+c.w)/2&&Math.abs(r.y-c.y)<(r.depth+c.h)/2;
 return site.cover.filter(c=>regions.some(r=>intersects(r,c))).map((c,i)=>c.id??(c.fixture??'cover')+':'+i);
}
