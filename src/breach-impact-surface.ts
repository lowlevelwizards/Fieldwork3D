/** V12: surface provenance is captured only for committed rays.
 * Coordinates are in the tactical x/z plane; elevation is world y.
 * No visual raycasts or changes to ballistic hit authority. */
import type {Pt,Segment,Door,Obstacle} from './breach-core.ts';
import {doorProportions,DOOR_LEAF_VISUAL_HEIGHT,WALL_VISUAL_HEIGHT} from './breach-door-proportions.ts';
import {coverHeight} from './breach-cover-height.ts';
import {targetVisualPanels} from './worldgen/target-visual-panels.ts';
import {propDefinition} from './worldgen/asset-catalog.ts';
import type {WindowState} from './breach-windows.ts';
import {windowVisualHeadHeight} from './breach-opening-proportions.ts';
export type SurfaceAttachment={
 kind:'wall'|'door'|'cover'|'window';
 index:number;ownerId?:string;
 // Unit normal (world x,y,z) at committed impact.
 nx:number;ny:number;nz:number;
 // Segment distance and face sign; cover uses local x/z offset instead.
 along:number;face:number;localX:number;localZ:number;localY:number;
 // Capture the collider dimensions at impact, not at playback time.
 coverW?:number;coverD?:number;coverTurn?:number;coverToppled?:boolean;
};
export type SurfaceMarkPose={x:number;y:number;z:number;nx:number;ny:number;nz:number;radius:number};
/** Transparent opening fractures are readable from either side; opaque
 * impacts retain the original struck-face requirement. */
export function surfaceMarkFacesCamera(surface:string|undefined,ref:SurfaceAttachment|undefined,dot:number):boolean{
 return dot>0||(surface==='glass'&&(ref?.kind==='window'||ref?.kind==='door'));
}
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
 return {kind:'cover',index,ownerId:box.id,nx,ny,nz,along:0,face:1,localX:x,localZ:z,localY:height,coverW:box.w,coverD:box.h,coverTurn:box.orientation??0,coverToppled:!!box.toppled};
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
 if(ref.kind!=='door'||ref.ownerId!==door.id||['screen','mesh-gate','louvered'].includes(door.style??''))return null;
 const len=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
 const left=door.kind==='sliding'||door.kind==='shutter'?-len/2:door.hinge==='b'?-len:0;
 const right=door.kind==='sliding'||door.kind==='shutter'?len/2:door.hinge==='b'?0:len;
 const x=ref.localX,y=ref.localY,face=ref.localZ;
 if(![x,y,len].every(Number.isFinite)||Math.abs(face)!==1)return null;
 if(door.style==='glazed'||door.style==='french'){
  if(door.glassShattered)return null;
  const middle=(left+right)/2;
  let r=Math.min(radius,x-left-4,right-x-4,y-4,DOOR_LEAF_VISUAL_HEIGHT-y-4);
  if(door.style==='french')r=Math.min(r,Math.abs(x-middle)-1.2,Math.abs(y-15)-1.2,Math.abs(y-32)-1.2);
  if(r<.5)return null;
  return {x,y,z:face*.66,nx:0,ny:0,nz:face,radius:r};
 }
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

/** Fixture-local projection of a CONFIRMED owner hit, not another hit query.
 * Only explicitly supported artwork faces receive decals. Bounds remain
 * authoritative for gameplay; they can be larger than the visual panel. */
