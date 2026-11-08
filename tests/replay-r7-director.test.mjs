import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDirectorPlanIndex,directorRevisionAt,
  directorIntentsAt,directorIntentGroup}
  from '../src/breach-replay-director-intent.ts';
import {buildDirectorFutureCues,directorFutureAt}
  from '../src/breach-replay-director-events.ts';
import {composeReplayDirectorShot}
  from '../src/breach-replay-director-shots.ts';
import {ReplayDirectorScheduler}
  from '../src/breach-replay-director-scheduler.ts';
const door={id:'D-1',a:{x:160,y:50},b:{x:160,y:110},open:false,openedAt:0};
const ids=['rook','moss','ash','vale'];
const friendlies=new Set(ids);
const frame=(t,positions,plan)=>({t,actors:ids.map((id,i)=>({
 id,p:positions[i],health:3,heading:0,plan:plan?plan(id,i):undefined
}))});
const positions=[{x:89,y:72},{x:98,y:88},{x:105,y:70},{x:117,y:89}];
const nodes=(id,i)=>[
  {id:1,kind:'move',p:{x:136,y:76+(i%2)*15}},
  {id:2,kind:'door',doorId:'D-1',p:{x:160,y:80}},
  {id:3,kind:'move',entryDoorId:'D-1',p:{x:195,y:80}}
];
const revision=(actorId,tick,nodes,order=0)=>({
 actorId,tick,order,revisionId:tick+order+1,
 origin:{x:50,y:80},nodes,phase:'running'
});
test('plan revisions are looked up at the recorded time, never from the future',()=>{
 const index=buildDirectorPlanIndex([
  revision('rook',180,[{id:3,kind:'move',p:{x:550,y:500}}],2),
  revision('rook',60,[{id:1,kind:'move',p:{x:120,y:80}}],1),
  revision('rook',180,[{id:2,kind:'move',p:{x:160,y:80}}],1)
 ]);
 assert.equal(directorRevisionAt(index,'rook',2).tick,60);
 assert.equal(directorRevisionAt(index,'rook',2).nodes[0].p.x,120);
 assert.equal(directorRevisionAt(index,'rook',3).nodes[0].p.x,550);
 assert.equal(directorRevisionAt(index,'rook',.2),null);
 const emptyFrame=frame(3,positions,()=>[]);
 const intent=directorIntentsAt(emptyFrame,index,[door],3,friendlies)
  .find(i=>i.actorId==='rook');
 assert.equal(intent.route.length,1,
  'Explicitly spent orders must not be resurrected from plan journal');
});
test('door stack and path are detected while path overlay is off',()=>{
 const snap=frame(2,positions,nodes);
 const intents=directorIntentsAt(snap,new Map(),[door],2,friendlies);
 assert.equal(intents.length,4);
 assert.equal(directorIntentGroup(intents).count,4);
 assert.ok(intents.every(i=>i.door?.id==='D-1'));
 const actors=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:positions[i]}));
 const result=composeReplayDirectorShot(2,actors,
  [{id:'R1',x:40,y:30,w:220,h:150}],[],.9,0,1100,
  {intents,upcoming:null,maxZoom:6});
 assert.ok(['approach','stack','breach','entry'].includes(result.shotType));
 assert.equal(result.doorId,'D-1');
 assert.equal(result.actorsFramed,4);
 assert.ok(result.focus.x>100,'Camera should lead toward approaching door');
 assert.ok(result.pitch>=20*Math.PI/180&&result.pitch<=44*Math.PI/180);
});
test('future cue anticipates only known friendly participant, no enemy positions',()=>{
 const events=[
  {key:'a',kind:'shot',t:8.5,actor:'unknown',order:0},
  {key:'b',kind:'shot',t:10,actor:'rook',order:1},
  {key:'c',kind:'door',t:11,actor:'moss',order:2},
 ];
 const cues=buildDirectorFutureCues(events,friendlies);
 assert.equal(cues.length,2);
 assert.equal(directorFutureAt(8.8,cues).actorId,'rook');
 assert.equal(directorFutureAt(5,cues),null);
 const actor=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:positions[i]}));
 const intents=directorIntentsAt(frame(9,positions,nodes),
  new Map(),[door],9,friendlies);
 const ctx={intents,upcoming:directorFutureAt(9,cues)};
 const shot=composeReplayDirectorShot(9,actor,[],[],1,0,1200,ctx);
 assert.equal(shot.shotType,'contact');
 assert.ok(shot.subjects.includes('rook'));
 const enemy={id:'enemy',side:'red',health:3,
  heading:Math.PI,p:{x:9999,y:9999}};
 assert.deepEqual(composeReplayDirectorShot(9,[...actor,enemy],[],[],1,0,1200,ctx),shot);
});
test('shot scheduler commits, accepts emergencies and resets on seek',()=>{
 const c=new ReplayDirectorScheduler();
 const base={shotType:'travel',kind:'squad',subjects:['rook','moss'],
   focus:{x:60,y:60},zoom:2,yaw:0,pitch:1,
   score:42,occluded:0,roomId:'R',actorsFramed:2,doorId:null};
 const approach={...base,shotType:'approach',score:44};
 const contact={...base,shotType:'contact',kind:'action',
   score:47,subjects:['rook']};
 assert.equal(c.choose(0,base).shotType,'travel');
 assert.equal(c.choose(1,approach).shotType,'travel');
 assert.equal(c.choose(1.2,contact).shotType,'contact');
 assert.equal(c.choose(.3,approach,true).shotType,'approach');
 assert.equal(c.status.shotType,'approach');
});

