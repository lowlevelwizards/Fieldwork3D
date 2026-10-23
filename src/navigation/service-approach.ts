import type { NavigationGrid,Point2 } from './grid.ts';
const distance=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z);

/**
 * Actor arrivals are judged against the actual interaction anchor, not the
 * nearest A* cell. An off-grid goal must never silently resolve to the other
 * side of a wall or leave the operator stuck outside activation range.
 */
export function serviceApproach(nav:NavigationGrid,from:Point2,anchor:Point2,reach=1.12):Point2[] {
  const deltas:[number,number][]=[[0,0],[.30,0],[-.30,0],[0,.30],[0,-.30],
    [.52,.35],[-.52,.35],[.52,-.35],[-.52,-.35],[0,.62],[0,-.62]];
  // Operator.follow deliberately stops within ~0.33 m of its final point.
  // Reserve that braking distance, rather than validating only the A* goal.
  const landingRadius=reach-.36;
  for(const [x,z] of deltas) {
    const p={x:anchor.x+x,z:anchor.z+z};
    if(distance(p,anchor)>=landingRadius||!nav.canOccupy(p))continue;
    const path=nav.findPath(from,p);
    if(!path.length)continue;
    const end=path[path.length-1];
    if(distance(end,anchor)<landingRadius && nav.canOccupy(end))return path;
  }
  return [];
}
export function hasArrived(position:Point2,anchor:Point2,reach=1.12):boolean {
  return distance(position,anchor)<reach;
}
