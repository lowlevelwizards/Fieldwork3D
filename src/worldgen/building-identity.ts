/** Coherent property identity for architecture, furnishing and dressing.
 * One deterministic profile is shared by every room in a generated site.
 */
import type {BuildingArchetype,SiteScale,EnvironmentCondition} from '../breach-site.ts';
export type BuildingIdentity={
 subtype:string;era:'older'|'established'|'recent';
 upkeep:'meticulous'|'ordinary'|'neglected';
 activity:'quiet'|'normal'|'busy';
 condition:EnvironmentCondition;
 capacity:number;
};
const subtypes:Record<BuildingArchetype,readonly string[]>={
 house:['cottage','family-home','bungalow','ranch-house'],
 townhouse:['historic-rowhouse','rental-townhouse','renovated-rowhouse'],
 apartment:['studio-apartment','walkup-apartment','courtyard-apartment'],
 retail:['convenience-store','hardware-store','clothing-shop','general-store'],
 office:['professional-office','administrative-office','open-workplace'],
 garage:['general-repair','tire-service','fleet-maintenance','fabrication-shop'],
 warehouse:['bulk-storage','distribution','shipping-depot'],
 restaurant:['cafe','diner','sit-down-restaurant'],
 motel:['roadside-motel','courtyard-motel','motor-lodge'],
 utility:['pump-station','generator-plant','electrical-service'],
 clinic:['outpatient-clinic','urgent-care','specialist-clinic']
};
function choice(n:number,span:number){return ((n>>>0)%span);}
export function buildingIdentity(kind:BuildingArchetype,seed:number,
 scale:SiteScale,rooms:number):BuildingIdentity{
 let state=(seed^0x53e4b91c)>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 const subtype=subtypes[kind][choice(next(),subtypes[kind].length)];
 const era=(['older','established','recent'] as const)[choice(next(),3)];
 const upkeep=(['meticulous','ordinary','ordinary','neglected'] as const)[choice(next(),4)];
 const activity=(['quiet','normal','normal','busy'] as const)[choice(next(),4)];
 const roll=choice(next(),100);
 const condition:EnvironmentCondition=roll<6?'renovation':
   roll<12?'disturbed':upkeep==='neglected'?(activity==='quiet'?'vacant':'neglected'):
   activity==='busy'?'busy':'occupied';
 const tier=scale==='small'?0:scale==='large'?2:
   scale==='expanded'||scale==='medium'?1:0;
 const occupancyBase:Record<BuildingArchetype,number>={
  house:2,townhouse:2,apartment:1,retail:2,office:3,garage:2,
  warehouse:2,restaurant:3,motel:4,utility:1,clinic:3
 };
 return {subtype,era,upkeep,activity,condition,
   capacity:Math.max(1,occupancyBase[kind]+tier*Math.max(1,Math.floor(rooms/5)))};
}
