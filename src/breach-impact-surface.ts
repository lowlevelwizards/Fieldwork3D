/** V12: surface provenance is captured only for committed rays.
 * Coordinates are in the tactical x/z plane; elevation is world y.
 * No visual raycasts or changes to ballistic hit authority. */
import type {Pt,Segment,Door,Obstacle} from './breach-core.ts';
import {doorProportions,DOOR_LEAF_VISUAL_HEIGHT,WALL_VISUAL_HEIGHT} from './breach-door-proportions.ts';
import {coverHeight} from './breach-cover-height.ts';
export type SurfaceAttachment={
 kind:'wall'|'door'|'cover'|'window';
 index:number;ownerId?:string;
 // Unit normal (world x,y,z) at committed impact.
 nx:number;ny:number;nz:number;
 // Segment distance and face sign; cover uses local x/z offset instead.
 along:number;face:number;localX:number;localZ:number;localY:number;
};
export type SurfaceMarkPose={x:number;y:number;z:number;nx:number;ny:number;nz:number;radius:number};
export function segmentAttachment(kind:'wall'|'door'|'window',index:number,
 ownerId:string|undefined,segment:Segment,from:Pt,to:Pt,fraction:number,height:number,
 door?:Door):SurfaceAttachment|undefined{
 const dx=segment.b.x-segment.a.x,dz=segment.b.y-segment.a.y,len=Math.hypot(dx,dz);
 if(len<1e-6||!Number.isFinite(height))return;
 const tx=dx/len,tz=dz/len;
 const face=(-tz*(to.x-from.x)+tx*(to.y-from.y))>0?-1:1;
 const x=from.x+(to.x-from.x)*fraction,z=from.y+(to.y-from.y)*fraction;
 const along=Math.max(0,Math.min(len,(x-segment.a.x)*tx+(z-segment.a.y)*tz));
 let localX=along,localY=height,localZ=face;
 if(door){
  const full=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
  if(door.kind==='sliding'||door.kind==='shutter')localX=along-full/2;
  else if(door.hinge==='b'){localX=-along;localZ=-face;}
  if(door.kind==='shutter')localY-=37*(door.openFraction??(door.open?1:0));
 }
 return {kind,index,ownerId,nx:-tz*face,ny:0,nz:tx*face,along,face,localX,localZ,localY};
}
export function coverAttachment(index:number,box:Obstacle,from:Pt,to:Pt,fraction:number,height:number):SurfaceAttachment|undefined{
 const x=from.x+(to.x-from.x)*fraction-box.x,z=from.y+(to.y-from.y)*fraction-box.y;
 const top=coverHeight(box),eps=.0001;
 let nx=0,ny=0,nz=0;
 if(Math.abs(height-top)<eps)ny=1;
 else if(Math.abs(Math.abs(x)-box.w/2)<eps)nx=Math.sign(x);
 else if(Math.abs(Math.abs(z)-box.h/2)<eps)nz=Math.sign(z);
 else return; // ray originated inside collider: no authoritative exposed face
 return {kind:'cover',index,ownerId:box.id,nx,ny,nz,along:0,face:1,localX:x,localZ:z,localY:height};
}
/** Wall renderer uses 9-unit bodies, with skirting up to y=4. */
export function wallMarkPose(ref:SurfaceAttachment,wall:Segment,radius=3.2):SurfaceMarkPose|null{
 if(ref.kind!=='wall')return null;
 const dx=wall.b.x-wall.a.x,dz=wall.b.y-wall.a.y,len=Math.hypot(dx,dz),y=ref.localY;
 if(!Number.isFinite(len)||len<1e-6||!Number.isFinite(y)||!Number.isFinite(ref.along)||Math.abs(ref.face)!==1)return null;
 const r=Math.min(radius,ref.along-.2,len-ref.along-.2,y-4.1,WALL_VISUAL_HEIGHT-y-.2);
 if(r<.5)return null;
 const nx=-dz/len*ref.face,nz=dx/len*ref.face;
 return {x:wall.a.x+dx/len*ref.along+nx*4.65,y,z:wall.a.y+dz/len*ref.along+nz*4.65,nx,ny:0,nz,radius:r};
}
/** Render-local leaf coordinates; caller uses the actual interpolated mesh transform. */
export function doorMarkLocalPose(ref:SurfaceAttachment,door:Door,radius=3.2):SurfaceMarkPose|null{
 if(ref.kind!=='door'||ref.ownerId!==door.id||['glazed','french','screen','mesh-gate','louvered'].includes(door.style??''))return null;
 const len=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
 const left=door.kind==='sliding'||door.kind==='shutter'?-len/2:door.hinge==='b'?-len:0;
 const right=door.kind==='sliding'||door.kind==='shutter'?len/2:door.hinge==='b'?0:len;
 const x=ref.localX,y=ref.localY,face=ref.localZ;
 if(![x,y,len].every(Number.isFinite)||Math.abs(face)!==1)return null;
 const r=Math.min(radius,x-left-3,right-x-3,y-1,DOOR_LEAF_VISUAL_HEIGHT-y-1);
 if(r<.5)return null;
 const half=door.kind==='shutter'?2:doorProportions(door).leafThickness/2;
 return {x,y,z:face*(half+.22),nx:0,ny:0,nz:face,radius:r};
}
/** Legacy nonblood marks without provenance cannot be safely attached.
 * Explicit low dust marks are the only compatible environmental fallback. */
export function isGroundImpactMark(mark:{surface?:string;height?:number;shotId?:number;surfaceRef?:SurfaceAttachment}):boolean{
 return mark.surface==='blood'||(!mark.surfaceRef&&mark.shotId===undefined&&mark.surface==='dust'&&mark.height!==undefined&&mark.height<=1);
}
