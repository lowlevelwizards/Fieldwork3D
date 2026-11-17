/** D8.2: deterministic Dispatch-only authored incident offers.
 * The campaign keeps its existing seed, mission, region, risk and economy.
 * A recently repeated case is less likely, never forbidden or rerolled.
 */
import type {Contract} from './campaign-state.ts';
import type {BuildingArchetype} from './breach-site.ts';
import {DISPATCH_D8_INCIDENT_IDS,dispatchIncidentDefinition,
 type DispatchCaseV1} from './dispatch-case-contract.ts';

const hash=(value:number)=>{
 let x=value>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d)>>>0;
 x=Math.imul(x^(x>>>15),0x846ca68b)>>>0;
 return (x^(x>>>16))>>>0;
};
const stringHash=(s:string)=>[...s].reduce((n,c)=>
 (Math.imul(n,31)+c.charCodeAt(0))>>>0,2166136261);

/** A distinct salted decision lane; archived and active contracts never reroll. */
export function assignDispatchCase(contract:Contract,
 recentIds:readonly string[]=[]):Contract{
 if(contract.dispatchCase)return contract;
 const available=DISPATCH_D8_INCIDENT_IDS.map(id=>dispatchIncidentDefinition(id)!)
  .filter(def=>def.missions.includes(contract.kind)&&!!def.buildings?.length);
 if(!available.length)throw Error('No authored Dispatch case for '+contract.kind);
 const scored=available.map(def=>{
  const uses=recentIds.slice(-7).filter(id=>id===def.id).length;
  return {def,weight:Math.max(1,Math.round(def.weight*100/(1+uses*3)))};
 });
 const total=scored.reduce((sum,row)=>sum+row.weight,0);
 let roll=hash(contract.seed^stringHash(contract.id)^0x8d219e61)%total;
 const selected=scored.find(row=>(roll-=row.weight)<0)!.def;
 const buildings=selected.buildings!;
 const archetype=buildings[hash(contract.seed^stringHash(selected.id)^0x61a3cc91)%
   buildings.length] as BuildingArchetype;
 const dispatchCase:DispatchCaseV1={version:1,incidentId:selected.id,archetype};
 return {...contract,dispatchCase};
}
