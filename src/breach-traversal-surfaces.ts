/** Semantic physical passage rules. Cover labels describe shooting/LOS,
 * NOT whether a boot can step over an object. Keep the distinction explicit:
 * a low wall or window sill must never be silently made walkable.
 *
 * Physics and planning both consult the SAME classification so a route
 * preview cannot disagree with authoritative movement.
 */
import type {Obstacle} from './breach-core.ts';

export type TraversalSurface='step-over'|'shove'|'vault'|'mantle'|'solid';
/** True ankle-height obstacles. Taller objects use a real traversal action. */
const STEP_OVER=new Set([
 'pallet',        // the bare shipping pallet, height 6
 'parking-block', // low wheel stop, height 8
]);
/** Stable, non-fragile objects that may eventually support a jump/vault.
 * Classification is preparatory: vault/mantle are NOT normal walkability. */
const VAULTABLE=new Set([
 'crate','low-barrier','half-wall','planter','tire-stack',
 'tipped-trash-bin','trash-bin','window-sill',
]);
const MANTLEABLE=new Set(['fence','low-wall','security-barrier','barricade']);
/** Clutter small enough to move by contacting it; larger furniture and
 * fragile fixed fixtures do not become auto-pushable by having low cover. */
const TOPPLEABLE=new Set([
 'chair','patio-chair','office-chair','stool','lamp',
 'storage-tote','tipped-trash-bin','mop-bucket'
]);
const SHOVEABLE=new Set([
 'chair','patio-chair','office-chair','stool','lamp',
 'storage-tote','tipped-trash-bin','trash-bag','mop-bucket',
 'small-table','side-table',
]);
export function traversalSurface(o:Obstacle):TraversalSurface{
 if(o.destroyed)return 'solid';
 const id=o.fixture??'';
 // Collapsed light clutter is a low obstacle, not an impassable footprint.
 if(o.toppled&&TOPPLEABLE.has(id))return 'step-over';
 if(STEP_OVER.has(id))return 'step-over';
 // Windows remain a gated animation/interactable, never a free shortcut.
 if(id==='glass-barrier'||id==='window-sill')return 'solid';
 if(SHOVEABLE.has(id)&&o.w<=42&&o.h<=42)return 'shove';
 if(VAULTABLE.has(id))return 'vault';
 if(MANTLEABLE.has(id))return 'mantle';
 return 'solid';
}
export const isFootstepObstacle=(o:Obstacle)=>
 traversalSurface(o)!=='step-over';
export const canAutoShove=(o:Obstacle)=>
 traversalSurface(o)==='shove';
