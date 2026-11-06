/** Shared visual placement contract for the stylized receiver anatomy.
 * All values describe REPRESENTATIONAL EXTERIOR GAME ART only.
 * Combat, hand contacts, firing and inventory remain independently authored.
 * The narrow insert region is intentionally behind the front handguard.
 */
/** World axes: X runs stock-to-muzzle and Y is up in side elevation.
 * Z is the weapon's SIDE-TO-SIDE thickness, NOT its magazine silhouette width.
 * Keep visual params separate to stop accidental axis swaps.
 */
export type VisualAnatomy={
 gripShiftX:number;
 gripDepthZ:number;
 magwellCenterX:number;
 magazineWidthX:number;
 magazineDepthZ:number;
 magazineTopY:number;
 magwellTopY:number;
 magwellBottomY:number;
 portX:number;
 portY:number;
 portWidthX:number;
 portHeightY:number;
};
export const AR_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-2.18,gripDepthZ:2.45,
 magwellCenterX:1.0,magazineWidthX:3.05,magazineDepthZ:2.15,
 magazineTopY:-2.15,magwellTopY:-1.1,magwellBottomY:-2.8,
 portX:1.0,portY:.72,portWidthX:2.85,portHeightY:1.38
};
export const AK_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-2.05,gripDepthZ:2.45,
 magwellCenterX:.95,magazineWidthX:3.05,magazineDepthZ:2.2,
 magazineTopY:-2.1,magwellTopY:-1.16,magwellBottomY:-2.6,
 portX:.95,portY:.62,portWidthX:2.5,portHeightY:1.12
};
/** Position a pre-authored polygon without changing its iconic contour. */
export function shiftProfile(points:readonly (readonly [number,number])[],
 dx:number,dy=0):[number,number][]{
 return points.map(([x,y])=>[x+dx,y+dy]);
}
/** Use across all magazine silhouettes to guarantee an identical insertion
 * center irrespective of the selected material/curve style. */
export function magazineTopX(anatomy:VisualAnatomy,halfWidth:number){
 return [anatomy.magwellCenterX-halfWidth,
  anatomy.magwellCenterX+halfWidth] as const;
}
