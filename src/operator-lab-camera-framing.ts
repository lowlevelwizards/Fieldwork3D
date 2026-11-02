/** Lab camera fitting for a full-viewport canvas with opaque mobile UI.
 * Keep camera controls orbiting the actual model; shift orthographic framing
 * into the unobstructed interval instead of changing its orbit pivot.
 */
export type LabCameraFraming='full'|'upper'|'head'|'hands'|'knees'|'feet';
export type SafeLabWindow={
 viewportWidth:number;viewportHeight:number;top:number;bottom:number;
};
export function safeLabWindow(viewportWidth:number,viewportHeight:number,
 headerBottom:number,mainTop:number,overlayBottom=0):SafeLabWindow{
 const height=Math.max(1,viewportHeight);
 const top=Math.min(height-60,Math.max(0,headerBottom,overlayBottom)+12);
 const bottom=Math.max(top+60,Math.min(height,mainTop-14));
 return {viewportWidth:Math.max(1,viewportWidth),viewportHeight:height,
  top,bottom};
}
const REFERENCE_HEIGHT:Record<LabCameraFraming,number>={
 full:57,upper:34,head:19,hands:29,knees:32,feet:29
};
const MAX_ZOOM:Record<LabCameraFraming,number>={
 full:.90,upper:1.25,head:1.52,hands:1.05,knees:1.05,feet:1.05
};
/** 36 is the Lab's orthographic half height.
 * 15% margin lets accessories breathe at the bounds of the usable region.
 */
export function safeLabZoom(mode:LabCameraFraming,
 region:SafeLabWindow,halfHeight=36):number{
 const visibleFraction=Math.max(.03,(region.bottom-region.top)/region.viewportHeight);
 const fitted=2*halfHeight*visibleFraction*.83/REFERENCE_HEIGHT[mode];
 return Math.max(.18,Math.min(MAX_ZOOM[mode],fitted));
}
/** With a fixed orbit target at camera-space y=0, place that target at
 * safe (headerBottom..editorTop) pixel midpoint. Orthographic projection
 * shift must be recalculated when zoom changes from a pinch gesture.
 */
export function safeLabProjectionShift(region:SafeLabWindow,
 zoom:number,halfHeight=36):number{
 const mid=(region.top+region.bottom)/2;
 const ndc=1-2*mid/region.viewportHeight;
 return -ndc*halfHeight/Math.max(.01,zoom);
}
