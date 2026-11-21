/** D3.33: genuine porch-post depenetration is NOT a cover ghost-pass.
 * Unit tests use the same 8-unit body, 0.75-unit motor step and rectangle
 * collision law; the holdout exercises the unmodified generated Townhouse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {proposeShallowCoverRelease} from '../src/breach-static-cover-release.ts';
import {relieveGeneratedEntryWaitCollision} from '../src/breach-actor-motor.ts';
import {prepareMotorRoute} from '../src/breach-motor-route.ts';
import {releaseEmbeddedMotorActor}
 from '../src/breach-locomotion-clearance.ts';
import {witnessedGeneratedEntryStillness,
 observeGeneratedEntryPhysicalStillness,inspectGeneratedEntryStillness}
 from '../src/breach-generated-entry-stillness.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planSquadEntry,stepSession,toggling} from '../src/breach-game.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment} from '../src/breach-core.ts';
import {doorWouldStrikeActors,doorSwingBlocked} from '../src/breach-door.ts';
import {squeezeFacing,twoSidedSqueezePressure,sweptProfileClear,bodyClear}
 from '../src/breach-navigation.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const post={x:200,y:200,w:10,h:10,fixture:'porch-post'};
const emptyWalls=[];
const bounds={minX:0,minY:0,maxX:500,maxY:500};
function world(cover=[post],walls=emptyWalls){
 return {cover,walls,bounds,revision:0,
  someCoverNearPoint(_p,_r,cb){
   return cover.some((o,i)=>cb(o,i));
  },
  someWallNearPoint(_p,_r,cb){
   return walls.some((o,i)=>cb(o,i));
  }};
}
const depth=(p,o)=>Math.min(o.w/2+8-Math.abs(p.x-o.x),
 o.h/2+8-Math.abs(p.y-o.y));
test('D3.33 only a real sub-stride, strictly outward static post release',()=>{
 const from={x:188,y:188},goal={x:120,y:120};
 const at=proposeShallowCoverRelease(from,goal,[],world());
 assert.ok(at,'starting 1 unit inside expanded post has a lawful outward step');
 assert.ok(Math.hypot(at.x-from.x,at.y-from.y)<=.75001);
 for(let i=1;i<=5;i++){
  const p={x:from.x+(at.x-from.x)*i/5,
   y:from.y+(at.y-from.y)*i/5};
  assert.ok(depth(p,post)<depth(from,post)-.025*i/5,
   'all five physical samples must strictly reduce penetration');
 }
 assert.ok(Math.min(at.x-from.x,at.y-from.y)<-.1,
  'at least one cover-escape component must move outward');
});
test('D3.33 never teleports from deep cover or through walls and peers',()=>{
 const from={x:188,y:188},goal={x:120,y:120};
 assert.equal(proposeShallowCoverRelease({x:200,y:200},goal,[],world()),null,
  'a deep buried body is not a small post graze');
 assert.equal(proposeShallowCoverRelease(from,goal,[],world([])),null,
  'no static overlap means there is nothing to release');
 const wall={a:{x:187.5,y:168},b:{x:187.5,y:208}};
 assert.equal(proposeShallowCoverRelease(from,goal,[],
  world([post],[wall])),null,'full-radius wall clearance never relaxes');
 const peer={x:187,y:187},rejoined=proposeShallowCoverRelease(from,goal,[],
  world([post]),[peer]);
 if(rejoined)assert.ok(
  Math.hypot(rejoined.x-peer.x,rejoined.y-peer.y)>
    Math.hypot(from.x-peer.x,from.y-peer.y)+.02,
  'no new or deeper overlapping actor collision');
});
test('D3.33 real Townhouse 9568385 generated ENTRY improves physical arrivals',()=>{
 const report=JSON.parse(execFileSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-r7-squad-execution.mjs',
  '1','2700','--site-index=1','--audit-seed=9568385',
  '--audit-scale=standard','--progress'
 ],{cwd:root,maxBuffer:18*1024*1024,timeout:120000,encoding:'utf8'}));
 const mode=report.rows[0].modes.find(m=>m.mode==='entry');
 const rook=mode.operators.find(o=>o.id==='rook');
 console.log('D333_TOWNHOUSE_ENTRY',JSON.stringify({
  arrivals:mode.arrivals,rook:{
   outcome:rook.outcome,remaining:rook.remaining,
   blocker:rook.lastBlocker,position:rook.position,
   door:rook.doorEpisode},
  operators:mode.operators.map(o=>({id:o.id,outcome:o.outcome,
   remaining:o.remaining,position:o.position,failedOrders:o.failedOrders})),
  progress:report.progressSummary,summary:report.summary
 }));
 assert.equal(report.summary.invalidPositions,0);
 assert.equal(report.summary.physicsStepViolations,0);
 assert.equal(report.summary.corruptedPlans,0);
 assert.equal(report.summary.exceptions,0);
 assert.equal(mode.operators.length,4);
 assert.ok(mode.arrivals>=1,
  'prove at least one actual ENTRY goal reached; a simulated route is not a result');
 assert.equal(rook.outcome,'arrived','lead must physically reach authored ENTRY');
});

test('D3.33 exact Townhouse recorded open FRONT / porch collision forensics',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const front=s.doors.find(door=>door.id==='FRONT');
 assert.ok(front,'the original generated FRONT entry still exists');
 Object.assign(front,{open:true,openFraction:.998,pushTarget:.998,
  angularVelocity:0,heldBy:null,locked:false,jammed:false,wedged:false});
 const from={x:581.3764972628228,y:552.1087958808527};
 const goal={x:493,y:544.88};
 const w=sessionWorldGeometry(s);
 const cover=w.cover.filter(o=>
  Math.abs(from.x-o.x)<o.w*.5+OPERATOR_RADIUS+5&&
  Math.abs(from.y-o.y)<o.h*.5+OPERATOR_RADIUS+5)
  .map(o=>({id:o.id,fixture:o.fixture,x:o.x,y:o.y,w:o.w,h:o.h,
   depth:Math.min(o.w*.5+OPERATOR_RADIUS-Math.abs(from.x-o.x),
    o.h*.5+OPERATOR_RADIUS-Math.abs(from.y-o.y))}));
 const walls=w.walls.filter(x=>pointToSegment(from,x)<OPERATOR_RADIUS+16)
  .map(x=>({a:x.a,b:x.b,gap:pointToSegment(from,x)}));
 const leafContacts=s.doors.map(d=>({id:d.id,locked:d.locked,
  open:d.open,fraction:d.openFraction,
  gap:pointToSegment(from,doorLeafSegment(d))}))
  .filter(d=>d.gap<OPERATOR_RADIUS+24);
 const candidate=proposeShallowCoverRelease(from,goal,s.doors,w,[],.75);
 const heading=Math.atan2(goal.y-from.y,goal.x-from.x);
 const step={x:from.x+Math.cos(heading)*.75,
  y:from.y+Math.sin(heading)*.75};
 const narrowHeading=squeezeFacing(heading);
 const scans=[];
 for(const frac of [.998,1.05,1.12,1.22,1.4,1.55]){
  front.openFraction=frac;
  scans.push({fraction:frac,leafGap:pointToSegment(from,doorLeafSegment(front)),
   actorStrike:doorWouldStrikeActors({...front,openFraction:.998},
    frac,[from],OPERATOR_RADIUS),
   swingBlocked:doorSwingBlocked({...front,openFraction:.998},
    frac,[from],OPERATOR_RADIUS,w),
   fullBodyCandidate:proposeShallowCoverRelease(from,goal,s.doors,w,[],.75),
   fullBodyAtGoal:bodyClear(step,s.doors,OPERATOR_RADIUS,w),
   twoSided:twoSidedSqueezePressure(from,step,s.doors,w),
   narrowSwept:sweptProfileClear(from,step,s.doors,
    narrowHeading,'squeeze',w)});
 }
 front.openFraction=.998;
 assert.equal(scans[0].twoSided,true,
  'post and fully open leaf must exert actual two-sided shoulder pressure');
 assert.equal(scans[0].narrowSwept,true,
  'a three-sample real torso must clear the exact first 60Hz stride');
 assert.equal(scans[1].swingBlocked,true,
  'a wider door opening would strike Rook: do not force hinge motion');
 console.log('D333_TOWNHOUSE_STATIC_GEOMETRY',JSON.stringify({
  from,goal,passable:w.passable(from,OPERATOR_RADIUS),cover,walls,
  leafContacts,proposal:candidate,scans,
  proposalPassable:candidate? w.passable(candidate,OPERATOR_RADIUS):null
 }));
 assert.ok(leafContacts.some(d=>d.id==='FRONT'));
 assert.ok(cover.length>=1,'the original physical porch-post neighborhood exists');
});

test('D3.33 exact frozen follower WAIT physically yields from Rook without altering orders',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const game=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const front=game.doors.find(door=>door.id==='FRONT');
 assert.ok(front);
 Object.assign(front,{open:true,openFraction:.998,pushTarget:.998,
  angularVelocity:0,heldBy:null,locked:false,jammed:false,wedged:false});
 const positions={
  rook:{x:581.3764972628228,y:552.1087958808527},
  moss:{x:603.9039601753659,y:506.83198008768295},
  ash:{x:575.3091355026891,y:556.5197593347893},
  vale:{x:574.9986529869462,y:480.3891352374075}
 };
 for(const actor of game.operators)if(positions[actor.id])
  actor.p={...positions[actor.id]};
 const rook=game.operators.find(a=>a.id==='rook');
 const ash=game.operators.find(a=>a.id==='ash');
 assert.ok(rook&&ash,'original four generated operators');
 rook.stopped=false;rook.blockedTime=0;rook.lastBlocker='clear';rook.nav=[];
 rook.plan=[{id:10,kind:'move',p:{x:493,y:544.88},entryDoorId:'FRONT'}];
 rook.doorTraversal={doorId:'FRONT',phase:'blocked',
  maneuver:'grab-and-hold',authoredOrderId:10};
 ash.stopped=false;
 const wait={id:13,kind:'wait',p:{...ash.p},duration:0,doorId:'FRONT'},
  next={id:14,kind:'move',p:{x:470,y:600},entryDoorId:'FRONT'};
 ash.plan=[wait,next];
 const orderIds=ash.plan.map(n=>n.id),before={...ash.p};
 const gap=p=>Math.hypot(p.x-rook.p.x,p.y-rook.p.y);
 let accepted=false,acceptedAt=-1;
 for(let tick=0;tick<120;tick++){
  game.seconds=tick/60;
  if(relieveGeneratedEntryWaitCollision(game,ash,wait,1/60)){
   accepted=true;acceptedAt=game.seconds;break;
  }
 }
 console.log('D333_FROZEN_WAIT_YIELD',JSON.stringify({
  accepted,acceptedAt,from:before,to:ash.p,
  beforeGap:gap(before),afterGap:gap(ash.p),
  stillWaiting:ash.plan[0]?.kind==='wait',
  followUp:ash.plan[1]?.entryDoorId
 }));
 assert.equal(accepted,true,
  'real unchanged physical stall must permit later swept WAIT yield');
 assert.ok(acceptedAt>=1.25,
  'no legal follower yield before 1.25s of genuine stationary lead evidence');
 assert.ok(gap(ash.p)>gap(before)+.025,'the follower physically separates from lead');
 assert.deepEqual(ash.plan.map(n=>n.id),orderIds,'WAIT and authored ENTRY untouched');
 assert.equal(rook.p.x,positions.rook.x,'cannot teleport or shift blocked lead');

 // Let the SAME collision-authorized follower yield run to equilibrium,
 // keeping every other actor, leaf, and solid post at the frozen pose.
 const stillAt=game.seconds;
 let extra=0,lastStepAt=stillAt;
 for(let tick=Math.ceil(stillAt*60)+1;tick<2700;tick++){
  game.seconds=tick/60;
  if(relieveGeneratedEntryWaitCollision(game,ash,wait,1/60)){
   extra++;lastStepAt=game.seconds;
  }
 }
 const finalGap=gap(ash.p);
 rook.blockedTime=35.7;
 const originalLead={...rook.p};
 const port={notify:()=>{},hear:()=>{},battleEvent:()=>{},
  cachedEnemyRoute:()=>[],knownShoveCrossing:()=>null,
  ensurePassageSchedule:()=>new Map()};
 const ready=prepareMotorRoute(rook,rook.plan[0].p,1/60,game,port);
 const leadMoved=Math.hypot(rook.p.x-originalLead.x,
  rook.p.y-originalLead.y);
 console.log('D333_FROZEN_QUEUE_EQUILIBRIUM',JSON.stringify({
  extra,finalGap,ash:ash.p,lastStepAt,rookStatus:ready,
  rookStep:leadMoved,rook:rook.p,mode:rook.squeeze?'squeeze':'normal',
  original:originalLead
 }));
 assert.ok(finalGap>=gap(before),'cannot close distance after yielding');

});

test('D3.33 authored WAIT never receives generated-entry yield entitlement',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const game=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const ash=game.operators.find(a=>a.id==='ash');
 assert.ok(ash);
 const wait={id:313,kind:'wait',doorId:'FRONT',duration:0,p:{...ash.p}};
 ash.plan=[wait,{id:314,kind:'move',p:{x:470,y:600}}];
 game.seconds=14;
 const original={...ash.p};
 assert.equal(relieveGeneratedEntryWaitCollision(game,ash,wait,1/60),false);
 assert.deepEqual(ash.p,original);
});

test('D3.33 frozen Rook: a clear teammate gap must produce a genuine narrow motor step',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const game=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const front=game.doors.find(d=>d.id==='FRONT');
 assert.ok(front);
 Object.assign(front,{open:true,openFraction:.998,pushTarget:.998,
  angularVelocity:0,heldBy:null,locked:false,jammed:false,wedged:false});
 const rook=game.operators.find(a=>a.id==='rook');
 const ash=game.operators.find(a=>a.id==='ash');
 const moss=game.operators.find(a=>a.id==='moss');
 const vale=game.operators.find(a=>a.id==='vale');
 assert.ok(rook&&ash&&moss&&vale);
 rook.p={x:581.3764972628228,y:552.1087958808527};
 rook.plan=[{id:10,kind:'move',p:{x:493,y:544.88},entryDoorId:'FRONT'}];
 rook.doorTraversal={doorId:'FRONT',phase:'blocked',
  maneuver:'grab-and-hold',authoredOrderId:10};
 rook.nav=[];rook.blockedTime=35.7;rook.retryRouteAt=0;
 ash.p={x:560,y:575};moss.p={x:604,y:507};vale.p={x:575,y:480};
 const initial={...rook.p};
 // Rook is not granted a recovery on the very first fixed frame.
 let proven=false;
 for(let tick=0;tick<90;tick++){
  game.seconds=tick/60;
  const eligible=witnessedGeneratedEntryStillness(rook,'FRONT',game.seconds);
  if(tick===0)assert.equal(eligible,false,'not a same-frame stall');
  proven ||= eligible;
 }
 assert.equal(proven,true,'frozen Rook really stayed still for 1.25 seconds');
 game.seconds=90/60;
 const port={notify:()=>{},hear:()=>{},battleEvent:()=>{},
  cachedEnemyRoute:()=>[],knownShoveCrossing:()=>null,
  ensurePassageSchedule:()=>new Map()};
 const result=prepareMotorRoute(rook,rook.plan[0].p,1/60,game,port);
 const moved=Math.hypot(rook.p.x-initial.x,rook.p.y-initial.y);
 console.log('D333_FROZEN_LEAD_CLEAR_GAP',JSON.stringify({
  status:result,moved,initial,after:rook.p,
  squeeze:rook.squeeze,blocker:rook.lastBlocker,blocked:rook.blockedTime
 }));
 assert.equal(game.doors.find(d=>d.id==='FRONT').locked,false);
 assert.ok(moved<=.750001,'never exceed one actual fixed-step body stride');
 assert.ok(moved>=.74,'post-clearance motor must take its genuine swept step');
 // The next fixed-clock stage MUST NOT undo that certified narrow motion
 // using the older full-radius static-cover depenetration. Its original
 // fallback remains active if no real owned narrow continuation is safe.
 const valid={...rook.p};game.seconds+=1/60;
 const recovered=releaseEmbeddedMotorActor(rook,rook.plan[0].p,
  game.doors,1/60,sessionWorldGeometry(game),game.seconds);
 console.log('D333_NARROW_OWNERSHIP',JSON.stringify({
  recovered,position:rook.p,firstStep:valid,
  squeeze:rook.squeeze,nav:rook.nav.length
 }));
 assert.equal(recovered,false,'do not undo an owned swept narrow exit');
 assert.deepEqual(rook.p,valid,'full-radius fallback cannot reverse the narrow step');
 const next=prepareMotorRoute(rook,rook.plan[0].p,1/60,game,port);
 const continued=Math.hypot(rook.p.x-valid.x,rook.p.y-valid.y);
 console.log('D333_NARROW_CONTINUATION',JSON.stringify({
  readiness:next,moved:continued,after:rook.p,squeeze:rook.squeeze
 }));
 assert.ok(continued>.70,'next truly legal narrow step must survive handoff');
 const frames=[];
 for(let step=3;step<=10;step++){
  const old={...rook.p};game.seconds+=1/60;
  const embedded=releaseEmbeddedMotorActor(rook,rook.plan[0].p,
   game.doors,1/60,sessionWorldGeometry(game),game.seconds);
  const result=embedded?'embedded-escape':
   prepareMotorRoute(rook,rook.plan[0].p,1/60,game,port);
  const clearance=bodyClear(rook.p,game.doors,OPERATOR_RADIUS,
   sessionWorldGeometry(game));
  frames.push({step,embedded,result,position:{...rook.p},
   moved:Math.hypot(rook.p.x-old.x,rook.p.y-old.y),
   fullBodyClear:clearance,squeeze:rook.squeeze,
   leafGap:pointToSegment(rook.p,doorLeafSegment(front)),
   nav:rook.nav.length});
 }
 console.log('D333_NARROW_BOUNDARY_10',JSON.stringify(frames));
});
test('D3.33 P6: intermittent transient routes cannot erase physically witnessed 1.25s stillness',()=>{
 const actor={p:{x:581.3765,y:552.1088},nav:[],
  plan:[{id:133,kind:'move',entryDoorId:'FRONT',p:{x:493,y:544.88}}],
  doorTraversal:{doorId:'FRONT',maneuver:'grab-and-hold'}};
 for(let tick=0;tick<=78;tick++){
  // The path planner can populate and drop transient routing while the
  // body NEVER physically moves. The same order/door remains active.
  actor.nav=tick%3?[{x:576,y:576}]:[];
  observeGeneratedEntryPhysicalStillness(actor,tick/60);
 }
 actor.nav=[];
 assert.equal(witnessedGeneratedEntryStillness(actor,'FRONT',79/60),true,
  'physical stillness survives failed transient A* proposals');
 actor.p={x:actor.p.x-.3,y:actor.p.y};
 observeGeneratedEntryPhysicalStillness(actor,80/60);
 assert.equal(witnessedGeneratedEntryStillness(actor,'FRONT',81/60),false,
  'a genuine 0.3-unit physical step invalidates the stale stillness');
 for(let tick=82;tick<=164;tick++)
  observeGeneratedEntryPhysicalStillness(actor,tick/60);
 assert.equal(witnessedGeneratedEntryStillness(actor,'FRONT',165/60),true);
 actor.plan[0].id++;
 assert.equal(witnessedGeneratedEntryStillness(actor,'FRONT',166/60),false,
  'a new authored order must get its own 1.25-second observation');
});

test('D3.33 P7: read-only live 60Hz Townhouse doorway recovery gate timeline',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const game=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 const actors=team(game).slice(0,4);
 assert.equal(actors.length,4);
 assert.equal(planSquadEntry(game,'FRONT'),true,
  'original genuine Townhouse generated squad-entry order');
 const rook=actors.find(a=>a.id==='rook'),ash=actors.find(a=>a.id==='ash');
 assert.ok(rook&&ash);
 toggling(game);
 const summary={navZero:0,navPresent:0,stillnessAtLeast125:0,
  stillnessWithNavZero:0,entryMoveNoNav:0,firstEligible:null,
  maxStillnessAge:0,actualSteps:0,stepsAfterAshClear:0};
 const last={...rook.p};
 const marks=[],maneuvers={},positions=[];
 for(let tick=0;tick<2700;tick++){
  stepSession(game,1/60);
  const e=rook.doorTraversal,w=inspectGeneratedEntryStillness(rook,game.seconds),
   front=game.doors.find(d=>d.id==='FRONT'),
   ashGap=Math.hypot(rook.p.x-ash.p.x,rook.p.y-ash.p.y),
   order=rook.plan[0],now=game.seconds;
  if(rook.nav.length)summary.navPresent++;else summary.navZero++;
  if(!rook.nav.length&&order?.kind==='move')summary.entryMoveNoNav++;
  if(w?.age>=1.25){
   summary.stillnessAtLeast125++;
   if(!rook.nav.length)summary.stillnessWithNavZero++;
   if(!summary.firstEligible)summary.firstEligible=Number(now.toFixed(2));
  }
  if(w)summary.maxStillnessAge=Math.max(summary.maxStillnessAge,w.age);
  const moved=Math.hypot(rook.p.x-last.x,rook.p.y-last.y);
  if(moved>.01){summary.actualSteps++;if(ashGap>17)summary.stepsAfterAshClear++;}
  last.x=rook.p.x;last.y=rook.p.y;
  const maneuver=e?.maneuver??'none';maneuvers[maneuver]=(maneuvers[maneuver]??0)+1;
  if(tick%30===0&&(tick>420||tick<120)){
   const mark={time:Number(now.toFixed(2)),
    rook:{x:Number(rook.p.x.toFixed(3)),y:Number(rook.p.y.toFixed(3))},
    nav:rook.nav.length,order:order?.kind??null,entry:order?.entryDoorId??null,
    maneuver,phase:e?.phase??null,still:w?.age!=null?
      Number(w.age.toFixed(2)):null,
    sampleGap:w?.sampleGap!=null?Number(w.sampleGap.toFixed(2)):null,
    ashGap:Number(ashGap.toFixed(2)),ashOrder:ash.plan[0]?.kind??null,
    front:Number((front?.openFraction??0).toFixed(3)),
    blocked:Number(rook.blockedTime.toFixed(2)),
    squeeze:rook.squeeze};
   marks.push(mark);
  }
 }
 console.log('D333_LIVE_GATE_TIMELINE',JSON.stringify({
  summary,maneuvers,initial:marks.slice(0,4),
  during:marks.filter(x=>x.time>=7&&x.time<=21).filter((_,i)=>i%2===0),
  final:marks.slice(-14),
  rook:{position:rook.p,nav:rook.nav.length,plan:rook.plan.slice(0,2)},
  ash:{position:ash.p,plan:ash.plan.slice(0,2)}
 }));
 assert.equal(actors.length,4);
 assert.ok(summary.navZero+summary.navPresent===2700);
});
