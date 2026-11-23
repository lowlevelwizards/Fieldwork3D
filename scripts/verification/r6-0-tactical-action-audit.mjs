/**
 * R6.0 — READ-ONLY tactical action ownership and duplication inventory.
 * node scripts/verification/r6-0-tactical-action-audit.mjs --check
 * node scripts/verification/r6-0-tactical-action-audit.mjs --json
 * This is a source contract, NOT gameplay acceptance or proof of semantic
 * equivalence. No simulation, motor, DOM, replay, or production code runs.
 */
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const R60_STAGE='R6.0';
export const R60_READ_ONLY=true;

/** One existing fixed-step dispatcher. Never create a second motor or clock. */
export const R60_ORDER_OWNERS=Object.freeze({
 'tool':'src/breach-order-entry.ts',
 'recover-medical':'src/breach-order-medical.ts',
 'evacuate':'src/breach-order-medical.ts',
 'treat':'src/breach-order-medical.ts',
 'move':'src/breach-order-movement.ts',
 'door':'src/breach-order-door.ts',
 'wait':'src/breach-order-executor.ts',
 'holdClear':'src/breach-order-executor.ts',
 'look':'src/breach-order-movement.ts',
 'sync':'src/breach-order-utility.ts',
 'pie':'src/breach-order-movement.ts',
 'reload':'src/breach-order-utility.ts',
 'flash':'src/breach-order-utility.ts',
 'interact':'src/breach-order-interactions.ts',
 'switch-weapon':'src/breach-order-utility.ts'
});

/** Classification for the complete PlanNode.interaction discriminant.
 * These categories describe current user intent; they do NOT grant access,
 * determine range, or replace GO-time checks. Each action retains its rules.
 */
export const R60_INTERACTIONS=Object.freeze({
 'push':{class:'object-contact',planner:'planNearbyInteraction'},
 'open-window':{class:'object-contact',planner:'planNearbyInteraction'},
 'close-window':{class:'object-contact',planner:'planNearbyInteraction'},
 'secure-civilian':{class:'person-contact',planner:'planCivilianInteraction'},
 'follow-civilian':{class:'voice',planner:'planCivilianInteraction'},
 'stop-following-civilian':{class:'voice',planner:'planCivilianInteraction'},
 'restrain-civilian':{class:'person-contact',planner:'planCivilianInteraction'},
 'release-civilian':{class:'release',planner:'planCivilianRelease'},
 'release-capture-target':{class:'release',planner:'planCaptureTransportRelease'},
 'challenge-suspect':{class:'voice',planner:'planSuspectChallenge'},
 'restrain-suspect':{class:'person-contact',planner:'planSuspectRestraint'},
 'search-suspect':{class:'person-contact',planner:'planSearchSuspect'},
 'secure-firearm':{class:'object-contact',planner:'planSecureDroppedFirearm'},
 'escort-suspect':{class:'voice',planner:'planSuspectEscort'},
 'stop-escorting-suspect':{class:'voice',planner:'planSuspectEscort'},
 'power-on':{class:'object-contact',planner:'planSitePowerControl'},
 'power-off':{class:'object-contact',planner:'planSitePowerControl'}
});
/** Contextual command lexemes are separate from PlanKinds: some alter
 * planning settings, while some emit authored interactions or other orders.
 * Dynamic ctxTreat/ctxPower/ctxTool parameters are NOT separate types. */
export const R60_CONTEXT_COMMANDS=Object.freeze([
 'ctxCarryCapture','ctxCarryCivilian','ctxChallengeSuspect','ctxClose',
 'ctxDelete','ctxDragCapture','ctxDragCivilian','ctxEscortSuspect',
 'ctxFire','ctxFollowCivilian','ctxFormationCycle','ctxKick','ctxOpen',
 'ctxPace','ctxPower','ctxReleaseCapture','ctxReleaseCivilian',
 'ctxReload','ctxRestrainCivilian','ctxRestrainSuspect','ctxResumeEntry',
 'ctxResumeSquad','ctxSearchSuspect','ctxSecureCivilian',
 'ctxSecureFirearm','ctxSquadEntry','ctxStackTeam','ctxStance',
 'ctxStopEscortSuspect','ctxStopFollowingCivilian','ctxSwitchWeapon',
 'ctxTool','ctxTreat','ctxWait','ctxWindow'
]);
export const R60_METHODS=Object.freeze({
 door:['open','close','kick','hold'],
 tool:['pick','pry','cut','wedge','unwedge','breach']
});
export const R60_PALETTE_ONLY=Object.freeze(['ctxWatch']);

