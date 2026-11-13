/** Stable logical identities over existing packed cover arrays.
 * Identity survives movement, collapse and replay, while array indices remain
 * the collision/render broadphase's fast addressing convention.
 * Legacy snapshots get IDs deterministically on load, never on each tick.
 */
import type {Obstacle} from '../breach-core.ts';
import type {Site} from '../breach-site.ts';
/** Does not mutate caller arrays or overwrite archived custom IDs. */
export function withCoverPropIds<T extends Obstacle>(cover:readonly T[]):T[]{
 const seen=new Set<string>();
 let missing=false;
 for(const prop of cover){
  if(!prop.id||seen.has(prop.id)){missing=true;break;}
  seen.add(prop.id);
 }
 if(!missing)return cover as T[];
 seen.clear();
 const ids=cover.map(prop=>{
  const id=prop.id;
  if(!id||seen.has(id))return null;
  seen.add(id);return id;
 });
 return cover.map((prop,i)=>{
  if(ids[i])return prop;
  let id='p'+i.toString(36),suffix=0;
  while(seen.has(id))id='p'+i.toString(36)+'-'+(++suffix);
  seen.add(id);
  return {...prop,id};
 });
}
export function withSitePropIds<T extends Site>(site:T):T{
 const normalized=withCoverPropIds(site.cover);
 return normalized===site.cover?site:{...site,cover:normalized};
}
/** New commands use stable IDs; old saved/recorded prop:17 orders work. */
export function coverTargetIndex(cover:readonly Obstacle[],token:string):number{
 if(/^\\d+$/.test(token)){
  const index=Number(token);
  return Number.isSafeInteger(index)&&index<cover.length?index:-1;
 }
 return cover.findIndex(item=>item.id===token);
}
export const coverTargetToken=(cover:Obstacle,index:number):string=>
 cover.id??String(index);
