import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directorEditorialCandidates}
  from '../src/breach-replay-director-edit.ts';
import {physicalDirectorCandidates,directorCameraLegal}
  from '../src/breach-replay-director-physical.ts';
import {composeReplayDirectorShots}
  from '../src/breach-replay-director-shots.ts';
import {scoreDirectorCandidate}
  from '../src/breach-replay-director-decision.ts';
import {gradeActualDirectorShot}
  from '../src/breach-replay-director-grade.ts';
import {ReplayDirectorStoryboard}
  from '../src/breach-replay-director-storyboard.ts';

const pt=(x,y)=>({x,y});
const room={id:'hall',x:0,y:0,w:400,h:300};
const rooms=[room],walls=[],scene={rooms,walls,cover:[],doors:[]};
const safe={left:-.79,right:.79,top:.7,bottom:-.44};
const actors=[
  {id:'rook',side:'blue',health:4,p:pt(140,120),velocity:12,heading:0},
  {id:'moss',side:'blue',health:4,p:pt(150,180),velocity:8,heading:0},
  {id:'hostile',side:'red',health:4,p:pt(220,120),velocity:0,heading:0}
];
const intent=(id,p,kind='travel')=>({
 actorId:id,position:p,heading:0,direction:pt(1,0),
 speed:12,kind,route:[p,pt(p.x+80,p.y)],
 watchDirection:null,plannedAttention:null,destination:pt(p.x+80,p.y),
 door:null,activeRevision:null
});
const context={intents:[intent('rook',actors[0].p),
 intent('moss',actors[1].p)],upcoming:null,
 beat:null,contact:null,discovery:null,entry:null};
const frame=t=>({t,actors:actors.map(a=>({...a})),
 doors:[],coverState:[],seenGround:[],
 knowledge:{visibleActorIds:[],operatorVisibleActorIds:{
   rook:[],moss:[]},operatorVisibleCivilianIds:{rook:[],moss:[]},
   visibleCivilianIds:[],discoveredBodyIds:[]}});

test('R9.6 story candidates keep the single editor and expose alternative movers',()=>{
  const stories=directorEditorialCandidates(1,actors,context,4);
  assert.ok(stories.length>=2,JSON.stringify(stories));
  assert.equal(new Set(stories.map(s=>s.primaryActorId)).size,
    stories.length);
  assert.ok(stories.every(s=>s.target===null));
  const future=directorEditorialCandidates(1,actors,{
    ...context,upcoming:{kind:'contact',actorId:'rook',
      t:2,lead:1,weight:4}},4);
  assert.ok(future.every(s=>s.target===null),
    'a future contact must not invent enemy coordinates');
});

test('R9.6 existing physical search returns independently legal alternatives',()=>{
  const candidates=physicalDirectorCandidates({
    operator:actors[0].p,focus:pt(185,120),
    subjectPoints:actors.slice(0,2).map(a=>a.p),
    requiredPoints:[actors[0].p],target:null,preferredYaw:0,
    followDirection:pt(1,0),motionSpeed:12,
    composition:{treatment:'follow',baseSpan:1100,
      usableWidth:.79,usableHeight:.76,safeFrame:safe}
  },scene,.46,4);
  assert.ok(candidates.length>=1&&candidates.length<=4);
  for(const candidate of candidates)
    assert.ok(directorCameraLegal(candidate.cameraAnchor,room,scene));
});

test('R9.6 composes scored and disclosure-safe camera alternatives',()=>{
  const options=composeReplayDirectorShots(1,actors,rooms,walls,.46,
    0,1100,{...context,doors:[],cover:[],safeFrame:safe});
  assert.ok(options.length>=1&&options.length<=7);
  assert.ok(options.every(s=>s.contactTargetPoint===null));
  assert.ok(options.every(s=>Number.isFinite(s.decisionScore)&&
    s.decisionBreakdown?.legal));
  for(let i=1;i<options.length;i++)
    assert.ok(options[i-1].decisionScore>=options[i].decisionScore);
});

test('R9.6 decision score and independent displayed grade cannot self-reward',()=>{
  const proposed=composeReplayDirectorShots(1,actors,rooms,walls,.46,
    0,1100,{...context,doors:[],cover:[],safeFrame:safe})[0];
  assert.ok(proposed);
  const opts={shot:proposed,current:frame(1),previous:frame(.5),
    friendlies:new Set(['rook','moss']),visibleHostiles:new Set(),
    rooms,walls,lens:'ortho',aspect:.46,baseSpan:1100,safeFrame:safe};
  const baseline=gradeActualDirectorShot(opts);
  const inflated=gradeActualDirectorShot({...opts,
    shot:{...proposed,score:999999,decisionScore:999999}});
  assert.deepEqual([baseline.score,baseline.grade],
    [inflated.score,inflated.grade]);
  const decision=scoreDirectorCandidate(proposed,{
    scene,aspect:.46,baseSpan:1100,safeFrame:safe});
  assert.ok(decision.legal&&Number.isFinite(decision.score));
});

test('R9.6 storyboard chooses deterministically from multiple shots',()=>{
  const candidates=composeReplayDirectorShots(1,actors,rooms,walls,.46,
    0,1100,{...context,doors:[],cover:[],safeFrame:safe});
  const board=new ReplayDirectorStoryboard(4,()=>candidates,{
    rooms,walls,doors:[],cover:[],aspect:.46,baseSpan:1100,
    usableWidth:.79,usableHeight:.76,safeFrame:safe,step:.5
  });
  const first=board.sample(1);
  const early=board.sample(.5);
  const repeated=board.sample(1);
  assert.ok(first&&early);
  assert.deepEqual(first,repeated);
  assert.ok(first.cameraAnchor&&first.cameraDecision);
});

test('R9.6 final grader does not control cuts',()=>{
  const source=readFileSync(new URL(
    '../src/breach-replay-director-storyboard.ts',import.meta.url),'utf8');
  assert.ok(source.includes('scoreDirectorCandidate'));
  assert.ok(!source.includes('gradeActualDirectorShot'));
  assert.ok(!source.includes('directorGradeLetter'));
});
