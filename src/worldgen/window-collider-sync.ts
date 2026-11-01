/** Reconcile physical window cover with the authoritative openings.
 * Other generation passes may move furniture, but cannot add an orphan
 * structural sill or leave full-height glass with two colliders.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
export function synchronizeWindowBarriers<T extends Pick<Site,'windows'|'cover'>>(site:T):T{
 const staticCover=site.cover.filter(o=>o.fixture!=='window-sill'&&
  o.fixture!=='glass-barrier');
 const barriers:Obstacle[]=(site.windows??[]).map(window=>({
  x:window.x,y:window.y,
  w:window.vertical?10:window.width,
  h:window.vertical?window.width:10,
  low:(window.sillHeight??14)<25,
  fixture:window.sillHeight===0?'glass-barrier':'window-sill'
 }));
 return {...site,cover:[...staticCover,...barriers]};
}
