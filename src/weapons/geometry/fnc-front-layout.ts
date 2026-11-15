/** FNC P14 art-only front assembly alignment (retains P13 public contract).
 * One authoritative source for interdependent handguard, gas cover,
 * handstop, groove, and sight placements. Local game-art units ONLY.
 * Existing FNC_P1 world anchors, contact zones and part IDs are untouched.
 * No allocations in the render loop.
 */
export const FNC_FRONT_P13=Object.freeze({
 polymer:Object.freeze({
  startX:3.00,fullStartX:3.96,fullEndX:10.10,endX:10.70,
  fullScale:1.065,endScale:.98,
  grooveStartX:4.49,grooveEndX:10.05,
  grooveYs:Object.freeze([-.81,-1.53])
 }),
 gas:Object.freeze({
  startX:5.05,endX:13.95,
  bottomY:-.74,shoulderY:-.28,topY:.30,
  bottomHalfZ:.50,sideHalfZ:.68,roofHalfZ:.52,
  ventFirstX:5.56,ventPitch:1.46,ventLength:1.00,
  ventCount:5,ventSideYs:Object.freeze([-.005,.155]),
  ventHeight:.155,ventOffset:.055,ventRoofHalfZ:.25
 }),
 handstop:Object.freeze({
  centerX:10.54,length:.55,
  rearScale:1.13,frontScale:1.07
 }),
 sight:Object.freeze({
  baseStartX:12.40,baseShoulderX:12.90,
  baseFlatStartX:13.35,baseEndX:15.15,
  baseBottomY:-.42,baseRearTopY:.31,
  baseTopY:.83,baseDepth:1.76,
  earX:14.26,earY:1.50,
  earHalfSpacing:.68,earLength:.82,earHeight:1.63,earDepth:.76
 })
});
