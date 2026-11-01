/** Deliberate operational differences between businesses sharing an archetype.
 * Reassign redundant *actual* room cells while retaining public entrances,
 * private units, minimum core rooms and authoritative circulation.
 */
import type {BuildingArchetype} from '../breach-site.ts';
import type {Blueprint} from './architectural-program.ts';
type Change={from:string;to:string;minimumRemaining:number};
const changes:Partial<Record<BuildingArchetype,Record<string,Change>>>={
 house:{
  'bungalow':{from:'dining',to:'living',minimumRemaining:0},
  'ranch-house':{from:'mudroom',to:'utility',minimumRemaining:0}
 },
 townhouse:{
  'historic-rowhouse':{from:'study',to:'storage',minimumRemaining:0},
  'rental-townhouse':{from:'dining',to:'bedroom',minimumRemaining:0}
 },
 retail:{
  'convenience-store':{from:'stockroom',to:'sales',minimumRemaining:1},
  'hardware-store':{from:'storage',to:'stockroom',minimumRemaining:0},
  'clothing-shop':{from:'stockroom',to:'sales',minimumRemaining:1},
  'general-store':{from:'service',to:'storage',minimumRemaining:0}
 },
 office:{
  'administrative-office':{from:'meeting',to:'cubicles',minimumRemaining:0},
  'open-workplace':{from:'office',to:'cubicles',minimumRemaining:1},
  'professional-office':{from:'meeting',to:'office',minimumRemaining:0}
 },
 garage:{
  'tire-service':{from:'bay',to:'parts',minimumRemaining:1},
  'fleet-maintenance':{from:'bay',to:'workshop',minimumRemaining:2},
  'fabrication-shop':{from:'bay',to:'workshop',minimumRemaining:2}
 },
 warehouse:{
  'distribution':{from:'storage',to:'packing',minimumRemaining:1},
  'shipping-depot':{from:'storage',to:'loading',minimumRemaining:1},
  'bulk-storage':{from:'packing',to:'storage',minimumRemaining:0}
 },
 restaurant:{
  'cafe':{from:'service',to:'checkout',minimumRemaining:1},
  'diner':{from:'service',to:'checkout',minimumRemaining:1},
  'sit-down-restaurant':{from:'service',to:'dining',minimumRemaining:1}
 },
 motel:{
  'roadside-motel':{from:'maintenance',to:'laundry',minimumRemaining:1},
  'motor-lodge':{from:'maintenance',to:'office',minimumRemaining:1},
  'courtyard-motel':{from:'maintenance',to:'storage',minimumRemaining:0}
 },
 clinic:{
  'urgent-care':{from:'exam',to:'treatment',minimumRemaining:1},
  'specialist-clinic':{from:'exam',to:'treatment',minimumRemaining:1}
 },
 utility:{
  'pump-station':{from:'equipment',to:'maintenance',minimumRemaining:1},
  'generator-plant':{from:'equipment',to:'control',minimumRemaining:1},
  'electrical-service':{from:'maintenance',to:'control',minimumRemaining:0}
 }
};
export function specializeBlueprint(
 blueprint:Blueprint,subtype:string,seed=0):Blueprint{
 if(!subtype||blueprint.unitIds)return blueprint;
 const rule=changes[blueprint.kind]?.[subtype];
 if(!rule)return blueprint;
 const cells=blueprint.cells.map(row=>[...row]);
 const candidates=cells.flatMap((row,y)=>row.map((role,x)=>({x,y,role})))
  .filter(c=>c.role===rule.from&&
    !(c.x===blueprint.front.col&&c.y===blueprint.front.row));
 if(candidates.length<=rule.minimumRemaining){
  // Small cafés lack a dedicated service cell. Their compact reception
  // transforms into a real checkout counter while dining/kitchen remain.
  if(blueprint.kind==='restaurant'&&
    (subtype==='cafe'||subtype==='diner')&&
    blueprint.depths.length===2){
   const entry=blueprint.cells.map((row,y)=>
     row.map((role,x)=>({x,y,role}))).flat().find(c=>c.role==='reception'&&
       !(c.x===blueprint.front.col&&c.y===blueprint.front.row));
   if(entry){
    const cells=blueprint.cells.map(row=>[...row]);
    cells[entry.y][entry.x]='checkout';
    return {...blueprint,cells,family:blueprint.family+' / '+subtype};
   }
  }
  return blueprint;
 }
 // Choose the redundant cell nearest its relevant workflow area: service near
 // dining, storage near public sales, office desks near the main work spine.
 const ranked=candidates.sort((a,b)=>{
   const dist=(c:typeof a)=>Math.abs(c.x-blueprint.front.col)+
     Math.abs(c.y-blueprint.front.row);
   return dist(a)-dist(b)||a.y-b.y||a.x-b.x;
 });
 // Treat subtype role conversion as a set of real planning choices,
 // instead of always converting the nearest identical service room.
 const pool=ranked.slice(0,Math.min(3,ranked.length));
 const selected=seed===0?0:
   (Math.imul((seed>>>0)^0x37ad38e1,2654435761)>>>0)%pool.length;
 const target=pool[selected];
 cells[target.y][target.x]=rule.to;
 return {...blueprint,cells,family:blueprint.family+' / '+subtype+' / program-'+selected};
}
