import fs from 'node:fs';
import {traceD317RouteOwnership} from './lib/d3-17b-route-timeline.mjs';
const targets=new Map([
 [14462973,{type:'utility',scale:'standard',mode:'authored',actor:'ash',expected:6}],
 [14136777,{type:'motel',scale:'small',mode:'entry',actor:'ash',expected:7}],
 [14354241,{type:'garage',scale:'standard',mode:'entry',actor:'vale',expected:6}]
]);
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('usage: node scripts/report-d3-17b-route-trace.mjs <input.json> <output.json>');
const audit=JSON.parse(fs.readFileSync(input,'utf8')),row=audit.rows?.[0];
const target=targets.get(row?.seed);
if(!target||audit.rows.length!==1||audit.ticks!==2700||
 row.archetype!==target.type||row.scale!==target.scale)
 throw Error('Wrong frozen physical site for D3.17B forensic capture');
const mode=row.modes.find(x=>x.mode===target.mode);
const op=mode?.operators.find(x=>x.id===target.actor);
if(!mode||!op)throw Error('Missing actual operator and mode');
const flagged=mode.progressEvidence.filter(w=>w.actor===target.actor&&
 w.classification==='movement-loop'&&w.suspicious);
if(flagged.length!==target.expected)throw Error(
 'Real 60Hz movement-loop evidence changed without a physics hypothesis: '+
 row.seed+' '+flagged.length+' / '+target.expected);
if(audit.summary.exceptions||audit.summary.invalidPositions||
 audit.summary.corruptedPlans||audit.summary.physicsStepViolations)
 throw Error('Invalid physical trace');
const timeline=traceD317RouteOwnership(mode,target.actor);
if(timeline.totalEvents===0)throw Error('No route-writer evidence recorded');
const outputObject={
 seed:row.seed,archetype:row.archetype,scale:row.scale,
 mode:target.mode,actor:target.actor,flaggedWindows:flagged.length,
 loopWindowSeconds:flagged.map(w=>w.seconds),
 finalOrder:op.activeOrderDetails,position:op.position,
 originalGoal:op.goal,remaining:op.remaining,arrived:op.arrived,
 endDoorEpisode:op.doorEpisode,
 routeTimeline:timeline,
 windows:mode.progressEvidence.filter(w=>w.actor===target.actor),
 doorStates:mode.endDoorStates,physicalSummary:audit.summary
};
fs.writeFileSync(output,JSON.stringify(outputObject,null,2)+'\n');
const route=timeline;
console.log('D317B_ROUTE_TRACE '+JSON.stringify({
 seed:row.seed,mode:target.mode,actor:target.actor,
 flagged:flagged.length,remaining:op.remaining,
 sourceCounts:route.sources,switches:route.switches,
 reversions:route.reversions,
 firstEvents:route.fullEvents.slice(0,12),
 middleEvents:route.fullEvents.filter(e=>e.t>=10&&e.t<=25).slice(0,14),
 lastEvents:route.fullEvents.slice(-12),capped:route.cappedWitness
}));