export const R60_CLASSES=Object.freeze([
 'voice','person-contact','object-contact','release'
]);

/** Existing owners, in causal order. The implementation audit must not
 * accidentally flatten selection, authority and presentation together. */
export const R60_BOUNDARIES=Object.freeze([
 ['palette','src/ui/tactical-palette-controller.ts','availablePaletteActions'],
 ['context command','src/breach-tactical-context-command.ts','dispatchTacticalContextCommand'],
 ['planning','src/breach-game.ts','planCivilianInteraction'],
 ['authored schema','src/breach-plan.ts','export type PlanKind='],
 ['GO dispatcher','src/breach-order-executor.ts','createOrderExecutor'],
 ['GO interaction','src/breach-order-interactions.ts','createInteractionOrderHandler'],
 ['GO medical','src/breach-order-medical.ts','createMedicalOrderHandler'],
 ['GO door','src/breach-order-door.ts','createDoorOrderHandler'],
 ['GO entry','src/breach-order-entry.ts','createEntryOrderHandler'],
 ['physical standpoint','src/breach-person-contact-standpoint.ts','personContactStandpoint'],
 ['physical motor','src/breach-actor-motor.ts','advanceActorMotor'],
 ['order lifecycle','src/breach-order-lifecycle.ts','failCurrentOrder'],
 ['execution status','src/breach-execution-state.ts','executionStatus'],
 ['execution event','src/breach-execution-events.ts','executionTransition'],
 ['notice queue','src/ui/execution-feedback.ts','ExecutionNoticeFeed'],
 ['notice presentation','src/ui/live-execution-presentation.ts','liveExecutionNotice'],
 ['HUD','src/ui/tactical-hud-controller.ts','renderNotice'],
 ['replay','src/breach-replay.ts','class MissionRecorder']
]);
export const R60_REPEATED_POLICY=Object.freeze([
 {id:'physical-person-reach',symbol:'PERSON_CONTACT_REACH',
  files:['src/breach-game.ts','src/breach-order-interactions.ts',
   'src/breach-tactical-context-command.ts','src/breach-civilian-context-selection.ts']},
 {id:'civilian-voice-reach',symbol:'CIVILIAN_VOICE_RANGE',
  files:['src/breach-game.ts','src/breach-order-interactions.ts',
   'src/breach-civilian-context-selection.ts']},
 {id:'suspect-voice-reach',symbol:'SUSPECT_ESCORT_VOICE_RANGE',
  files:['src/breach-game.ts','src/breach-order-interactions.ts',
   'src/breach-tactical-context-command.ts']},
 {id:'contact-standpoint',symbol:'personContactStandpoint',
  files:['src/breach-order-interactions.ts','src/breach-person-contact-standpoint.ts']},
 {id:'order-result',symbol:'failCurrentOrder',
  files:['src/breach-order-lifecycle.ts','src/breach-order-interactions.ts',
   'src/breach-order-medical.ts','src/breach-order-door.ts']}
]);
export const R60_OUT_OF_BAND=Object.freeze([
 {name:'automatic optional intel collection',owner:'src/breach-optional-intel.ts',
  note:'Fixed-step proximity interaction, not a PlanNode.interaction subtype'},
 {name:'tactical temporary arming',owner:'src/breach-tactical-interaction-state.ts',
  note:'UI intent only, never an authored order or a second execution state'},
 {name:'actual physical arrivals',owner:'src/breach-order-outcome.ts',
  note:'Queue depletion is not proof of reached goal or successful action'},
 {name:'door capability gate',owner:'src/breach-interactions.ts',
  note:'Door-only physical verdict, not a universal actor action dispatcher'}
]);