type Receiver={x:number;y:number;z:number;w:number;h:number;d:number};
function receiverPose(b:Receiver,x:number,y:number,z:number,nx:number,ny:number,nz:number,radius:number):SurfaceMarkPose|null{
 const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
 let r=radius,px=x,py=y,pz=z;
 if(ax===1){r=Math.min(r,b.h/2-Math.abs(y-b.y)-.2,b.d/2-Math.abs(z-b.z)-.2);px=b.x+nx*(b.w/2+.18);}
 else if(ay===1){r=Math.min(r,b.w/2-Math.abs(x-b.x)-.2,b.d/2-Math.abs(z-b.z)-.2);py=b.y+ny*(b.h/2+.18);}
 else if(az===1){r=Math.min(r,b.w/2-Math.abs(x-b.x)-.2,b.h/2-Math.abs(y-b.y)-.2);pz=b.z+nz*(b.d/2+.18);}
 else return null;
 return Number.isFinite(r)&&r>=.5?{x:px,y:py,z:pz,nx,ny,nz,radius:r}:null;
}
export function coverMarkLocalPose(ref:SurfaceAttachment,authored:Obstacle,current:Obstacle,radius=3.2):SurfaceMarkPose|null{
 if(ref.kind!=='cover'||current.destroyed||ref.coverToppled||
   ref.ownerId!==current.id||authored.id!==current.id||authored.fixture!==current.fixture||
   (ref.coverTurn??0)!==(authored.orientation??0))return null;
 const cw=ref.coverW??authored.w,cd=ref.coverD??authored.h;
 if(![cw,cd,authored.w,authored.h,ref.localX,ref.localY,ref.localZ].every(Number.isFinite)||Math.min(cw,cd,authored.w,authored.h)<=0)return null;
 const turn=authored.orientation??0,co=[1,0,-1,0][turn],si=[0,1,0,-1][turn];
 const wx=ref.localX*authored.w/cw,wz=ref.localZ*authored.h/cd;
 const x=co*wx-si*wz,z=si*wx+co*wz,y=ref.localY;
 const nx=co*ref.nx-si*ref.nz,nz=si*ref.nx+co*ref.nz,ny=ref.ny;
 const w=turn%2?authored.h:authored.w,d=turn%2?authored.w:authored.h;
 const fixture=authored.fixture;
 let parts:Receiver[]=[];
 if(fixture==='target-plate'||fixture==='target-no-shoot'){
  // The silhouette is much thinner than its movement collider. A target
  // side/top collision has no reliable face correspondence; omit it.
  if(Math.abs(nz)!==1)return null;
  parts=targetVisualPanels(w,fixture==='target-no-shoot');
 }else if(fixture==='half-wall'||fixture==='support-column'||fixture==='porch-post'){
  // Explicit uninterrupted side bands from the fixture artwork. Exclude
  // trim and cap; top-face hits are not guaranteed to match the collider.
  if(ny!==0)return null;
  const lo=fixture==='half-wall'?2.2:4.2,hi=fixture==='half-wall'?15.5:37;
  parts=[{x:0,y:(lo+hi)/2,z:0,w,h:hi-lo,d}];
 }else if(fixture==='crate'||fixture==='box'||fixture==='product-box'||fixture==='packages'){
  // Core body and known reinforcement bands use the same dimensions as
  // detailed-fixture-visuals. Choose the outermost eligible face.
  const H=propDefinition(fixture)?.height??20;
  parts=[{x:0,y:H*.48,z:0,w:w*.96,h:H*.93,d:d*.96},
    {x:0,y:H*.96,z:0,w,h:.9,d}];
  if(fixture==='crate'){
   for(const sz of [-1,1])for(const sx of [-.32,.32])
    parts.push({x:sx*w,y:H*.51,z:sz*d*.51,w:w*.22,h:H*.72,d:1.4});
   for(const sx of [-1,1])parts.push({x:sx*w*.48,y:H*.51,z:0,w:1.6,h:H*.72,d:d*.8});
  }else{
   parts.push({x:0,y:H*.97,z:0,w:w*.14,h:.7,d},
     {x:0,y:H*.57,z:d*.5,w:w*.47,h:H*.28,d:.7});
   if(fixture==='packages')parts.push({x:w*.22,y:H*.32,z:d*.51,w:w*.13,h:H*.35,d:.9});
  }
 }else return null;
 let best:SurfaceMarkPose|null=null,depth=-Infinity;
 for(const part of parts){
  const pose=receiverPose(part,x,y,z,nx,ny,nz,radius);
  if(!pose)continue;
  const face=pose.x*nx+pose.y*ny+pose.z*nz;
  if(face>depth){best=pose;depth=face;}
 }
 return best;
}
/** Intact authored glazing receives marks between its visible trim bands.
 * Open, broken or treated panes remain fail-closed. */
export function windowMarkPose(ref:SurfaceAttachment,pane:WindowState,radius=2.5):SurfaceMarkPose|null{
 if(ref.kind!=='window'||ref.ownerId!==pane.id||pane.open||pane.shattered||
  (pane.treatment!==undefined&&pane.treatment!=='none'))return null;
 const y=ref.localY,base=pane.sillHeight??14,head=pane.headHeight??windowVisualHeadHeight(pane.style);
 const along=ref.along-pane.width/2;
 let r=Math.min(radius,pane.width/2-1.7-Math.abs(along),y-base-.2,head-y-.2);
 const h=head-base,style=pane.style??'standard';
 // Match the authored pane and keep damage clear of visible mullions.
 if(style==='standard'||style==='bay')r=Math.min(r,Math.abs(y-(base+h*.48))-1.4);
 if(style==='awning')r=Math.min(r,Math.abs(y-(base+h*.5))-.7,head-y-3);
 if(style==='industrial'||style==='wire'||style==='storefront')for(const f of style==='storefront'?[-.25,.25]:[-.28,0,.28])r=Math.min(r,Math.abs(along-f*pane.width)-1);
 if(style==='wire')for(const dy of [4,10,16,22])if(base+dy<head-2)r=Math.min(r,Math.abs(y-base-dy)-.6);
 if(style==='bay')r=Math.min(r,Math.abs(Math.abs(along)-pane.width*.37)-1.4);
 if(!Number.isFinite(r)||r<.5||Math.abs(ref.face)!==1)return null;
 const nx=pane.vertical?-ref.face:0,nz=pane.vertical?0:ref.face;
 return {x:pane.x+(pane.vertical?0:along)+nx*.66,y,z:pane.y+(pane.vertical?along:0)+nz*.66,nx,ny:0,nz,radius:r};
}
