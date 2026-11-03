/** Garment attachment contract for the actual IK limb segment frame.
 * breach-ik.alignSegment builds basis(local +X=anatomical outside,
 * +Y=along the segment, +Z=front/back). The +X side works for BOTH limbs;
 * +/-Z is not a per-left/right outward normal and caused false pockets.
 * All dimensions below are authored LOCAL to each articulated limb mesh.
 */
export type LimbPocket={
 x:number;y:number;z:number;
 width:number;height:number;depth:number;
};
/** A shallow sewn pouch sits on the outward (+X) cloth face.
 * Depth runs front-to-back (+/-Z), not into the anatomy. */
export function outwardLimbPocket(radius:number,centerY:number,
 height:number,frontBackWidth:number,thickness=.35):LimbPocket{
 if(!(radius>0&&height>0&&frontBackWidth>0&&thickness>0))
  throw new RangeError('Limb pocket dimensions must be positive');
 return {x:radius+thickness*.20,y:centerY,z:0,
  width:thickness,height,depth:frontBackWidth};
}
/** A thin external panel/band uses the same outward limb normal. */
export function outwardLimbPatch(radius:number,centerY:number,
 height:number,frontBackWidth:number,thickness=.14):LimbPocket{
 return outwardLimbPocket(radius,centerY,height,frontBackWidth,thickness);
}
