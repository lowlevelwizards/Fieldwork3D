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
import {generateSite} from '../src/breach-site.ts';
import {newSession,planSquadEntry,toggling} from '../src/breach-game.ts';
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
  '--audit-scale=standard','--progress','--queue-motion-witness'
 ],{cwd:root,maxBuffer:18*1024*1024,timeout:120000,encoding:'utf8'}));
 const mode=report.rows[0].modes.find(m=>m.mode==='entry');
 const rook=mode.operators.find(o=>o.id==='rook');
 console.log('D333_LIVE_QUEUE_MOTION',JSON.stringify({
  events:run.queueMotionEvidence?.length??0,
  yielded:run.queueMotionEvidence?.filter(e=>
   e.source==='opening-leaf-yield')?.slice(0,14)??[],
  sources:run.queueMotionEvidence?.reduce((r,e)=>{
   r[e.source]=(r[e.source]??0)+1;return r;
  },{})??{}
 }));
 console.log('D333_TOWNHOUSE_ENTRY',JSON.stringify({
  arrivals:mode.arrivals,rook:{
   outcome:rook.outcome,remaining:rook.remaining,
   blocker:rook.lastBlocker,position:rook.position,
   door:rook.doorEpisode},
  operators:mode.operators.map(o=>({id:o.id,outcome:o.outcome,
   remaining:o.remaining,failedOrders:o.failedOrders})),
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
 rook.stopped=false;rook.blockedTime=35.7;rook.lastBlocker='route';
 rook.plan=[{id:10,kind:'move',p:{x:493,y:544.88},entryDoorId:'FRONT'}];
 rook.doorTraversal={doorId:'FRONT',phase:'blocked',
  maneuver:'grab-and-hold',authoredOrderId:10};
 ash.stopped=false;
 const wait={id:13,kind:'wait',p:{...ash.p},duration:0,doorId:'FRONT'},
  next={id:14,kind:'move',p:{x:470,y:600},entryDoorId:'FRONT'};
 ash.plan=[wait,next];
 const orderIds=ash.plan.map(n=>n.id),before={...ash.p};
 const gap=p=>Math.hypot(p.x-rook.p.x,p.y-rook.p.y);
 const accepted=relieveGeneratedEntryWaitCollision(game,ash,wait,1/60);
 console.log('D333_FROZEN_WAIT_YIELD',JSON.stringify({
  accepted,from:before,to:ash.p,
  beforeGap:gap(before),afterGap:gap(ash.p),
  stillWaiting:ash.plan[0]?.kind==='wait',
  followUp:ash.plan[1]?.entryDoorId
 }));
 assert.equal(accepted,true,'an overlapped generated WAIT must yield via real motor');
 assert.ok(gap(ash.p)>gap(before)+.025,'the follower physically separates from lead');
 assert.deepEqual(ash.plan.map(n=>n.id),orderIds,'WAIT and authored ENTRY untouched');
 assert.equal(rook.p.x,positions.rook.x,'cannot teleport or shift blocked lead');
});

test('D3.33 inspect unchanged production-generated FRONT wait activation flags',()=>{
 const site=generateSite(9568385,'standard',undefined,
  {mission:'intel'},{archetype:'townhouse'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const session=newSession(0,9568385,'full-view',site.scale??'standard',
  'intel',quiet,{enableCivilians:false});
 assert.equal(planSquadEntry(session,'FRONT'),true);
 const snapshot=()=>session.operators.filter(a=>a.side==='blue')
  .map(a=>({id:a.id,stopped:a.stopped,blockedTime:a.blockedTime,
   plan:a.plan.slice(0,3).map(n=>({id:n.id,kind:n.kind,
    doorId:n.doorId??null,entryDoorId:n.entryDoorId??null,
    duration:n.duration??null}))}));
 const before=snapshot();
 toggling(session);
 const after=snapshot();
 console.log('D333_LIVE_GENERATED_WAIT_FLAGS',JSON.stringify({before,after}));
 assert.equal(after.length,4);
 assert.ok(after.some(a=>a.plan[0]?.kind==='wait'));
});