const words=(text)=>[...text.matchAll(/'([^']+)'/g)].map(m=>m[1]);
export function declaredActionTypes(planSource){
 const kinds=planSource.match(/export\s+type\s+PlanKind\s*=\s*([^;]+);/);
 const interactions=planSource.match(/\binteraction\?\s*:\s*([\s\S]*?);/);
 if(!kinds||!interactions)throw new Error('R6.0 missing PlanNode discriminants');
 return {kinds:words(kinds[1]),interactions:words(interactions[1])};
}
export function declaredMethodTypes(planSource){
 const door=planSource.match(/export\s+type\s+DoorMethod\s*=\s*([^;]+);/);
 const tool=planSource.match(/\btoolMethod\?\s*:\s*([^;]+);/);
 if(!door||!tool)throw new Error('R6.0 missing door/tool method discriminants');
 return {door:words(door[1]),tool:words(tool[1])};
}
export function observedContextActions(commandSource){
 return [...new Set([...commandSource.matchAll(/\bctx[A-Z][A-Za-z]+/g)]
  .map(x=>x[0]))].sort();
}
const sameValues=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const distinct=(a)=>new Set(a).size===a.length;

export function inspectR60(root=ROOT){
 const problems=[],cache=new Map();
 const source=(path)=>{
  if(!cache.has(path)){
   const full=join(root,path);
   cache.set(path,existsSync(full)?readFileSync(full,'utf8'):null);
  }
  return cache.get(path);
 };
 const schema=source('src/breach-plan.ts');
 let declared={kinds:[],interactions:[]};
 try{declared=declaredActionTypes(schema??'');}
 catch(e){problems.push(String(e.message));}
 if(!distinct(declared.kinds)||!distinct(declared.interactions))
  problems.push('duplicate action discriminator');
 if(!sameValues(declared.kinds,Object.keys(R60_ORDER_OWNERS)))
  problems.push('PlanKind drift: update R6.0 kind ledger before implementation');
 if(!sameValues(declared.interactions,Object.keys(R60_INTERACTIONS)))
  problems.push('PlanNode.interaction drift: classify new subtype explicitly');
 let methods={door:[],tool:[]};
 try{methods=declaredMethodTypes(schema??'');}
 catch(e){problems.push(String(e.message));}
 if(!sameValues(methods.door,R60_METHODS.door)||
    !sameValues(methods.tool,R60_METHODS.tool))
  problems.push('Door/tool method drift: refresh R6.0 method ledger');
 if(!distinct(methods.door)||!distinct(methods.tool))
  problems.push('Duplicate door/tool method discriminator');
 const contexts=observedContextActions(
  source('src/breach-tactical-context-command.ts')??'');
 if(!sameValues(contexts,R60_CONTEXT_COMMANDS))
  problems.push('Context command drift: update R6.0 contextual ledger');
 for(const action of R60_PALETTE_ONLY)
  if(!(source('src/ui/tactical-palette-controller.ts')??'').includes(action))
   problems.push('Missing palette-only command '+action);
 const orders=Object.entries(R60_ORDER_OWNERS).map(([name,path])=>{
  const text=source(path);
  const observed=!!text&&text.includes("'"+name+"'");
  if(!observed)problems.push('Missing order handler reference '+name+' in '+path);
  return {name,owner:path,handlerEvidence:observed};
 });
 const planner=source('src/breach-game.ts')??'';
 const handler=source('src/breach-order-interactions.ts')??'';
 const interactions=Object.entries(R60_INTERACTIONS).map(([name,spec])=>{
  const planningEvidence=planner.includes(spec.planner);
  const executionEvidence=handler.includes("'"+name+"'");
  if(!planningEvidence||!executionEvidence)
   problems.push('Missing planned/GO source evidence for '+name);
  return {name,class:spec.class,planner:spec.planner,
   plannerEvidence:planningEvidence,executor:'src/breach-order-interactions.ts',
   executionEvidence};
 });
 const boundaries=R60_BOUNDARIES.map(([stage,path,symbol])=>{
  const observed=source(path)?.includes(symbol)??false;
  if(!observed)problems.push('Boundary drift '+stage+': '+path+' :: '+symbol);
  return {stage,path,symbol,observed};
 });
 const duplication=R60_REPEATED_POLICY.map(({id,symbol,files})=>{
  const matches=files.map(path=>({path,found:source(path)?.includes(symbol)??false}));
  if(matches.some(x=>!x.found))
   problems.push('Referenced policy no longer matches '+id+'; re-audit');
  return {id,symbol,matches,
   caveat:'Cross-layer repeated use, not proof of duplicate authority or wrong gameplay'};
 });
 const outOfBand=R60_OUT_OF_BAND.map(x=>{
  if(source(x.owner)===null)problems.push('Out-of-band owner missing '+x.owner);
  return {...x};
 });
 for(const [name,spec] of Object.entries(R60_INTERACTIONS))
  if(!R60_CLASSES.includes(spec.class))problems.push('Unknown class '+name);
 return {stage:R60_STAGE,readOnly:true,
  declared,methods,contextActions:contexts,orders,interactions,boundaries,duplication,outOfBand,problems,
  caveat:'Static source evidence only; does not execute or validate physical gameplay'};
}
export function verifyR60(report){
 if(!report.readOnly||report.problems.length)
  throw new Error('R6.0 audit failed: '+(report.problems.join('; ')||'not read-only'));
 if(report.orders.length!==15||report.interactions.length!==17||
    report.contextActions.length!==35||report.methods.door.length!==4||
    report.methods.tool.length!==6)
  throw new Error('R6.0 incomplete action census');
 return true;
}
export function renderR60(report){
 const lines=[
  '# R6.0 — Generated tactical action inventory',
  '',
  'Read-only: yes. Source-level evidence only; not measured runtime behavior.',
  'Declared kinds: '+report.declared.kinds.length+
   ' · interaction variants: '+report.declared.interactions.length+
   ' · contextual command lexemes: '+report.contextActions.length+
   ' · door methods: '+report.methods.door.length+
   ' · tool methods: '+report.methods.tool.length,
  '',
  '## Order owners',
  '| PlanKind | Existing handler | Found |',
  '| --- | --- | --- |'
 ];
 for(const x of report.orders)
  lines.push('| '+x.name+' | '+x.owner+' | '+x.handlerEvidence+' |');
 lines.push('','## Context actions (selection/authoring, not a new GO authority)',
  report.contextActions.join(', '),
  '','Door methods: '+report.methods.door.join(', '),
  'Tool methods: '+report.methods.tool.join(', '),
  'Palette-only command identifiers: '+R60_PALETTE_ONLY.join(', '));
 lines.push('','## Interaction lifecycle candidates',
  '| Action | Class | Existing planner | GO owner | Planning/GO found |',
  '| --- | --- | --- | --- | --- |');
 for(const x of report.interactions)
  lines.push('| '+x.name+' | '+x.class+' | '+x.planner+
   ' | '+x.executor+' | '+x.plannerEvidence+'/'+x.executionEvidence+' |');
 lines.push('','## Existing execution and feedback boundaries',
  '| Stage | Owner | Evidence |','| --- | --- | --- |');
 for(const x of report.boundaries)
  lines.push('| '+x.stage+' | '+x.path+' | '+x.observed+' |');
 lines.push('','## Repeated policy references (candidates, not defects)');
 for(const x of report.duplication)
  lines.push('- '+x.id+' ('+x.symbol+'): '+x.matches.map(y=>y.path).join(', '));
 lines.push('','## Explicitly out-of-band',
  ...report.outOfBand.map(x=>'- '+x.name+' — '+x.owner+': '+x.note),
  '','## Safety boundary',
  'No action execution, collision, simulation timing, visibility, replay, saved game, or UI mutations.',
  'Preserve distinct GO-time checks; no client-side selection grants physical authority.',
  'Do not infer that repeated imports imply duplicate gameplay rules.',
  '','Audit problems: '+report.problems.length);
 if(report.problems.length)lines.push(...report.problems.map(x=>'- '+x));
 return lines.join('\n')+'\n';
}
function main(){
 const report=inspectR60();
 if(process.argv.includes('--check'))verifyR60(report);
 if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(report,null,2)+'\n');
 else process.stdout.write(renderR60(report));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main();
