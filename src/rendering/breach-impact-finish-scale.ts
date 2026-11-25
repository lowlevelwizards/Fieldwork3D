/** Cosmetic diameter scaling uses the authored wall-face finish, not the
 * generic masonry ballistic response. Cache by immutable site identity so
 * rendering does not recalculate weathering or room exposure every frame. */
import type {Site} from '../breach-site.ts';
import type {SurfaceAttachment} from '../breach-impact-surface.ts';
import {WALL_VISUAL_HEIGHT} from '../breach-door-proportions.ts';
import {planWallSurface} from '../worldgen/wall-surface-recipe.ts';
export const PLASTER_IMPACT_SCALE=.85;
const cache=new WeakMap<Site,Map<number,number>>();
export function impactFinishScale(site:Site|null|undefined,ref:SurfaceAttachment|undefined):number{
 if(!site||ref?.kind!=='wall'||!site.walls[ref.index]||
    (ref.face!==1&&ref.face!==-1))return 1;
 let faces=cache.get(site);
 if(!faces){faces=new Map();cache.set(site,faces);}
 const key=ref.index*2+(ref.face===1?1:0);
 const stored=faces.get(key);
 if(stored!==undefined)return stored;
 const scale=planWallSurface(site,ref.index,WALL_VISUAL_HEIGHT,ref.face).surface==='plaster'?PLASTER_IMPACT_SCALE:1;
 faces.set(key,scale);return scale;
}
