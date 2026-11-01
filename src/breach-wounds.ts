/** 132: compact authoritative wound/collapse facts.
 * Shot metadata, not renderer RNG, selects the visual pose family.
 */
export type WoundRegion='torso'|'head'|'arm'|'leg';
export type FallPose='forward'|'back'|'left'|'right'|'slump';
export const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
export function hitRegion(shotId:number):WoundRegion{
  // Mostly torso; coarse regions until height-aware hitboxes are available.
  const hash=(Math.imul(shotId+1,2654435761)>>>0)/4294967296;
  return hash<.60?'torso':hash<.69?'head':hash<.85?'arm':'leg';
}
export function chooseFall(heading:number,shotYaw:number,
  supported:boolean=false):FallPose{
  const relative=wrap(shotYaw-heading);
  const front=Math.cos(relative),side=Math.sin(relative);
  if(supported&&front<-.12)return 'slump';
  if(front>.55)return 'forward';
  if(front<-.55)return 'back';
  return side>0?'right':'left';
}
export function fallAngles(pose:FallPose,progress:number){
 const t=Math.max(0,Math.min(1,progress));
 const eased=t*t*(3-2*t);
 const x=pose==='forward'?-1.52:
   pose==='back'?1.52:pose==='slump'?-.72:0;
 const z=pose==='left'?1.49:pose==='right'?-1.49:0;
 return {x:x*eased,z:z*eased,
   y:pose==='slump'?-1.5*eased:3.9*eased};
}
export function hitStagger(region:WoundRegion,hitYaw:number,
  heading:number,age:number,severity:number){
 const phase=Math.max(0,Math.min(1,age/.5));
 const pulse=Math.sin(Math.PI*phase)*(1-phase*.35)*
   Math.max(0,Math.min(2,severity));
 const side=Math.sin(wrap(hitYaw-heading));
 const front=Math.cos(wrap(hitYaw-heading));
 return {forward:front*pulse*(region==='torso'?.13:.07),
   side:side*pulse*(region==='leg'?.17:.11),
   brace:region==='leg'?pulse*.7:0};
}
