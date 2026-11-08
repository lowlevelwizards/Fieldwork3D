/** A single public street frontage for physical placement and presentation.
 * The original rendering drew a road FROM the front door to the map edge,
 * accidentally turning the pedestrian approach/forecourt into a road.
 * Here the carriageway runs ALONG the public map boundary. The sidewalk,
 * curb and door approach share that same reference frame. This is not a
 * navigation or collision elevation model.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';

type StreetSite=Pick<Site,'entrySide'|'entrance'> &
 Partial<Pick<Site,'bounds'|'rooms'|'doors'|'exteriorZones'>>;
export type StreetRect={x:number;y:number;width:number;depth:number};
export type PublicStreet={
 road:StreetRect;
 sidewalk:StreetRect|null;
 /** Actual sidewalk slabs, split only where a vehicular curb cut slopes. */
 sidewalkPieces:StreetRect[];
 approach:StreetRect|null;
 curb:StreetRect[];
 curbRamp:StreetRect|null;
 entry:'north'|'south'|'east'|'west';
};
const overlap=(a:StreetRect,b:StreetRect,pad=0)=>
 Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&
 Math.abs(a.y-b.y)<(a.depth+b.depth)/2+pad;
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

export function planPublicStreet(site:StreetSite):PublicStreet|null{
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 if(!site.rooms?.length)return null;
 const entry=site.entrySide??'south';
 const vertical=entry==='north'||entry==='south';
 const sign=entry==='south'||entry==='east'?1:-1;
 const facade=entry==='north'?Math.min(...site.rooms.map(r=>r.y)):
  entry==='south'?Math.max(...site.rooms.map(r=>r.y+r.h)):
  entry==='west'?Math.min(...site.rooms.map(r=>r.x)):
  Math.max(...site.rooms.map(r=>r.x+r.w));
 const border=entry==='north'?bounds.minY:entry==='south'?bounds.maxY:
   entry==='west'?bounds.minX:bounds.maxX;
 const setback=(border-facade)*sign;
 if(setback<26)return null; // small properties have no invented street lane
 const alongStart=vertical?bounds.minX:bounds.minY;
 const alongEnd=vertical?bounds.maxX:bounds.maxY;
 const span=Math.max(0,alongEnd-alongStart-12);
 if(span<48)return null;
 const along=(alongStart+alongEnd)/2;
 const roadWidth=clamp(setback*.36,13,38);
 const sidewalkWidth=setback>=49?clamp(setback*.18,10,17):0;
 const roadCenter=border-sign*(roadWidth/2+1);
 const sidewalkCenter=border-sign*(roadWidth+2+sidewalkWidth/2);
 const rect=(a:number,b:number,transverse:number,transSize:number):
    StreetRect=>vertical?
    {x:a,y:transverse,width:b,depth:transSize}:
    {x:transverse,y:a,width:transSize,depth:b};
 const road=rect(along,span,roadCenter,roadWidth);
 const sidewalk=sidewalkWidth>=9?
   rect(along,span,sidewalkCenter,sidewalkWidth):null;
 const front=site.doors?.find(d=>d.id==='FRONT');
 const entrance=front?{x:(front.a.x+front.b.x)/2,
   y:(front.a.y+front.b.y)/2}:site.entrance;
 const center=vertical?entrance.x:entrance.y;
 const alongAt=clamp(center,alongStart+17,alongEnd-17);
 const start=facade+sign*4;
 const end=border-sign*(roadWidth+2+sidewalkWidth+(sidewalk?0:3));
 const spanAccess=(end-start)*sign;
 const approach=spanAccess>5?rect(alongAt,22,
   (start+end)/2,spanAccess):null;
 const curb:StreetRect[]=[];
 const sidewalkPieces:StreetRect[]=[];
 let curbRamp:StreetRect|null=null;
 if(sidewalk){
   const boundary=border-sign*(roadWidth+1.2);
   // A curb is continuous at domestic street fronts; a private vehicular
   // apron / parking entrance gets a single real break, not a crosswalk
   // leading into traffic for no reason.
   const vehicular=['parking','driveway'].includes(
     site.exteriorZones?.find(z=>z.id==='arrival-forecourt')?.kind??'');
   const cut=vehicular?28:0;
   const half=span/2;
   if(cut&&alongAt>along-half+cut&&alongAt<along+half-cut){
     const left=(alongAt-cut/2)-(along-half);
     const right=(along+half)-(alongAt+cut/2);
     if(left>4)curb.push(rect(along-half+left/2,left,boundary,2.6));
     if(right>4)curb.push(rect(alongAt+cut/2+right/2,right,boundary,2.6));
     // Remove the same portion from the flat sidewalk. Otherwise a
     // supposed ramp is buried under a full-height slab during replay.
     if(sidewalk){
       const sidewalkL=vertical?sidewalk.width:sidewalk.depth;
       const stripHalf=sidewalkL/2;
       const leftLength=(alongAt-cut/2)-(along-stripHalf);
       const rightLength=(along+stripHalf)-(alongAt+cut/2);
       if(leftLength>2)sidewalkPieces.push(
         rect(along-stripHalf+leftLength/2,leftLength,
           sidewalkCenter,sidewalkWidth));
       if(rightLength>2)sidewalkPieces.push(
         rect(alongAt+cut/2+rightLength/2,rightLength,
           sidewalkCenter,sidewalkWidth));
     }
     // Full-width ramp reaches from the building-side footway down to the
     // carriageway; only render presentation changes, never motor geometry.
     curbRamp=rect(alongAt,cut,sidewalkCenter+sign*1,
       sidewalkWidth+2);
   }else{
     curb.push(rect(along,span,boundary,2.6));
   }
   if(sidewalk&&!sidewalkPieces.length)sidewalkPieces.push(sidewalk);
 }
 return {road,sidewalk,sidewalkPieces,approach,curb,curbRamp,entry};
}
/** No exterior obstacle may be authored into a public carriageway. For
 * existing replay maps this is not applied retroactively.
 */
export function overlapsPublicStreetRoad(
 site:StreetSite,obstacle:Pick<Obstacle,'x'|'y'|'w'|'h'>):boolean{
 const plan=planPublicStreet(site);
 return !!plan&&overlap(plan.road,{x:obstacle.x,y:obstacle.y,
   width:obstacle.w,depth:obstacle.h},1);
}
