/** FNC P13 art-only front assembly layout.
 * One authoritative source for interdependent handguard, gas cover,
 * handstop, groove, and sight placements. Local game-art units ONLY.
 * Existing FNC_P1 world anchors, contact zones and part IDs are untouched.
 * No allocations in the render loop.
 */
export const FNC_FRONT_P13=Object.freeze({
 polymer:Object.freeze({
  startX:3.45,fullStartX:4.12,fullEndX:10.10,endX:10.70,
  fullScale:1.065,endScale:.98,
  grooveStartX:4.49,grooveEndX:10.05,
  grooveYs:Object.freeze([-.81,-1.53])
 }),
 gas:Object.freeze({
  startX:5.05,endX:13.95,
  bottomY:-.68,shoulderY:-.22,topY:.40,
  bottomHalfZ:.50,sideHalfZ:.68,roofHalfZ:.52,
  ventFirstX:5.56,ventPitch:1.46,ventLength:1.00,
  ventCount:5,ventSideYs:Object.freeze([.075,.275]),
  ventHeight:.105,ventOffset:.055,ventRoofHalfZ:.25
 }),
 handstop:Object.freeze({
  centerX:10.54,length:.55,
  profileScale:1.18
 }),
 sight:Object.freeze({
  baseStartX:12.20,baseShoulderX:12.80,
  baseFlatStartX:13.30,baseEndX:15.20,
  baseBottomY:-.42,baseRearTopY:.42,
  baseTopY:.96,baseDepth:1.86,
  earX:14.32,earY:1.76,
  earHalfSpacing:.68,earLength:.82,earHeight:1.75,earDepth:.76
 })
});
