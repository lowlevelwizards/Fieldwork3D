/** LW-12: bounded damage to physical cover keeps object indices stable.
 * A collapsed object leaves a small low obstruction, not an invisible ghost.
 */
import type {Obstacle} from './breach-core.ts';
import {materialForFixture,MATERIALS} from './breach-materials.ts';
export type CoverDamageState='intact'|'damaged'|'collapsed'|'immune';
const permanent=new Set(['vehicle','vehicle-lift','generator','tank',
 'window-sill','fence','concrete-column']);
export function damageCover(obstacle:Obstacle,amount:number):CoverDamageState{
 if(!Number.isFinite(amount)||amount<=0)return 'immune';
 if(permanent.has(obstacle.fixture??'')||obstacle.destroyed)return 'immune';
 const material=obstacle.material??materialForFixture(obstacle.fixture);
 const max=MATERIALS[material].integrity;
 const before=obstacle.integrity??max;
 const after=Math.max(0,before-amount);
 obstacle.integrity=after;
 if(after===0){
  obstacle.destroyed=true;obstacle.low=true;
  obstacle.w=Math.max(11,obstacle.w*.42);
  obstacle.h=Math.max(9,obstacle.h*.42);
  return 'collapsed';
 }
 return 'damaged';
}