test('passed door stops being a target; camera leads the moving team into the next room',()=>{
 const passed=ids.map((id,i)=>({x:216+i*6,y:68+i*8}));
 // A historical entryDoorId can survive on a route waypoint even when
 // everybody is already traveling away from that threshold.
 const planned=frame(6,passed,(id,i)=>[
  {id:1,kind:'move',entryDoorId:'D-1',p:{x:261+i*4,y:70+i*8}},
  {id:2,kind:'move',p:{x:307+i*4,y:70+i*8}}
 ]);
 const intents=directorIntentsAt(planned,new Map(),[door],6,friendlies);
 assert.ok(intents.every(i=>i.door===null),
  'door IDs retained on downstream waypoints must not drag the camera back');
 assert.equal(directorIntentGroup(intents),null);
 const actors=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:passed[i]}));
 const shot=composeReplayDirectorShot(6,actors,[
  {id:'stack-room',x:40,y:20,w:120,h:145},
  {id:'next-room',x:160,y:20,w:240,h:145}
 ],[],1,0,1100,{intents,upcoming:null,maxZoom:6});
 assert.equal(shot.doorId,null);
 assert.equal(shot.shotType,'travel');
 assert.equal(shot.roomId,'next-room');
 assert.equal(shot.actorsFramed,4);
 assert.ok(shot.focus.x>230&&shot.focus.x<285,
  'forward lead must anticipate the drawn route without losing the team');
});
test('director frames the front of the stacked door rather than its rear wall',()=>{
 const intents=directorIntentsAt(frame(2,positions,nodes),
  new Map(),[door],2,friendlies);
 const actors=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:positions[i]}));
 const shot=composeReplayDirectorShot(2,actors,
  [{id:'stack-room',x:40,y:20,w:120,h:145}],[],1,0,1100,
  {intents,upcoming:null,maxZoom:6});
 const normal=directorIntentGroup(intents).door.normal;
 const cameraSide={x:Math.sin(shot.yaw),y:Math.cos(shot.yaw)};
 assert.ok(cameraSide.x*normal.x+cameraSide.y*normal.y>.75,
  'door should be filmed from the operator side, near its face normal');
 assert.ok(shot.pitch<=49*Math.PI/180+1e-7,
  'stack shot should seek a low, graphic, close perspective');
 assert.ok(shot.focus.x>100&&shot.focus.x<160,
  'door and its stacked team must both influence composition');
});
test('a doorway split retains the complete squad rather than abandoning entrants',()=>{
 const split=[{x:128,y:73},{x:144,y:86},
  {x:174,y:71},{x:185,y:88}];
 const splitPlan=(id,i)=>i<2?nodes(id,i):[
  {id:1,kind:'move',entryDoorId:'D-1',p:{x:206,y:80+i*4}},
  {id:2,kind:'move',p:{x:246,y:80+i*4}}
 ];
 const intents=directorIntentsAt(frame(3,split,splitPlan),
  new Map(),[door],3,friendlies);
 const actors=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:split[i]}));
 const shot=composeReplayDirectorShot(3,actors,
  [{id:'R1',x:40,y:20,w:240,h:145}],[],1,0,1100,
  {intents,upcoming:null,maxZoom:6});
 assert.equal(shot.actorsFramed,4,
  'two actors still stacking cannot monopolize the film');
});
test('scheduler follows a breach through entry and releases old door immediately',()=>{
 const scheduler=new ReplayDirectorScheduler();
 const shot={shotType:'breach',kind:'action',subjects:['rook','moss','ash','vale'],
  focus:{x:137,y:81},zoom:4,yaw:1,pitch:.65,score:62,
  occluded:0,roomId:'outside',actorsFramed:4,doorId:'D-1'};
 assert.equal(scheduler.choose(0,shot).shotType,'breach');
 const entry={...shot,shotType:'entry',kind:'squad',
  focus:{x:183,y:82},score:55,roomId:'inside'};
 assert.deepEqual(scheduler.choose(.3,entry).focus,entry.focus,
  'entry movement must override the earlier breach shot hold');
 const departure={...entry,shotType:'travel',doorId:null,
  focus:{x:250,y:86},score:38};
 assert.equal(scheduler.choose(.55,departure).shotType,'travel');
 assert.deepEqual(scheduler.status.doorId,null);
 assert.deepEqual(scheduler.choose(.7,{...departure,
  focus:{x:273,y:89}}).focus,{x:273,y:89},
  'tracking must keep updating without another hard cut');
});

