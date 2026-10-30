/** 136: inventory-backed magazine states and deterministic handling phases. */
import type {WeaponId} from './breach-combat.ts';
export type ReloadMode='emergency'|'retention'|'shells';
export type MagazineItem={id:string;weapon:WeaponId;rounds:number};
export const magazineKit=(actorId:string,weapon:WeaponId,
  rounds:number,capacity:number):MagazineItem[]=>{
 const result:MagazineItem[]=[];
 for(let i=0,remaining=Math.max(0,rounds);remaining>0;i++){
  const amount=Math.min(capacity,remaining);
  result.push({id:actorId+'/'+weapon+'/'+i,weapon,rounds:amount});
  remaining-=amount;
 }
 return result;
};
export const reserveRounds=(kit:MagazineItem[])=>
 kit.reduce((sum,m)=>sum+m.rounds,0);
export const fullestMagazineIndex=(kit:MagazineItem[],weapon:WeaponId)=>{
 let index=-1,best=0;
 for(let i=0;i<kit.length;i++)if(kit[i].weapon===weapon&&
   kit[i].rounds>best){best=kit[i].rounds;index=i;}
 return index;
};
export function reloadPhase(progress:number,mode:ReloadMode){
 const t=Math.max(0,Math.min(1,progress));
 if(mode==='shells')return t<.18?'reach':t<.88?'load':'settle';
 return t<.29?'reach':t<.47?'remove':
   t<.68?'retrieve':t<.82?'insert':'settle';
}
export const reloadDuration=(base:number,injuryFactor:number,
  mode:ReloadMode,roundsMissing:number)=>
 base*injuryFactor*(mode==='shells'?
   Math.max(.40,Math.min(1,roundsMissing/6)) :
   mode==='retention'?1.16:1);
