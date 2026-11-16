/** FNC P29 proportion correction. P13 alias retained.
 * One authoritative source for interdependent handguard, gas cover,
 * handstop, groove, and sight placements. Local game-art units ONLY.
 * Existing FNC_P1 world anchors and part IDs are untouched.
 * Support-hand art contacts derive from the exposed polymer extents.
 * No allocations in the render loop.
 */
export const FNC_FRONT_P13=Object.freeze({
 receiver:Object.freeze({frontX:2.75,roofY:1.50,gripForwardX:.90,
  seamFrontX:2.68,magwellRearX:-1.58,magwellFrontX:2.45,
  magwellRearBottomY:-3.46,magwellFrontBottomY:-3.32,
  magazineCenterX:.45,magazineTopY:-2.81}),
 barrel:Object.freeze({axisY:0}),
 polymer:Object.freeze({
  startX:3.25,fullStartX:3.80,fullEndX:10.85,endX:11.68,
  fullScale:1.065,endScale:.98,
  pivotY:-1.11,heightScale:1.20,liftY:.38,lowerFlare:.23,
  grooveStartX:4.10,grooveEndX:10.97,
  grooveYs:Object.freeze([-.81,-1.53])
 }),
 gas:Object.freeze({
  startX:1.95,endX:15.10,
  lowerStartX:10.85,lowerFullX:11.80,
  transitionStartX:12.65,transitionEndX:12.96,
  bottomY:-.60,frontBottomY:-1.10,shoulderY:.48,topY:1.50,
  bottomHalfZ:.58,sideHalfZ:.80,roofHalfZ:.62,
  lowerLines:Object.freeze([
   // The front gas-block markings form one vertically stacked pair,
   // sharing the same X span on the exposed casting (12.65..15.10).
   // Keep the 1.57 x .31 footprint and P27 vertical alignment intact.
   Object.freeze({startX:13.05,endX:14.62,y:1.17,shade:145}),
   Object.freeze({startX:13.05,endX:14.62,y:-.34,shade:171})
  ]),
  ventFirstX:3.60,ventPitch:2.35,ventLength:1.57,
  ventCount:4,ventSideYs:Object.freeze([1.17]),
  // All visible gas markings share the same 0.31-unit cross-face stroke.
  ventHeight:.31,ventOffset:.055,ventRoofHalfZ:.155
 }),
 handstop:Object.freeze({
  centerX:11.35,length:.88,
  rearScale:1.20,frontScale:1.11
 }),
 sight:Object.freeze({
  baseStartX:12.65,baseShoulderX:12.96,
  baseFlatStartX:13.40,baseEndX:15.10,
  baseBottomY:-.58,baseRearTopY:1.50,
  baseTopY:1.38,baseDepth:1.76,
  earX:14.26,earBottomY:1.33,earShoulderY:2.18,earTopY:2.42,
  earHalfSpacing:.65,earLength:.82,earDepth:.76
 }),
 muzzle:Object.freeze({centerX:18.51,length:1.98,
  radius:1.03,slotFirstX:17.90,slotPitch:.65,slotLength:.36,
  slotHalfHeight:.19})
});
