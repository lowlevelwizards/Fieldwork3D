import test from 'node:test';
import assert from 'node:assert/strict';
import {composeReplayDirectorShots,ReplayDirectorStoryboard}
  from '../src/breach-replay-director-reset.ts';
import {directorShoulderSide}
  from '../src/breach-replay-director-shots.ts';

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
