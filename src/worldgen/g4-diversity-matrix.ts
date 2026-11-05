/** G4d: audit-only mission diversity measurements. This module never
 * changes generated sites and never exposes hidden hostiles to players.
 * Interpret distributions across comparable seeds, not single-map taste. */
import type {Site} from '../breach-site.ts';
import type {SiteAudit} from '../breach-site-audit.ts';
import type {OperationKind} from '../breach-operations.ts';
import {describeSiteTopology} from './topology-diversity.ts';
import {clearOfInsertion,roomOccupancyCapacity}
 from './encounter-spawn-safety.ts';
export type G4DSiteObservation={
 seed:number;scale:string;archetype:string;mission:OperationKind;
 premise:string;profile:string;topology:string;family:string;
 hostiles:number;groups:number;occupiedZones:number;
 closestPair:number;nearInsertionCount:number;objectiveDistance:number;
 alternateDoors:number;entryWindows:number;branchRooms:number;cycles:number;
 hallwayShare:number;objectiveGuards:number;
 hardFailures:string[];warnings:string[];
};
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
export function inspectG4DSite(site:Site,audit:SiteAudit,
 mission:OperationKind):G4DSiteObservation{
 const hardFailures=[...audit.errors];
 const warnings:string[]=[];
 const encounters=site.encounter?.actors??[];
 const ids=new Set<string>();
 const roomCounts=new Map<string,number>();
 for(const actor of encounters){
  if(ids.has(actor.id))hardFailures.push('duplicate hostile id '+actor.id);
  ids.add(actor.id);
  if(!Number.isFinite(actor.position.x)||!Number.isFinite(actor.position.y)||
     !Number.isFinite(actor.heading))
   hardFailures.push('invalid hostile state '+actor.id);
  const exterior=actor.zoneId?.startsWith('exterior:')??false;
  if(!clearOfInsertion(site,actor.position,exterior))
   hardFailures.push('unsafe insertion '+actor.id);
  if(!exterior){
   const room=site.rooms.find(r=>r.kind==='room'&&
     actor.position.x>=r.x&&actor.position.x<=r.x+r.w&&
     actor.position.y>=r.y&&actor.position.y<=r.y+r.h);
   if(!room)hardFailures.push('unassigned interior '+actor.id);
   else roomCounts.set(room.id,(roomCounts.get(room.id)??0)+1);
  }
 }
 for(const [id,count] of roomCounts){
  const room=site.rooms.find(r=>r.id===id)!;
  if(count>roomOccupancyCapacity(room,site.cover))
   hardFailures.push('over-capacity room '+id);
 }
 const targets=encounters.filter(e=>e.role==='target');
 if(mission==='capture'&&targets.length!==1)
  hardFailures.push('capture target count '+targets.length);
 if(mission!=='capture'&&targets.length>0)
  hardFailures.push('unexpected capture target');
 const focus=mission==='capture'?targets[0]?.position:site.objective;
 const objectiveGuards=focus?encounters.filter(a=>
  a.role!=='target'&&['sentry','reserve','lookout'].includes(a.role)&&
  distance(a.position,focus)<=175).length:0;
 if(focus&&objectiveGuards===0&&mission!=='clear')
  warnings.push('objective has no nearby assigned security');
 const topo=describeSiteTopology(site);
 const opp=audit.tacticalOpportunities;
 if(opp.verifiedAlternateDoors===0&&opp.verifiedWindows===0)
  warnings.push('only the primary verified insertion');
 if(audit.mobilityQuality.blockedFlow>0)
  warnings.push('blocked door flow '+audit.mobilityQuality.blockedFlow);
 if(audit.encounterAudit.occupiedZones<=1&&encounters.length>=4)
  warnings.push('encounter concentrated in one zone');
 return {seed:site.seed,scale:site.scale??'standard',
  archetype:site.archetype??'unknown',mission,
  premise:site.encounter?.premise??'legacy',
  profile:site.encounter?.profile??'legacy',
  topology:topo.signature,family:site.planFamily??site.layout,
  hostiles:encounters.length,groups:audit.encounterAudit.groups,
  occupiedZones:audit.encounterAudit.occupiedZones,
  closestPair:audit.encounterAudit.closestPair,
  nearInsertionCount:audit.encounterAudit.nearInsertionCount,
  objectiveDistance:opp.objectiveEntryDistance,
  alternateDoors:opp.verifiedAlternateDoors,
  entryWindows:opp.verifiedWindows,
  branchRooms:topo.branchRooms,cycles:topo.circulationCycles,
  hallwayShare:topo.hallwayShare,objectiveGuards,
  hardFailures:[...new Set(hardFailures)],warnings};
}
export function summarizeG4D(rows:readonly G4DSiteObservation[]){
 const profiles:Record<string,Record<string,number>>={};
 const buildings:Record<string,{samples:number;invalid:number;
  topologies:Set<string>;profiles:Set<string>;warnings:number}>={};
 const comparable=new Map<string,string[]>();
 const warnings:Record<string,number>={};
 for(const row of rows){
  const mission=profiles[row.mission]??(profiles[row.mission]={});
  mission[row.profile]=(mission[row.profile]??0)+1;
  const building=buildings[row.archetype]??(buildings[row.archetype]={
   samples:0,invalid:0,topologies:new Set(),profiles:new Set(),warnings:0
  });
  building.samples++;
  building.invalid+=Number(row.hardFailures.length>0);
  building.topologies.add(row.topology);
  building.profiles.add(row.profile);
  building.warnings+=row.warnings.length;
  for(const warning of row.warnings)
   warnings[warning]=(warnings[warning]??0)+1;
  const key=[row.archetype,row.mission,row.scale].join('|');
  const signatures=comparable.get(key)??[];
  signatures.push(row.topology);comparable.set(key,signatures);
 }
 const groups=[...comparable.values()].filter(g=>g.length>1);
 const repeated=groups.reduce((sum,g)=>sum+g.length-new Set(g).size,0);
 const compared=groups.reduce((sum,g)=>sum+g.length,0);
 return {
  sampled:rows.length,invalid:rows.filter(r=>r.hardFailures.length>0).length,
  missions:[...new Set(rows.map(r=>r.mission))].sort(),
  archetypes:[...new Set(rows.map(r=>r.archetype))].length,
  scales:[...new Set(rows.map(r=>r.scale))].sort(),
  uniqueTopologies:new Set(rows.map(r=>r.topology)).size,
  repeatedComparableTopologyShare:compared?
   Math.round(repeated/compared*1000)/10:null,
  profileDistribution:profiles,
  byArchetype:Object.fromEntries(Object.entries(buildings)
   .sort(([a],[b])=>a.localeCompare(b)).map(([kind,b])=>[kind,{
    samples:b.samples,invalid:b.invalid,uniqueTopologies:b.topologies.size,
    uniqueProfiles:b.profiles.size,warnings:b.warnings
   }])),
  warningCounts:warnings
 };
}
