/** FT1.9B — original Bundeswehr G36, exterior game-art landmark contract.
 * Authoritative for the isolated blockout; NOT yet registered as a live weapon.
 * +X muzzle, +Y up, +Z right, all numbers are model-art units (not firearms engineering).
 */
export const G36_B_ART=Object.freeze({
 stockRearX:-15.05,stockHingeX:-6.80,
 receiverRearX:-6.80,receiverFrontX:4.00,
 receiverRoofY:1.50,receiverLowerY:-3.35,
 handguardRearX:3.75,handguardFullStartX:4.15,handguardFrontX:13.45,
 magazineCenterX:.45,magazineTopY:-2.85,magazineBottomY:-8.05,
 barrelAxisY:0,barrelStartX:13.05,muzzleX:19.50,
 handleTopY:3.93,opticTopY:5.60
});
export type G36BPoint=readonly [number,number];
