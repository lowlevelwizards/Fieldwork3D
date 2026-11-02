/** Fixed visual *interpretation* of the existing 8×8×8 cube head.
 * Not extra head geometry, a skeleton change, or an approval of proportions.
 *
 * The actual skull mesh is centered at local Y=3, height 8, so its bounds
 * are Y=-1..7; width/depth 8, front -Z, back +Z after the axis adapter.
 * Landmarks are approximate symbolic human locations ON that unchanged cube.
 * These guide all headgear placements to prevent hats perched on the crown.
 */
export const CUBE_HEAD_ANATOMY=Object.freeze({
 skullTop:7,skullBottom:-1,
 brow:4.3,hairline:5.7,
 earTop:4.0,earCenter:2.6,earBottom:1.35,
 nape:2.2,chin:-.65,
 frontZ:-4,rearZ:4,leftX:-4,rightX:4
});
