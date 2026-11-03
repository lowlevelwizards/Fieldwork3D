/** R6 geometry-owned vest shoulder landing anchors.
 * Both edges of the full-width webbing must terminate within the actual
 * chamfered plate profile, not merely at its old bounding box.
 * All measurements are authored chest-local game units (+X forward).
 */
import type {ArmorProportion} from './operator-armor-proportions.ts';
import type {ArmorFitSurfaces} from './operator-uniform-fit-envelope.ts';

export function plateHalfWidthAt(spec:ArmorProportion,y:number,rear=false){
 const width=rear?spec.rearWidth:spec.width;
 const half=width*.5;
 const breakY=Math.max(spec.bottom+1.6,spec.top-2.25);
 if(y<=breakY)return half;
 const t=Math.min(1,Math.max(0,(y-breakY)/(spec.top-breakY)));
 return half-spec.upperInset*t;
}
export type ArmorStrapLanding={
 frontX:number;frontY:number;frontZ:number;
 rearX:number;rearY:number;rearZ:number;
 shoulderZ:number;shoulderY:number;
 /** Distances to the plate's bounding edge after including strap width. */
 frontMargin:number;rearMargin:number;
};
/** The front branches on JPC-style carriers are wider apart but still
 * completely enclosed within the face of the plate bag. Padding is
 * intentionally broad; no micro-buckles are needed to hide attachment gaps.
 */
export function armorStrapLanding(fit:ArmorFitSurfaces,
 spec:ArmorProportion):ArmorStrapLanding{
 const frontY=spec.top-spec.strapDrop;
 const rearY=spec.top-.2-spec.strapDrop;
 const branch=spec.family==='skeleton'?.63:0;
 const branchWidth=spec.family==='skeleton'?.96:spec.shoulderWidth;
 const maxFront=plateHalfWidthAt(spec,frontY)-branchWidth*.5-branch-.22;
 const maxRear=plateHalfWidthAt(spec,rearY,true)-spec.shoulderWidth*.5-.20;
 const frontZ=Math.max(1.8,Math.min(3.15,maxFront));
 const rearZ=Math.max(1.8,Math.min(3.15,maxRear));
 const frontMargin=plateHalfWidthAt(spec,frontY)-
  (frontZ+branch+branchWidth*.5);
 const rearMargin=plateHalfWidthAt(spec,rearY,true)-
  (rearZ+spec.shoulderWidth*.5);
 return {
  // Embedded slightly into the plate surface, not hovering above it.
  frontX:fit.front-.17,frontY,frontZ,
  rearX:fit.back+.17,rearY,rearZ,
  shoulderZ:Math.min(5.12,Math.max(3.60,fit.shoulderZ)),
  shoulderY:fit.shoulderY,
  frontMargin,rearMargin
 };
}
