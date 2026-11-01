/** LW-15: versioned, bounded individual operator records.
 * Save state belongs to operations, never to the 60Hz world simulation.
 */
import type {Session} from './breach-game.ts';
import {WEAPONS,type WeaponId} from './breach-combat.ts';
export type RosterMember={
 id:string;callsign:string;missions:number;successful:number;
 injuries:number;recovery:number;weapon:WeaponId;magazine:number;reserve:number;
 fired:number;
};
export type RosterState={version:1;members:RosterMember[]};
const names=['rook','moss','ash','vale'] as const;
const weapons:WeaponId[]=['carbine','smg','rifle','shotgun'];
const defaultMember=(id:string,i:number):RosterMember=>({
 id,callsign:id.toUpperCase(),missions:0,successful:0,
 injuries:0,recovery:0,weapon:weapons[i],
 magazine:WEAPONS[weapons[i]].capacity,reserve:WEAPONS[weapons[i]].reserve,
 fired:0
});
export function initialRoster():RosterState{
 return {version:1,members:names.map((id,i)=>defaultMember(id,i))};
}
const finite=(x:unknown,min:number,max:number,fallback:number)=>
 typeof x==='number'&&Number.isFinite(x)?
 Math.max(min,Math.min(max,Math.floor(x))):fallback;
export function readRoster(raw:string|null):RosterState{
 const fresh=initialRoster();
 if(!raw)return fresh;
 try{
  const value:unknown=JSON.parse(raw);
  if(!value||typeof value!=='object')return fresh;
  const data=value as {version?:unknown;members?:unknown};
  if(data.version!==1||!Array.isArray(data.members))return fresh;
  return {version:1,members:fresh.members.map(base=>{
   const found=data.members!.find((v:unknown)=>
     !!v&&typeof v==='object'&&'id' in v&&v.id===base.id);
   if(!found||typeof found!=='object')return base;
   const f=found as Partial<RosterMember>;
   return {...base,callsign:typeof f.callsign==='string'?
     f.callsign.slice(0,24):base.callsign,
    missions:finite(f.missions,0,100000,0),
    successful:finite(f.successful,0,100000,0),
    injuries:finite(f.injuries,0,3,0),
    recovery:finite(f.recovery,0,12,0),
    weapon:weapons.includes(f.weapon as WeaponId)?
       f.weapon as WeaponId:base.weapon,
    magazine:finite(f.magazine,0,WEAPONS[f.weapon??base.weapon]?.capacity??36,
      base.magazine),
    reserve:finite(f.reserve,0,300,base.reserve),
    fired:finite(f.fired,0,1000000,0)};
  })};
 }catch{return fresh;}
}
export function applyRosterIdentity(s:Session,roster:RosterState){
 for(const a of s.operators){
  if(a.side!=='blue')continue;
  const member=roster.members.find(m=>m.id===a.id);
  if(member)a.name=member.callsign;
 }
}
export function recordRosterMission(s:Session,roster:RosterState):RosterState{
 return {version:1,members:roster.members.map(m=>{
  const actor=s.operators.find(a=>a.id===m.id&&a.side==='blue');
  if(!actor)return {...m};
  return {...m,missions:m.missions+1,
    successful:m.successful+(s.phase==='won'?1:0),
    fired:m.fired+actor.shots};
 })};
}
