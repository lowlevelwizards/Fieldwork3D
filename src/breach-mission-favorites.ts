/** Replay R3: portable mission-start favorites, not live-state snapshots.
 * Practice rematches restore the resolved world and pre-GO squad via the
 * existing restart path. They must never resume completed campaign outcomes.
 */
import type {MissionStartSnapshot} from './breach-mission-restart.ts';
export const FAVORITE_MISSIONS_LIMIT=12;
export const FAVORITES_SCHEMA=1;
export type FavoriteMission={
  schemaVersion:1;id:string;label:string;createdAt:number;
  start:MissionStartSnapshot;
};
const validStart=(s:unknown):s is MissionStartSnapshot=>{
  if(!s||typeof s!=='object')return false;
  const v=s as Partial<MissionStartSnapshot>;
  return typeof v.variant==='number'&&Number.isFinite(v.variant)&&
    typeof v.missionType==='string'&&
    ['clear','intel','rescue','hold','capture'].includes(v.missionType)&&
    typeof v.intelMode==='string'&&typeof v.lightingMode==='string'&&
    typeof v.scale==='string'&&typeof v.entryId==='string'&&
    !!v.site&&typeof v.site==='object'&&Array.isArray(v.site.rooms)&&
    Array.isArray(v.site.spawn)&&Array.isArray(v.squad)&&
    v.squad.length>0&&v.squad.every(a=>a&&typeof a.id==='string');
};
export function readFavoriteMissions(raw:string|null):FavoriteMission[]{
  if(!raw||raw.length>2_000_000)return [];
  try{
    const value:unknown=JSON.parse(raw);
    if(!Array.isArray(value))return [];
    return value.filter((x):x is FavoriteMission=>{
      if(!x||typeof x!=='object')return false;
      const v=x as Partial<FavoriteMission>;
      return v.schemaVersion===1&&typeof v.id==='string'&&
        v.id.length>0&&typeof v.label==='string'&&
        v.label.length<=100&&typeof v.createdAt==='number'&&
        validStart(v.start);
    }).slice(-FAVORITE_MISSIONS_LIMIT);
  }catch{return [];}
}
export function addFavoriteMission(
  history:readonly FavoriteMission[],start:MissionStartSnapshot,
  id:string,label:string,createdAt:number
):FavoriteMission[]{
  if(!validStart(start))throw Error('Cannot favorite an unresolved mission');
  const item:FavoriteMission={
    schemaVersion:1,id,label:label.trim().slice(0,100)||'SAVED MISSION',
    createdAt,start:structuredClone(start)
  };
  return [...history.filter(x=>x.id!==id),item]
    .slice(-FAVORITE_MISSIONS_LIMIT);
}
export function removeFavoriteMission(
  history:readonly FavoriteMission[],id:string):FavoriteMission[]{
  return history.filter(x=>x.id!==id);
}
export function writeFavoriteMissions(items:readonly FavoriteMission[]):string{
  const content=JSON.stringify(items);
  if(content.length>1_800_000)
    throw Error('Favorite mission library exceeds local storage budget');
  return content;
}
