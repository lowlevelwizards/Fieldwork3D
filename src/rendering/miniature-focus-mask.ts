/** MF-2: stable screen-space focus mask, never based on hidden intel. */
export type FocusPoint={x:number;y:number};
export type FocusRect={left:number;top:number;right:number;bottom:number};
const finite=(v:number)=>Number.isFinite(v);
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function smoothstep(a:number,b:number,x:number):number{
  const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);
}
/** Projected corner positions use CSS pixels. Null means fail closed. */
export function miniatureProtectedRect(points:readonly FocusPoint[],
  width:number,height:number,marginCss=24):FocusRect|null{
  if(!points.length||!finite(width)||!finite(height)||width<=0||height<=0||
      !finite(marginCss)||marginCss<0)return null;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const p of points){
    if(!finite(p.x)||!finite(p.y))return null;
    left=Math.min(left,p.x);right=Math.max(right,p.x);
    top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);
  }
  return {left:clamp(left-marginCss,0,width),
    right:clamp(right+marginCss,0,width),
    top:clamp(top-marginCss,0,height),
    bottom:clamp(bottom+marginCss,0,height)};
}
export function miniatureRegionFullyProtected(
 rect:FocusRect,width:number,height:number):boolean{
 return rect.left<=0&&rect.top<=0&&rect.right>=width&&rect.bottom>=height;
}
/** Unmoving focus window. Critical visible people are protected separately
 * by screen-space anchors. Unlike map-bounds masks this cannot change
 * coverage when the camera translates or site bounds reach off-screen.
 */
export function miniatureStableFocusRect(width:number,height:number):FocusRect|null{
 if(!finite(width)||!finite(height)||width<=0||height<=0)return null;
 return {left:width*.18,top:height*.18,
   right:width*.82,bottom:height*.82};
}
/** Same static geometry as the GPU mask; no actor context is needed here. */
export function miniatureFocusEligibility(x:number,y:number,width:number,
 height:number,protectedRect:FocusRect,transitionCss=12):number{
 if(!finite(x)||!finite(y)||width<=0||height<=0)return 0;
 const nx=Math.abs(2*x/width-1),ny=Math.abs(2*y/height-1);
 const peripheral=Math.max(smoothstep(.58,.97,nx),smoothstep(.58,.97,ny));
 const dx=Math.max(protectedRect.left-x,0,x-protectedRect.right);
 const dy=Math.max(protectedRect.top-y,0,y-protectedRect.bottom);
 const dist=Math.hypot(dx,dy);
 return peripheral*smoothstep(0,Math.max(1,transitionCss),dist);
}
