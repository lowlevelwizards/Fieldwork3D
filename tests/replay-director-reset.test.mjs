import test from 'node:test';
import assert from 'node:assert/strict';
import {composeReplayDirectorShots,ReplayDirectorStoryboard}
  from '../src/breach-replay-director-reset.ts';
import {directorShoulderSide}
  from '../src/breach-replay-director-shots.ts';
import {selectDirectorEditorialShot}
  from '../src/breach-replay-director-edit.ts';

const p=(x,y)=>({x,y});
const room={id:'main',x:0,y:0,w:500,h:400};
const rook={id:'rook',side:'blue',health:4,p:p(175,180),
  velocity:12,heading:0};
const ash={id:'ash',side:'blue',health:4,p:p(300,220),
  velocity:4,heading:Math.PI};
const editorial=(actor,kind='follow',axis=p(1,0),target=null)=>({
  id:kind+':'+actor.id,kind,priority:kind==='engage'?6:2.6,
  primaryActorId:actor.id,secondaryActorIds:[],
  target,door:null,interest:null,doorId:null,
  actionDirection:axis,required:target?[actor.p,target]:[actor.p],
  optional:[],firstEntry:false,reason:'test recorded evidence'
});
const ctx=(plan)=>({
  intents:[],upcoming:null,editorial:plan,
  doors:[],cover:[],usableWidth:.81,usableHeight:.76
});
const compose=(actor,plan,rooms=[room])=>composeReplayDirectorShots(
  1,[rook,ash],rooms,[],.85,Math.PI,1100,ctx(plan));

test('reset camera offers only genuine action-axis shoulder shots',()=>{
  const shots=compose(rook,editorial(rook));
  assert.ok(shots.length>0,'there must be a legal shoulder');
  assert.ok(shots.length<=2,'one shot family, at most two side options');
  for(const shot of shots){
    assert.notEqual(directorShoulderSide(shot),0);
    const offset=p(shot.cameraAnchor.x-rook.p.x,
      shot.cameraAnchor.y-rook.p.y);
    assert.ok(offset.x<0,'behind, irrespective of incoming tactical yaw');
    assert.ok(Math.abs(offset.y)>=42,'a far lateral shoulder');
    assert.equal(shot.primaryActorId,'rook');
  }
});

test('recomputed shoulders use the actual look axis, not the route',()=>{
  const plan=editorial(rook,'follow',p(1,0));
  const look={...ctx(plan),
    intents:[{actorId:'rook',watchDirection:p(0,-1),speed:12}]};
  const shots=composeReplayDirectorShots(1,[rook],[room],[],
    .85,0,1100,look);
  assert.ok(shots.length);
  for(const shot of shots){
    assert.ok(shot.actionAxis.y<-.99);
    assert.notEqual(directorShoulderSide(shot),0);
    assert.ok(shot.cameraAnchor.y>rook.p.y+20,
      'camera is behind the look toward north');
  }
});

test('tiny rooms fail safely instead of inventing frontal or x-ray angles',()=>{
  const tiny={id:'tiny',x:150,y:155,w:49,h:49};
  assert.deepEqual(compose(rook,editorial(rook),[tiny]),[]);
});

