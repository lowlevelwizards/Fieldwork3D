/** Deliberate operational differences between businesses sharing an archetype.
 * Reassign redundant *actual* room cells while retaining public entrances,
 * private units, minimum core rooms and authoritative circulation.
 */
import type {BuildingArchetype} from '../breach-site.ts';
import type {Blueprint} from './architectural-program.ts';
type Change={from:string;to:string;minimumRemaining:number};
const changes:Partial<Record<BuildingArchetype,Record<string,Change>>>={
 retail:{
  'convenience-store':{from:'stockroom',to:'sales',minimumRemaining:1},
  'hardware-store':{from:'storage',to:'stockroom',minimumRemaining:0},
  'clothing-shop':{from:'stockroom',to:'sales',minimumRemaining:1}
 },
 office:{
  'administrative-office':{from:'meeting',to:'cubicles',minimumRemaining:0},
  'open-workplace':{from:'office',to:'cubicles',minimumRemaining:1}
 },
 garage:{
  'tire-service':{from:'bay',to:'parts',minimumRemaining:2},
  'fleet-maintenance':{from:'bay',to:'workshop',minimumRemaining:2}
 },
 warehouse:{
  'distribution':{from:'storage',to:'packing',minimumRemaining:1},
  'shipping-depot':{from:'storage',to:'loading',minimumRemaining:1}
 },
 restaurant:{
  'cafe':{from:'service',to:'checkout',minimumRemaining:1},
  'diner':{from:'service',to:'checkout',minimumRemaining:1}
 },
 clinic:{
  'urgent-care':{from:'exam',to:'treatment',minimumRemaining:1}
 }
};
export function specializeBlueprint(
 blueprint:Blueprint,subtype:string):Blueprint{
 if(!subtype||blueprint.unitIds)return blueprint;
 const rule=changes[blueprint.kind]?.[subtype];
 if(!rule)return blueprint;
 const cells=blueprint.cells.map(row=>[...row]);
 const candidates=cells.flatMap((row,y)=>row.map((role,x)=>({x,y,role})))
  .filter(c=>c.role===rule.from&&
    !(c.x===blueprint.front.col&&c.y===blueprint.front.row));
 if(candidates.length<=rule.minimumRemaining)return blueprint;
 // Choose the redundant cell nearest its relevant workflow area: service near
 // dining, storage near public sales, office desks near the main work spine.
 const target=candidates.sort((a,b)=>{
   const dist=(c:typeof a)=>Math.abs(c.x-blueprint.front.col)+
     Math.abs(c.y-blueprint.front.row);
   return dist(a)-dist(b)||a.y-b.y||a.x-b.x;
 })[0];
 cells[target.y][target.x]=rule.to;
 return {...blueprint,cells,family:blueprint.family+' / '+subtype};
}
