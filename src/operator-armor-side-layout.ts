/** R5 orthogonal armor side envelope.
 * Design intent: a single torso-parallel slab, plus one front and one rear
 * plate-parallel return; no bent mesh strip, free prongs, or pipe-like rails.
 * Exposes pure measurable placement data for the Lab's fit regression tests.
 */
import {armorContactSpan,ARMOR_PANEL_DEPTHS,
 type ArmorFitSurfaces} from './operator-uniform-fit-envelope.ts';
import type {ArmorProportion} from './operator-armor-proportions.ts';

export type ArmorSideLayout={
 centerZ:number;frontX:number;backX:number;
 plateEdgeZ:number;sideHalfThickness:number;returnThickness:number;
 sideY:number;bandHeight:number;frontReturnLength:number;
 /** Uniform surface at the same heights used to author this panel. */
 garmentSide:number;
};
/** One rectangular side slab, with two perpendicular straight returns.
 * All dimensions and clearances are derived once per selected garment.
 * The side panel is kept as close to the actual outer fabric as possible,
 * including flak's longer skirt and upper arms' fuller blouse shoulders.
 */
export function armorSideLayout(fit:ArmorFitSurfaces,
 spec:ArmorProportion,sideY=spec.sideY,
 bandHeight=spec.sideHeight):ArmorSideLayout{
 const lowY=sideY-bandHeight*.5,highY=sideY+bandHeight*.5;
 const garmentSide=armorContactSpan(fit.top,lowY,highY).side;
 const sideHalfThickness=spec.sideThickness*.5;
 // Reference the actual local garment surface, NOT an oversized
 // fit.side floor. The inner face rides .12 away from compressed cloth.
 const centerZ=garmentSide+sideHalfThickness+.12;
 const depth=ARMOR_PANEL_DEPTHS[fit.style]??1.2;
 const frontX=fit.front-depth*.47;
 const backX=fit.back+depth*.47;
 const plateEdgeZ=spec.width*.50-.34;
 const returnThickness=Math.max(.48,Math.min(.76,spec.sideThickness*.84));
 return {
  centerZ,frontX,backX,plateEdgeZ,sideHalfThickness,
  returnThickness,sideY,bandHeight,
  frontReturnLength:centerZ-plateEdgeZ,
  garmentSide
 };
}
