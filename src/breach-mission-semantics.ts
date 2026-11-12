/** C7: mission identity, force allegiance and encounter-contract diagnostics.
 * This layer reads resolved actors/plans; it does not generate geometry,
 * acquire tactical knowledge, roll RNG, or alter a stored encounter.
 */
import {missionForSeed,type OperationKind} from './breach-operations.ts';
import type {Site} from './breach-site.ts';
import type {Session} from './breach-game.ts';
import {admissibleHostileCount} from './worldgen/encounter-population-contract.ts';

export type MissionForce='friendly'|'hostile'|'civilian';
export const combatantForce=(side:'blue'|'red'):MissionForce=>
  side==='blue'?'friendly':'hostile';

/** Explicit operation selection > requested generation context > saved plan
 * > seed default. Legacy fixed-study sessions remain CLEAR. A mission override
 * on a prebuilt site is intentional and must not reroll that site's population.
 */
export function resolveMissionKind(
 site:Site|undefined,explicit?:OperationKind,requested?:OperationKind
):OperationKind{
 return explicit??requested??site?.encounter?.mission??
   (site?missionForSeed(site.seed):'clear');
}

/** Capture always refers to an instantiated hostile, never an abstract plan ID.
 * A deliberate override/legacy site without a tagged target keeps the old
 * first-hostile fallback; generated CAPTURE plans must have a real target.
 */
export function captureTargetIndex(
 site:Site|undefined,mission:OperationKind,hostileCount:number
):number{
 if(mission!=='capture'||hostileCount===0)return -1;
 const target=site?.encounter?.mission==='capture'?
   site.encounter.actors.findIndex(a=>a.role==='target'):-1;
 return target>=0&&target<hostileCount?target:0;
}

export type MissionPopulationTruth={
 hostileCount:number;
 armedProfileCount:{ordinary:number;security:number;prepared:number};
 activeCivilianCount:number;
 rescueTargetPresent:boolean;captureTargetPresent:boolean;
};
/** Read actual instantiated characters. Dormant generated neutrals are not
 * counted as live civilians, nor can costume/faction references confer a side.
 */
export function resolvedMissionPopulation(
 s:Pick<Session,'operators'|'civilians'|'site'|'rescue'|'captureTarget'>
):MissionPopulationTruth{
 const hostiles=s.operators.filter(a=>combatantForce(a.side)==='hostile');
 const specs=s.site?.encounter?.actors;
 // Physical encounter order is preserved in Session assembly. If a legacy
 // manifest has a different count, fail closed to ordinary rather than
 // presenting planned equipment as though it was actually instantiated.
 const linked=specs?.length===hostiles.length?specs:undefined;
 const armedProfileCount={ordinary:0,security:0,prepared:0};
 hostiles.forEach((_,i)=>{
  const profile=linked?.[i]?.weaponProfile??'ordinary';
  armedProfileCount[profile]++;
 });
 return {
  hostileCount:hostiles.length,armedProfileCount,
  activeCivilianCount:s.civilians.filter(c=>!c.rescueTarget).length,
  rescueTargetPresent:!!s.rescue||s.civilians.some(c=>c.rescueTarget),
  captureTargetPresent:!!s.captureTarget&&
    hostiles.some(a=>a.id===s.captureTarget)
 };
}
export type ScenarioSemanticIssue={
 code:string;subject:string;message:string;
 severity:'error'|'advisory';
};
const same=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.abs(a.x-b.x)<.001&&Math.abs(a.y-b.y)<.001;

/** Explicit offline validation of *data* ownership and assignment parity.
 * No route solver, random sampling, simulation mutation or per-frame checks.
 * Saved/prebuilt maps with no encounter plan retain their legacy semantics.
 */
export function auditMissionScenario(
 site:Site,options:{mission?:OperationKind;explicitOverride?:boolean}={}
):ScenarioSemanticIssue[]{
 const plan=site.encounter;
 if(!plan||site.training)return [];
 const issues:ScenarioSemanticIssue[]=[];
 const add=(code:string,subject:string,message:string,
  severity:ScenarioSemanticIssue['severity']='error')=>
    issues.push({code,subject,message,severity});
 if(options.mission&&options.mission!==plan.mission)
  add('mission-mismatch','mission',
    'Session operation '+options.mission+' differs from encounter '+plan.mission,
    options.explicitOverride?'advisory':'error');
 if(plan.building!==site.archetype)
  add('building-mismatch','encounter','Encounter building differs from site');
 if(plan.scale!==(site.scale??'standard'))
  add('scale-mismatch','encounter','Encounter scale differs from site');
 const actors=plan.actors;
 if(site.enemies.length!==actors.length)
  add('hostile-count','population','Site enemy anchors and actors differ');
 if(plan.diagnostics.placedHostiles!==actors.length)
  add('placed-count','diagnostics','Placed count differs from actual actors');
 if(!admissibleHostileCount({
    mission:plan.mission,premise:plan.premise,risk:plan.risk
   },actors.length))
  add('mission-minimum','population','Mission has too few armed actors');
 if(actors.length>plan.hostileBudget)
  add('budget-exceeded','population','Placed actors exceed hostile budget');
 const ids=new Set<string>(),groups=new Map(plan.groups.map(g=>[g.id,g]));
 if(groups.size!==plan.groups.length)
  add('duplicate-group','groups','Repeated group ID');
 for(let i=0;i<actors.length;i++){
  const actor=actors[i];
  if(ids.has(actor.id))add('duplicate-actor',actor.id,'Repeated hostile ID');
  ids.add(actor.id);
  const anchor=site.enemies[i];
  if(!anchor||!same(anchor,actor.position))
   add('position-mismatch',actor.id,'Actor and physical spawn anchor differ');
  if(site.enemyHeadings&&
     Math.abs((site.enemyHeadings[i]??NaN)-actor.heading)>.001)
   add('heading-mismatch',actor.id,'Heading and spawn view differ');
  const group=groups.get(actor.groupId);
  if(!group||!group.members.includes(actor.id))
   add('missing-membership',actor.id,'Actor does not belong to its declared group');
 }
 for(const group of plan.groups){
  const members=new Set<string>();
  for(const id of group.members){
   if(members.has(id))add('duplicate-member',group.id,'Group repeats '+id);
   members.add(id);
   if(!ids.has(id)||actors.find(a=>a.id===id)?.groupId!==group.id)
    add('orphan-member',group.id,'Group refers to unassigned actor '+id);
  }
 }
 const targets=actors.filter(a=>a.role==='target').length;
 if(plan.mission==='capture'&&targets!==1)
  add('capture-target','mission','CAPTURE must have exactly one tagged hostile');
 if(plan.mission!=='capture'&&targets!==0)
  add('orphan-target','mission','Non-capture plan contains a capture target');
 const neutralIds=new Set<string>();
 for(const civil of plan.neutrals??[]){
  if(neutralIds.has(civil.id)||ids.has(civil.id))
   add('duplicate-neutral',civil.id,'Civilian ID overlaps another participant');
  neutralIds.add(civil.id);
  if(!site.rooms.some(r=>r.id===civil.roomId&&r.kind==='room'))
   add('unknown-civilian-room',civil.id,'Civilian home room does not exist');
 }
 if((plan.neutrals??[]).filter(c=>c.isRescueTarget).length>1)
  add('duplicate-rescue-target','mission','Multiple designated rescue persons');
 return issues;
}
