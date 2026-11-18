/** Original full-length G36 production art landmark contract.
 * +X muzzle, +Y up, +Z depth. Visual art units, not fabrication dimensions.
 * Keep animation/contact datums synchronized if any joint or sight origin moves.
 */
export const G36_B_ART=Object.freeze({
 stockRearX:-15.05,stockHingeX:-6.80,
 receiverRearX:-6.80,receiverFrontX:4.00,
 receiverRoofY:1.64,receiverLowerY:-3.60,
 handguardRearX:3.75,handguardFullStartX:4.15,handguardFrontX:13.45,
 magazineCenterX:.45,magazineTopY:-2.62,magazineBottomY:-8.24,
 barrelAxisY:0,barrelStartX:13.05,muzzleX:19.50,
 // D1 measured against production M16A2: scale 1.00 => 99.35% of M16 length.
 displayLongitudinalScale:1.00,
 handleTopY:4.05,opticTopY:5.03,
 frontStockOpeningX:-8.15,triggerVoidX:-2.28
});
export type G36BPoint=readonly [number,number];
