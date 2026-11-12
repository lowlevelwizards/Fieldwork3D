/** Reconcile physical window cover with the authoritative openings.
 * Other generation passes may move furniture, but cannot add an orphan
 * structural sill or leave full-height glass with two colliders.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {windowBarrierFootprint} from './window-geometry-contract.ts';
export function synchronizeWindowBarriers<T extends Pick<Site,'windows'|'cover'>>(site:T):T{
 const staticCover=site.cover.filter(o=>o.fixture!=='window-sill'&&
  o.fixture!=='glass-barrier');
 const barriers:Obstacle[]=(site.windows??[]).map(windowBarrierFootprint);
 return {...site,cover:[...staticCover,...barriers]};
}