test('moving operators win the camera over a separate idle element',()=>{
 const positions=[{x:42,y:60},{x:54,y:75},
  {x:177,y:64},{x:189,y:78}];
 const f=frame(4,positions,(id,i)=>i<2?[]:[
  {id:1,kind:'move',p:{x:237,y:64+i*6}},
  {id:2,kind:'move',p:{x:292,y:67+i*6}}
 ]);
 for(let i=0;i<4;i++)f.actors[i].velocity=i<2?0:36;
 const intents=directorIntentsAt(f,new Map(),[],4,friendlies);
 const actors=ids.map((id,i)=>({id,side:'blue',health:3,
  heading:0,p:positions[i],velocity:f.actors[i].velocity}));
 const shot=composeReplayDirectorShot(4,actors,[],[],1,0,1100,
  {intents,upcoming:null,maxZoom:9.5});
 assert.deepEqual(shot.subjects,['ash','vale'],
  'the separate advancing element should become the shot');
 assert.equal(shot.shotType,'travel');
 assert.ok(shot.motion>40);
 assert.ok(shot.focus.x>180,
  'the director needs to follow live movement instead of watching idle actors');
});
test('an active moving WATCH blends movement direction with deliberate gaze',()=>{
 const location=[{x:100,y:100},{x:111,y:110}];
 const f=frame(5,location,()=>[
  {id:1,kind:'move',p:{x:181,y:100}},
  {id:2,kind:'move',p:{x:226,y:100}}
 ]);
 f.actors.forEach(a=>{
  a.velocity=36;
  a.aimInstruction={mode:'track',point:{x:a.p.x,y:a.p.y-100}};
 });
 const intents=directorIntentsAt(f,new Map(),[],5,friendlies);
 assert.deepEqual(intents[0].watchDirection,{x:0,y:-1});
 const actors=f.actors.map(a=>({id:a.id,p:a.p,
  side:'blue',health:3,heading:0,velocity:a.velocity}));
 const shot=composeReplayDirectorShot(5,actors,[],[],1,0,1100,
  {intents,upcoming:null,maxZoom:9.5});
 const cameraSide={x:Math.sin(shot.yaw),y:Math.cos(shot.yaw)};
 assert.ok(cameraSide.y>.38&&cameraSide.x<-.1,
  'the camera should be behind the WATCH but retain the direction of travel');
 assert.ok(shot.pitch<=38*Math.PI/180,
  'moving WATCH should be filmed at low over-the-shoulder angles');
 assert.ok(shot.zoom>6,
  'a compact moving pair should be closer than the old tactical zoom cap');
});
test('an authored future WATCH influences direction before becoming active',()=>{
 const positions=[{x:100,y:100},{x:111,y:108}];
 const planned=(id,i)=>[
  {id:1,kind:'move',p:{x:142,y:100+i*8}},
  {id:2,kind:'move',p:{x:179,y:100+i*8},
    aimMode:'track',aimLabel:'watch',
    aimPoint:{x:179,y:-40}},
  {id:3,kind:'move',p:{x:245,y:100+i*8}}
 ];
 const f=frame(2,positions,planned);
 f.actors.forEach(a=>a.velocity=25);
 const intents=directorIntentsAt(f,new Map(),[],2,friendlies);
 assert.equal(intents[0].watchDirection,null,
  'upcoming WATCH is not an already executing order');
 assert.equal(intents[0].plannedAttention.kind,'watch');
 assert.ok(intents[0].plannedAttention.distance>50);
 const actors=f.actors.map(a=>({id:a.id,p:a.p,
  side:'blue',health:3,heading:0,velocity:a.velocity}));
 const ctx={intents,upcoming:null,maxZoom:9.5};
 const anticipated=composeReplayDirectorShot(2,actors,[],[],1,0,1100,ctx);
 const plain=directorIntentsAt(frame(2,positions,(id,i)=>[
  {id:1,kind:'move',p:{x:142,y:100+i*8}},
  {id:2,kind:'move',p:{x:179,y:100+i*8}},
  {id:3,kind:'move',p:{x:245,y:100+i*8}}
 ]),new Map(),[],2,friendlies);
 const baseline=composeReplayDirectorShot(2,actors,[],[],1,0,1100,
  {...ctx,intents:plain});
 const watchFacing={x:Math.sin(anticipated.yaw),
  y:Math.cos(anticipated.yaw)};
 const travelFacing={x:Math.sin(baseline.yaw),
  y:Math.cos(baseline.yaw)};
 assert.ok(watchFacing.y>travelFacing.y+.12,
  'the director should begin anticipating the upcoming authored WATCH');
 assert.ok(anticipated.focus.x>100&&anticipated.focus.x<155,
  'anticipation must not leave the moving squad out of frame');
});
test('a planned door action can pull interest before its order activates',()=>{
 const positions=[{x:49,y:90},{x:59,y:104}];
 const planned=(id,i)=>[
  {id:1,kind:'move',p:{x:96,y:90+i*10}},
  {id:2,kind:'move',p:{x:142,y:90+i*10}},
  {id:3,kind:'door',p:{x:190,y:95},doorId:'D-2'}
 ];
 const f=frame(2,positions,planned);
 f.actors.forEach(a=>a.velocity=26);
 const actors=f.actors.map(a=>({id:a.id,p:a.p,
  side:'blue',health:3,heading:0,velocity:a.velocity}));
 const intents=directorIntentsAt(f,new Map(),[],2,friendlies);
 assert.equal(intents[0].plannedAttention.kind,'action');
 const before=composeReplayDirectorShot(2,actors,[],[],1,0,1100,
  {intents,upcoming:null,maxZoom:9.5});
 const stripped=directorIntentsAt(frame(2,positions,(id,i)=>[
  {id:1,kind:'move',p:{x:96,y:90+i*10}},
  {id:2,kind:'move',p:{x:142,y:90+i*10}}
 ]),new Map(),[],2,friendlies);
 const without=composeReplayDirectorShot(2,actors,[],[],1,0,1100,
  {intents:stripped,upcoming:null,maxZoom:9.5});
 assert.ok(before.focus.x>without.focus.x+2,
  'an unactivated but authored doorway action must shift interest ahead');
 assert.ok(before.zoom>6,'a close moving shot should stay intimate');
});
