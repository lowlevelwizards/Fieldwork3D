/** Render-only guard for structural sill/parapet geometry.
 * The navigation cover must remain authoritative, but a second obstacle box
 * at the exact same window/service aperture produces coplanar faces and flicker.
 */
import type {Obstacle} from '../breach-core.ts';
import type {Site} from '../breach-site.ts';

export function isArchitecturalSillCover(
  site:Pick<Site,'windows'|'openings'>,
  cover:Pick<Obstacle,'fixture'|'x'|'y'>,
):boolean{
  if(cover.fixture!=='window-sill'&&cover.fixture!=='glass-barrier')return false;
  if((site.windows??[]).some(w=>Math.hypot(cover.x-w.x,cover.y-w.y)<.75))
    return true;
  return (site.openings??[]).some(o=>o.kind==='serving'&&
    Math.hypot(cover.x-(o.a.x+o.b.x)/2,
      cover.y-(o.a.y+o.b.y)/2)<.75);
}
