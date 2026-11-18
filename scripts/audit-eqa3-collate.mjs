/** EQA3.0: collate immutable CI artifacts into actionable comparative
 * observations. Never feeds gameplay or claims human choices/fun.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root='artifacts/eqa3/';
const read=name=>JSON.parse(readFileSync(root+name,'utf8'));
const structural=read('structural-55.json');
const living=read('living-22.json');
const motor=read('motor-contact-40.json');
const cohorts=['unknown','approximate','confirmed'].map(intel=>read('scout-'+intel+'.json'));
const records=cohorts.flatMap(c=>c.rows.filter(r=>Array.isArray(r.integrity)));
const round=x=>Math.round(x*100)/100;
const n=(rows,fn)=>rows.filter(fn).length;
const countBy=(rows,key)=>Object.fromEntries([...new Set(rows.map(x=>x[key]??'none'))]
 .sort().map(v=>[v,rows.filter(x=>(x[key]??'none')===v).length]));
const actionFailures={};
for(const r of records)for(const a of r.decisions??[]){
 if(a.ok)continue;
 const row=actionFailures[a.action]??={attempts:0,cases:new Set()};
 row.attempts++;row.cases.add([r.seed,r.mission,r.intel,r.insertion].join('|'));
}
const actionFailureReport=Object.fromEntries(Object.entries(actionFailures)
 .sort((a,b)=>b[1].attempts-a[1].attempts)
 .map(([action,row])=>[action,{attempts:row.attempts,cases:row.cases.size}]));
const intel=Object.fromEntries(cohorts.map(c=>{
 const rows=c.rows.filter(r=>Array.isArray(r.integrity));
 return [c.summary.intel,{
  trials:rows.length,completed:n(rows,r=>r.missionStage==='done'),
  secured:n(rows,r=>r.objectiveAt!==null),
  contact:n(rows,r=>r.firstContactAt!==null),
  firstContactWithin1s:n(rows,r=>r.firstContactAt!==null&&r.firstContactAt<=1.01),
  firstContactWithin2s:n(rows,r=>r.firstContactAt!==null&&r.firstContactAt<=2.01),
  firstContactAfter15s:n(rows,r=>r.firstContactAt!==null&&r.firstContactAt>=15),
  noContact:n(rows,r=>r.firstContactAt===null),
  shot:n(rows,r=>r.firstShotAt!==null),
  firstCivilian:n(rows,r=>r.firstCivilianAt!==null),
  rescueSecured:n(rows,r=>r.rescue?.secured),
  rescueEscorted:n(rows,r=>r.rescue?.escorted),
  routeAborts:rows.reduce((s,r)=>s+r.routeAbort,0),
  rejectedOrders:rows.reduce((s,r)=>s+r.rejected,0),
  roomsVisited:rows.reduce((s,r)=>s+r.roomsVisited,0),
  missionStages:countBy(rows,'missionStage'),
  byInsertion:countBy(rows,'insertion'),
  completedByMission:Object.fromEntries([...new Set(rows.map(r=>r.mission))]
   .sort().map(m=>[m,{trials:n(rows,r=>r.mission===m),
    completed:n(rows,r=>r.mission===m&&r.missionStage==='done'),
    secured:n(rows,r=>r.mission===m&&r.objectiveAt!==null)}]))
 }];}));
const groups=new Map();
for(const r of records){
 const key=[r.seed,r.mission,r.intel].join('|');
 const obj=groups.get(key)??{};
 obj[r.insertion==='FRONT'?'front':'alternate']=r;
 groups.set(key,obj);
}
const paired=[...groups.entries()].filter(([,v])=>v.front&&v.alternate)
 .map(([key,{front,alternate}])=>({
  key,seed:front.seed,archetype:front.archetype,mission:front.mission,
  intel:front.intel,otherEntry:alternate.insertion,
  front:{stage:front.missionStage,contact:front.firstContactAt,
   objectiveAt:front.objectiveAt,rooms:front.roomsVisited,
   civilianAt:front.firstCivilianAt,routeAborts:front.routeAbort,
   rejected:front.rejected},
  alternate:{stage:alternate.missionStage,contact:alternate.firstContactAt,
   objectiveAt:alternate.objectiveAt,rooms:alternate.roomsVisited,
   civilianAt:alternate.firstCivilianAt,routeAborts:alternate.routeAbort,
   rejected:alternate.rejected},
  differentFirstPhysicalRoom:front.roomVisitOrder?.[0]?.roomId!==
   alternate.roomVisitOrder?.[0]?.roomId,
  firstContactSecondsDifference:front.firstContactAt!==null&&
   alternate.firstContactAt!==null?
    round(alternate.firstContactAt-front.firstContactAt):null,
  differentStage:front.missionStage!==alternate.missionStage
 }));
const caseRatings=records.map(r=>{
 const flags=[
  ...(r.firstContactAt!==null&&r.firstContactAt<=2?
    ['first-contact-within-2s']:[]),
  ...(r.routeAbort>=2?['multiple-script-route-aborts']:[]),
  ...(r.rejected>=6?['repeated-script-order-rejection']:[]),
  ...(r.mission==='rescue'&&r.missionStage==='extract'&&!r.rescue?.escorted?
    ['rescued-person-not-escorted']:[]),
  ...(r.mission==='rescue'&&r.rescue?.escorted&&r.missionStage!=='done'?
    ['escort-but-not-extracted-by-45s']:[]),
  ...(r.mission==='capture'&&r.firstContactAt!==null&&r.missionStage==='clear'?
    ['contact-without-target-neutralization']:[])
 ];
 return {seed:r.seed,mission:r.mission,building:r.archetype,
  intel:r.intel,entry:r.insertion,missionStage:r.missionStage,
  firstContactAt:r.firstContactAt,rooms:r.roomsVisited,
  rejects:r.rejected,routeAborts:r.routeAbort,flags};
}).filter(r=>r.flags.length>=2)
 .sort((a,b)=>b.flags.length-a.flags.length||
  b.routeAborts-a.routeAborts||b.rejects-a.rejects);
const summary={
  frozenBaselineSource:'EQA3.0 prior workflow run 44420688664',
  structural:structural.summary,
  scout:{total:records.length,invalid:n(records,r=>r.integrity.length>0),
   intel,
   differentFirstRoomPairs:n(paired,r=>r.differentFirstPhysicalRoom),
   pairedEntryCases:paired.length,
   differingStagePairs:n(paired,r=>r.differentStage),
   earlyContactWithin2s:n(records,r=>r.firstContactAt!==null&&r.firstContactAt<=2),
   anyContact:n(records,r=>r.firstContactAt!==null),
   allCompleted:n(records,r=>r.missionStage==='done'),
   allObjectiveSecured:n(records,r=>r.objectiveAt!==null),
   abortedRoutes:records.reduce((s,r)=>s+r.routeAbort,0),
   rejectedOrders:records.reduce((s,r)=>s+r.rejected,0),
   actionFailureReport},
  living:{summary:living.summary,behavior:living.encounterBehavior?.matrix??null,
   source:'scripted gunshot near actual actor at t=1.5s; diagnostic'},
  motor:{summary:motor.summary,exceptions:motor.exceptions??[]}
};
const report={schema:'EQA3.0/consolidated-v1',summary,paired,
 highInterestCases:caseRatings.slice(0,40),
 caveats:[
  'Search driver is one scripted scout with floor-plan geometry; it is NOT a player, full 4-person tactical search or measure of enjoyment.',
  'Room targets come only from the briefed floor plan; the driver never routes to a hidden objective until prior confirmed/discovered intel.',
  'Confirmed initial intel does NOT mean a target was visually discovered. Metrics intentionally keep these separate.',
  'Early contact is evidence of a simulated encounter, not automatically a bad one or a clear indication of whose first sight occurred.',
  'Repeated script order rejections are ambiguous until invalid user commands and actual reachability faults are separated.',
  'No-shot/no-contact can be good stealth; 45-second timeout is not a mission loss.',
  'The old 22-case passive film and 40-case movement probe have different protocols and must never be merged into scout completion denominators.',
  'No rendered iPhone FPS, human reaction or physical input validation performed.'
 ]};
mkdirSync(root,{recursive:true});
writeFileSync(root+'consolidated.json',JSON.stringify(report,null,2)+'\n');
writeFileSync(root+'paired-entry.csv',[
 'seed,mission,intel,other_entry,front_stage,alternate_stage,front_contact,alternate_contact,front_rooms,alternate_rooms,front_rejections,alternate_rejections,front_abort,alternate_abort',
 ...paired.map(r=>[r.seed,r.mission,r.intel,r.otherEntry,
  r.front.stage,r.alternate.stage,r.front.contact??'',
  r.alternate.contact??'',r.front.rooms,r.alternate.rooms,
  r.front.rejected,r.alternate.rejected,r.front.routeAborts,
  r.alternate.routeAborts].join(','))
].join('\n')+'\n');
console.log(JSON.stringify({summary,
 notable:caseRatings.slice(0,16),
 pairedExamples:paired.filter(r=>r.differentStage||
   r.firstContactSecondsDifference!==null&&
   Math.abs(r.firstContactSecondsDifference)>5).slice(0,18)},null,2));
if(summary.scout.invalid||motor.exceptions?.length)process.exitCode=1;
