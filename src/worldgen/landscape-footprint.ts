/** Distinguish a leafy visual canopy from the much smaller physical trunk.
 * Foliage cards do not become huge invisible cover collision rectangles.
 */
export const TREE_FIXTURES=new Set([
 'tree','tree-broadleaf','tree-conifer','tree-scrub'
]);
export function landscapePhysicalFootprint(fixture:string,width:number,depth:number){
 if(!TREE_FIXTURES.has(fixture))return {w:width,h:depth};
 // 0.65-0.75m trunk/root zone, separate from the 2-3m visual crown.
 return {w:Math.min(14,width),h:Math.min(14,depth)};
}
export function foliageCanopyFootprint(
 fixture:string,physicalWidth:number,physicalDepth:number,
 visualWidth:number,visualDepth:number){
 if(!TREE_FIXTURES.has(fixture))
  return {w:physicalWidth,h:physicalDepth};
 return {w:visualWidth,h:visualDepth};
}
