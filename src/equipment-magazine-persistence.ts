/** Equipment 15: magazine persistence at mission boundaries.
 * Each spare magazine has one owner, one stable ID, and its own rounds. The
 * existing combat magazine states remain authoritative during the operation.
 */
import {WEAPONS,type WeaponId} from './breach-combat.ts';
import {magazineKit,reserveRounds,type MagazineItem} from './breach-magazines.ts';

const validId=(id:unknown):id is string=>
 typeof id==='string'&&id.length>0&&id.length<=120;
const location=(x:unknown):MagazineItem['location']=>
 x==='rig'||x==='belt'||x==='backpack'||x==='pocket'||x==='overflow'?x:undefined;
const boundedRounds=(n:number,max:number)=>
 Math.min(max,Math.max(0,Math.floor(n)));

/** Malformed, duplicated, mixed-weapon, or nonconserving saves fall back to
 * equivalent magazines made from the already-authoritative reserve total.
 * This never creates more rounds than the campaign already owns.
 */
export function readPersistentMagazines(
 owner:string,weapon:WeaponId,reserve:number,raw:unknown
):MagazineItem[]{
 if(weapon==='shotgun')return [];
 const max=WEAPONS[weapon].capacity;
 const total=boundedRounds(Number.isFinite(reserve)?reserve:0,300);
 const fallback=()=>magazineKit(owner,weapon,total,max);
 if(!Array.isArray(raw)||raw.length>64)return fallback();
 const seen=new Set<string>();const result:MagazineItem[]=[];
 for(const entry of raw){
  if(!entry||typeof entry!=='object')return fallback();
  const m=entry as Partial<MagazineItem>;
  if(!validId(m.id)||seen.has(m.id)||m.weapon!==weapon||
   typeof m.rounds!=='number'||!Number.isInteger(m.rounds)||
   m.rounds<=0||m.rounds>max)return fallback();
  seen.add(m.id);
  const loc=location(m.location);
  result.push(loc?{id:m.id,weapon,rounds:m.rounds,location:loc}:
   {id:m.id,weapon,rounds:m.rounds});
 }
 return reserveRounds(result)===total?result:fallback();
}
export function readLoadedMagazineId(
 owner:string,weapon:WeaponId,raw:unknown,spares:readonly MagazineItem[]
):string{
 const fallback=owner+'/'+weapon+'/loaded';
 return validId(raw)&&!spares.some(m=>m.id===raw)?raw:fallback;
}
/** Filling partially used magazines preserves their identities. New magazines
 * are minted only for the genuinely new rounds that cannot fit anywhere else.
 */
export function addReserveRounds(
 owner:string,weapon:WeaponId,mags:readonly MagazineItem[],added:number
):MagazineItem[]{
 if(weapon==='shotgun')return [];
 const cap=WEAPONS[weapon].capacity;
 let remaining=boundedRounds(added,300);
 const result=mags.map(m=>{
  const n=Math.min(remaining,Math.max(0,cap-m.rounds));
  remaining-=n;return {...m,rounds:m.rounds+n};
 });
 const existing=new Set(result.map(m=>m.id));
 for(let i=0;remaining>0&&i<1000;i++){
  const id=owner+'/'+weapon+'/refill-'+i;
  if(existing.has(id))continue;
  const n=Math.min(remaining,cap);remaining-=n;
  result.push({id,weapon,rounds:n});existing.add(id);
 }
 return result;
}
