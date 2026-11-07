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
 gripShiftX:-3.10,gripDepthZ:2.08,
 magwellCenterX:1.0,magazineWidthX:3.38,magazineDepthZ:1.83,
 magazineTopY:-2.15,magwellTopY:-1.1,magwellBottomY:-2.8,
 portX:1.0,portY:.72,portWidthX:3.28,portHeightY:1.38
};
export const HK_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-4.20,gripDepthZ:2.16,
 magwellCenterX:1.55,magazineWidthX:3.54,magazineDepthZ:2.08,
 magazineTopY:-2.70,magwellTopY:-2.08,magwellBottomY:-3.07,
 portX:1.55,portY:.55,portWidthX:4.00,portHeightY:1.15
};
export const AK_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-2.05,gripDepthZ:2.19,
 magwellCenterX:.95,magazineWidthX:3.05,magazineDepthZ:2.2,
 magazineTopY:-2.1,magwellTopY:-1.16,magwellBottomY:-2.6,
 portX:.95,portY:.15,portWidthX:3.18,portHeightY:1.24
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
