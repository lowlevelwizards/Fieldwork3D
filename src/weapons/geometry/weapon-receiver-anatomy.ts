/** Shared visual placement contract for the stylized receiver anatomy.
 * All values describe REPRESENTATIONAL EXTERIOR GAME ART only.
 * Combat, hand contacts, firing and inventory remain independently authored.
 * The narrow insert region is intentionally behind the front handguard.
 */
export type VisualAnatomy={
 gripShiftX:number;
 magwellCenterX:number;
 magazineTopY:number;
 magwellTopY:number;
 magwellBottomY:number;
};
export const AR_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-.75,magwellCenterX:1.05,magazineTopY:-2.15,
 magwellTopY:-1.1,magwellBottomY:-2.75
};
export const AK_VISUAL_ANATOMY:Readonly<VisualAnatomy>={
 gripShiftX:-.6,magwellCenterX:1.05,magazineTopY:-2.1,
 magwellTopY:-1.16,magwellBottomY:-2.55
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