test('a noisy opposite-shoulder bid cannot flip a stable camera',()=>{
  const shots=compose(rook,editorial(rook));
  assert.ok(shots.length===2);
  const initial=shots.find(s=>directorShoulderSide(s)===1);
  const other=shots.find(s=>directorShoulderSide(s)===-1);
  const board=new ReplayDirectorStoryboard(5,t=>t<.5?
    [initial]:[{...other,decisionScore:10000},initial],
    {rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  for(const t of [0,.25,.5,.75,1,2]){
    const shot=board.sample(t);
    assert.equal(directorShoulderSide(shot),1,
      'a valid established shoulder is not an arbitrary reverse shot');
  }
});

test('new disclosed contact can switch actors without pre-revealing a cut',()=>{
  const travel=compose(rook,editorial(rook))[0];
  const contact=compose(ash,editorial(ash,'engage',p(-1,0),
    p(230,190)))[0];
  assert.ok(travel&&contact);
  const frames=t=>t<1?[travel]:[contact];
  const board=new ReplayDirectorStoryboard(4,frames,{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.equal(board.sample(.75).primaryActorId,'rook',
    'future actor choice must not show up before its recorded knot');
  assert.equal(board.sample(1).primaryActorId,'ash',
    'the director has no permanent protagonist');
  assert.equal(board.sample(.75).primaryActorId,'rook',
    'repeated seeks reproduce the same edit');
});

test('only film-time changes affect the camera, never sample order',()=>{
  const shots=compose(rook,editorial(rook));
  const board=new ReplayDirectorStoryboard(4,t=>
    t<2?shots:[...shots].reverse(),{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  const first=board.sample(1.25);
  board.sample(3.75);board.sample(.25);
  const second=board.sample(1.25);
  assert.deepEqual(second,first);
  assert.notEqual(directorShoulderSide(first),0);
});

test('after a recorded crossing the entry camera looks INTO the room, never back at the leaf',()=>{
  const entering={...rook,p:p(275,180),heading:0};
  const door={id:'d1',mid:p(230,180),distance:45};
  const plan={...editorial(entering,'entry',p(1,0)),
    id:'entry:d1:rook',door,doorId:'d1',
    firstEntry:true,priority:5.5};
  const shots=composeReplayDirectorShots(1,[entering],[room],[],
    .85,0,1100,ctx(plan));
  assert.ok(shots.length,'entry framing has a legal OTS candidate');
  for(const shot of shots){
    assert.ok(shot.actionAxis.x>.99,
      'action axis follows entry, not the door behind the entrant');
    assert.ok(shot.attentionPoint.x>entering.p.x,
      'attention point is ahead in newly entered space');
    assert.notEqual(directorShoulderSide(shot),0);
  }
});

test('a genuine first crossing cuts from doorway setup to the entrant inside',()=>{
  const outside={...rook,p:p(210,180)};
  const inside={...rook,p:p(340,180)};
  const front={id:'outside',x:0,y:0,w:265,h:400};
  const back={id:'inside',x:265,y:0,w:280,h:400};
  const door={id:'d1',mid:p(265,180),distance:55};
  const setup={...editorial(outside,'door',p(1,0)),door,doorId:'d1',
    id:'door:d1',priority:4.8};
  const entry={...editorial(inside,'entry',p(1,0)),door,doorId:'d1',
    id:'entry:d1:rook',priority:5.5,firstEntry:true};
  const composeAt=(actor,plan)=>composeReplayDirectorShots(1,
    [actor],[front,back],[],.85,0,1100,ctx(plan));
  const before=composeAt(outside,setup)[0];
  const after=composeAt(inside,entry)[0];
  assert.ok(before&&after,'both locations have legal shoulder views');
  const board=new ReplayDirectorStoryboard(4,t=>t<1?[before]:[after],{
    rooms:[front,back],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.equal(board.sample(.75).roomId,'outside');
  assert.equal(board.sample(1).roomId,'inside');
  assert.equal(board.sample(1).primaryActorId,'rook');
  assert.ok(board.sample(1).attentionPoint.x>inside.p.x,
    'the shot follows the entrant, not the doorway they left');
  assert.match(board.sample(1).cameraDecision,/entry/);
});

test('editorial label churn does not cut or preempt a tracking shot',()=>{
  const start=composeReplayDirectorShots(1,[rook],[room],[],
    .85,0,1100,ctx(editorial(rook)))[0];
  const moved={...rook,p:p(185,180)};
  const candidates=composeReplayDirectorShots(1,[moved],[room],[],
    .85,0,1100,ctx({...editorial(moved),id:'fresh:label'}));
  const next=candidates.find(s=>
    directorShoulderSide(s)===directorShoulderSide(start));
  assert.ok(start&&next);
  const board=new ReplayDirectorStoryboard(4,t=>t<1?[start]:[{
    ...next,decisionScore:99999
  }],{rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.equal(board.sample(.5).operatorPoint.x,175);
  const midway=board.sample(.75);
  assert.ok(midway.operatorPoint.x>175&&midway.operatorPoint.x<185,
    'tracking interpolates despite an editorial identifier change');
  assert.equal(board.sample(1).cameraDecision,'track:active-operator');
  assert.equal(directorShoulderSide(board.sample(1)),
    directorShoulderSide(start));
});

test('a substantial corner turn motivates a new forward-looking shoulder',()=>{
  const before=composeReplayDirectorShots(1,[rook],[room],[],
    .85,0,1100,ctx(editorial(rook,'follow',p(1,0))))[0];
  const after=composeReplayDirectorShots(1,[rook],[room],[],
    .85,0,1100,ctx(editorial(rook,'follow',p(0,1))))[0];
  assert.ok(before&&after);
  const board=new ReplayDirectorStoryboard(4,t=>t<1?[before]:[after],{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.ok(board.sample(1).actionAxis.y>.99,
    'camera follows the new visible corridor, not the obsolete corner');
  assert.match(board.sample(1).cameraDecision,/cut:/);
});

test('no legal live subject cannot leave a permanent photograph of an empty door',()=>{
  const initial=compose(rook,editorial(rook))[0];
  const board=new ReplayDirectorStoryboard(4,t=>t<.5?[initial]:[],{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.equal(board.sample(0).primaryActorId,'rook');
  assert.equal(board.sample(2),null,
    'no obsolete snapshot is held indefinitely without live candidates');
});

test('a moving operator is no longer editorially attached to a door behind them',()=>{
  const entrant={...rook,p:p(285,180),velocity:15};
  const door={id:'d1',mid:p(250,180),distance:35,
    a:p(250,150),b:p(250,210),normal:p(1,0),approachSide:1};
  const intent={actorId:'rook',position:entrant.p,heading:0,
    route:[entrant.p,p(350,180)],direction:p(1,0),
    destination:p(350,180),door,kind:'entry',speed:15,
    watchDirection:null,plannedAttention:null,activeRevision:1};
  const plan=selectDirectorEditorialShot(5,[entrant],{
    intents:[intent],upcoming:null,entry:null,contact:null,beat:null});
  assert.ok(plan);
  assert.equal(plan.kind,'follow',
    'operator movement into the room outranks a spent door setup');
});
