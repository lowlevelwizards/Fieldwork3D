/** FNC P15 structural art envelope; retains P13 alias for existing integrations.
 * One authoritative source for interdependent handguard, gas cover,
 * handstop, groove, and sight placements. Local game-art units ONLY.
 * Existing FNC_P1 world anchors, contact zones and part IDs are untouched.
 * No allocations in the render loop.
 */
export const FNC_FRONT_P13=Object.freeze({
 receiver:Object.freeze({frontX:2.75,roofY:1.60,gripForwardX:.90}),
 barrel:Object.freeze({axisY:0}),
 polymer:Object.freeze({
  startX:2.45,fullStartX:3.35,fullEndX:10.10,endX:10.70,
  fullScale:1.065,endScale:.98,
  pivotY:-1.11,heightScale:1.30,liftY:.38,
  grooveStartX:4.49,grooveEndX:10.05,
  grooveYs:Object.freeze([-.81,-1.53])
 }),
 gas:Object.freeze({
  startX:2.55,endX:13.95,
  bottomY:-.45,shoulderY:.35,topY:1.52,
  bottomHalfZ:.50,sideHalfZ:.68,roofHalfZ:.52,
  ventFirstX:3.65,ventPitch:2.05,ventLength:1.06,
  ventCount:5,ventSideYs:Object.freeze([.82,1.15]),
  ventHeight:.155,ventOffset:.055,ventRoofHalfZ:.25
 }),
 handstop:Object.freeze({
  centerX:10.54,length:.55,
  rearScale:1.13,frontScale:1.07
 }),
 sight:Object.freeze({
  baseStartX:12.40,baseShoulderX:12.90,
  baseFlatStartX:13.35,baseEndX:15.15,
  baseBottomY:-.55,baseRearTopY:1.52,
  baseTopY:1.48,baseDepth:1.76,
  earX:14.26,earY:1.95,
  earHalfSpacing:.68,earLength:.82,earHeight:1.30,earDepth:.76
 })
});
