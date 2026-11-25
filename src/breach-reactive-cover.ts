/** LW-12: bounded damage to physical cover keeps object indices stable.
 * A collapsed object leaves a small low obstruction, not an invisible ghost.
 */
import type {Obstacle} from './breach-core.ts';
import {materialForFixture,MATERIALS} from './breach-materials.ts';
import {coverHeight} from './breach-cover-height.ts';
export type CoverDamageState='intact'|'damaged'|'collapsed'|'immune';
const permanent=new Set(['vehicle','vehicle-lift','generator','tank',
 'window-sill','fence','concrete-column']);
/** Furniture-only pacing; explicit saved integrity values retain their meaning. */
export function coverInitialIntegrity(obstacle:Pick<Obstacle,'fixture'|'material'>):number{
 const material=obstacle.material??materialForFixture(obstacle.fixture),base=MATERIALS[material].integrity;
 const fixture=obstacle.fixture??'';
 if(permanent.has(fixture)||material==='glass'||material==='brick'||material==='concrete'||fixture.startsWith('target-')||/column|wall|fence|barrier|shutter|door|training/.test(fixture))return base;
 return base*(/desk|cabinet|bookcase|wardrobe|workbench|counter|locker|fridge|dresser|shelf/.test(fixture)?1.75:1.5);
}
export function damageCover(obstacle:Obstacle,amount:number,at?:number):CoverDamageState{
 if(!Number.isFinite(amount)||amount<=0)return 'immune';
 if(permanent.has(obstacle.fixture??'')||obstacle.destroyed)return 'immune';
 const max=coverInitialIntegrity(obstacle);
 const before=obstacle.integrity??max;
 const after=Math.max(0,before-amount);
 obstacle.integrity=after;
 if(after===0){
  if(at!==undefined&&Number.isFinite(at)){
   obstacle.destroyedAt=at;obstacle.collapseX=obstacle.x;obstacle.collapseY=obstacle.y;
   obstacle.collapseW=obstacle.w;obstacle.collapseD=obstacle.h;obstacle.collapseHeight=coverHeight(obstacle);
  }
  obstacle.destroyed=true;obstacle.low=true;
  obstacle.w=Math.max(11,obstacle.w*.42);
  obstacle.h=Math.max(9,obstacle.h*.42);
  return 'collapsed';
 }
 return 'damaged';
}
