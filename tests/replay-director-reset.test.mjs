import test from 'node:test';
import assert from 'node:assert/strict';
import {composeReplayDirectorShots,ReplayDirectorStoryboard}
  from '../src/breach-replay-director-reset.ts';
import {directorShoulderSide}
  from '../src/breach-replay-director-shots.ts';
import {directorEditorialCandidates}
  from '../src/breach-replay-director-edit.ts';
import {directorSubjectImportance}
  from '../src/breach-replay-director-subject.ts';

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

test('temporary lack of a fresh shot cannot deactivate a still-legal director camera',()=>{
  const first=compose(rook,editorial(rook))[0];
  assert.ok(first);
  const board=new ReplayDirectorStoryboard(6,t=>t<.5?[first]:[],{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  assert.equal(board.sample(0).primaryActorId,'rook');
  const held=board.sample(2);
  assert.ok(held,
    'director must not clear its camera anchor merely because a knot has no new bid');
  assert.equal(held.primaryActorId,'rook');
  assert.match(held.cameraDecision,/hold:/);
});

const quietIntent=(actor,speed,direction=p(1,0),extra={})=>({
  actorId:actor.id,position:actor.p,heading:actor.heading,
  route:speed>2?[actor.p,p(actor.p.x+direction.x*70,
    actor.p.y+direction.y*70)]:[actor.p],
  direction,destination:null,door:null,
  kind:speed>2?'travel':'hold',speed,watchDirection:null,
  plannedAttention:null,activeRevision:1,...extra
});
const evidence=(intents,extra={})=>({
  intents,upcoming:null,beat:null,contact:null,
  discovery:null,entry:null,actionLines:[],...extra
});

test('each squad member is auditioned: a moving operator outranks an idle subject',()=>{
  const candidates=directorEditorialCandidates(3,[rook,ash],
    evidence([quietIntent(rook,0),quietIntent(ash,16,p(-1,0))]),5);
  assert.equal(candidates.length,2);
  assert.equal(candidates[0].primaryActorId,'ash');
  assert.ok(candidates[0].subjectImportance>candidates[1].subjectImportance+2);
  assert.match(candidates[0].subjectReason,/moving/);
});

test('currently OBSERVED contact outranks other movement without leaking future target',()=>{
  const quiet=evidence([quietIntent(rook,0),quietIntent(ash,17,p(-1,0))]);
  const before=directorEditorialCandidates(3,[rook,ash],{
    ...quiet,upcoming:{t:3.7,actorId:'rook',kind:'contact',lead:1,weight:6}
  },5);
  assert.equal(before[0].target,null,
    'a future contact cue cannot reveal an unobserved enemy');
  const now=directorEditorialCandidates(4,[rook,ash],{
    ...quiet,contact:{observerId:'rook',target:p(270,180),targetId:'guard'}
  },5);
  assert.equal(now[0].primaryActorId,'rook');
  assert.equal(now[0].kind,'engage');
  assert.deepEqual(now[0].target,p(270,180));
  assert.ok(now[0].subjectImportance>9);
});

test('spent door order is not a more valuable subject than live movement',()=>{
  const door={id:'d1',mid:p(250,180),distance:75,
    a:p(250,150),b:p(250,210),normal:p(1,0),approachSide:1};
  const exiting={...rook,p:p(325,180),velocity:12};
  const intent=quietIntent(exiting,12,p(1,0),{kind:'entry',door});
  const shots=directorEditorialCandidates(4,[exiting,ash],
    evidence([intent,quietIntent(ash,0)]),5);
  const lead=shots.find(x=>x.primaryActorId==='rook');
  assert.equal(lead.kind,'follow',
    'the director must photograph the operator entering, not the spent door');
  assert.match(lead.subjectReason,/moving/);
});

test('director cuts to more active operator but not for near-equal rival quality',()=>{
  const original=compose(rook,editorial(rook))[0];
  const contender=compose(ash,editorial(ash,'follow',p(-1,0)))[0];
  assert.ok(original&&contender);
  const idle={...original,subjectImportance:.6,
    editorialPriority:1,decisionScore:100};
  const mover={...contender,subjectImportance:4.1,
    editorialPriority:2.6,decisionScore:450};
  const board=new ReplayDirectorStoryboard(5,t=>t<1?[idle]:
    [idle,mover],{rooms:[room],walls:[],doors:[],cover:[],
      step:.5,aspect:.85});
  assert.equal(board.sample(1).primaryActorId,'rook',
    'the initial setup gets a short commitment, not a panic cut');
  assert.equal(board.sample(1.5).primaryActorId,'ash',
    'after a meaningful activity advantage the director follows the mover');
  assert.equal(board.sample(2.5).primaryActorId,'ash');
  assert.match(board.sample(1.5).cameraDecision,/more-relevant-operator/);
});

test('two equally active people do not cause repeated higher-score cuts',()=>{
  const start=compose(rook,editorial(rook))[0];
  const rival=compose(ash,editorial(ash,'follow',p(-1,0)))[0];
  assert.ok(start&&rival);
  const a={...start,subjectImportance:4.1,decisionScore:400};
  const b={...rival,subjectImportance:4.4,decisionScore:9999};
  const board=new ReplayDirectorStoryboard(7,t=>t<1?[a]:[a,b],{
    rooms:[room],walls:[],doors:[],cover:[],step:.5,aspect:.85});
  for(const t of [1,2,3,4,5])
    assert.equal(board.sample(t).primaryActorId,'rook',
      'slightly better framing / near-equal activity is not a reason to cut');
});

test('currently recorded friendly firing takes priority over a door setup',()=>{
  const e=evidence([quietIntent(rook,0),quietIntent(ash,0)],{
    actionLines:[{shooterId:'ash',targetId:'enemy',
      start:ash.p,end:p(200,180),hit:true}]
  });
  const assessed=directorSubjectImportance(5,ash,e);
  assert.equal(assessed.score,10);
  assert.match(assessed.reason,/firing/);
  const stories=directorEditorialCandidates(5,[rook,ash],e,5);
  assert.equal(stories[0].primaryActorId,'ash');
});
