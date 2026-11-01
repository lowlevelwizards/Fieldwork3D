/** A fixture's rendered geometry is centered at the local origin.
 * Keep the Three.js parent anchored at its ACTUAL world position on every
 * frame; cover damage and orientation affect local scale, not world origin.
 */
import type {Obstacle} from '../breach-core.ts';
type LocalSize=Pick<Obstacle,'w'|'h'|'orientation'>;
type CoverState=Pick<Obstacle,'x'|'y'|'w'|'h'|'destroyed'>;
export function fixtureFrameTransform(before:LocalSize,current:CoverState){
 const widthRatio=current.w/Math.max(1,before.w);
 const depthRatio=current.h/Math.max(1,before.h);
 const turned=(before.orientation??0)%2===1;
 return {
  x:current.x,y:current.y,
  // A quarter-turn exchanges local X and Z relative to world X and Z.
  scaleX:turned?depthRatio:widthRatio,
  scaleY:current.destroyed?.32:1,
  scaleZ:turned?widthRatio:depthRatio
 };
}
