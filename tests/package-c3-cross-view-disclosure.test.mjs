/** C3: cross-view disclosure and personal ground cache acceptance.
 * The 2D, 3D, director and Bodycam surfaces must consume one recorded
 * knowledge policy; no playback LOS recomputation or cosmetic overrides.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {applyReplayKnowledge} from '../src/breach-replay-visibility.ts';
import {presentActor,presentCivilian}
 from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {ReplayKnowledgeController} from '../src/breach-replay-knowledge-controller.ts';
import {createBreach2DVisibilityRenderer}
 from '../src/breach-2d-visibility-renderer.ts';

const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('C3 live enemy models/weapon lights use live visibility, never missing replay evidence',()=>{
 try{
  const s=newSession(0,7,'full-view','small'),red=s.operators.find(a=>a.side==='red');
  assert.ok(red);
  applyReplayKnowledge(s,null);
  assert.equal(presentActor(s,red,false,null),true);
  assert.equal(presentActor(s,red,false,{mode:'squad'}),false);
  assert.equal(presentActor(s,red,false,{mode:'operator',observerId:'unknown'}),false);
  assert.equal(presentActor(s,red,false,{mode:'full'}),true);
  const world=read('breach-2d-world-renderer.ts');
  assert.match(world,/import \{presentActor\} from '.\/rendering\/breach-3d-disclosure-presenter\.ts'/);
  assert.match(world,/if\(actor\.side==='red'&&!presentActor\(state,actor,/);
  assert.match(world,/replaying\?replayKnowledge\.disclosure\(\):null\)\)continue/);
  assert.doesNotMatch(world,/replaying\?replayKnowledge\.disclosure\(\):\{mode:'squad'\}/);
 }finally{activateSite(null);}
});

test('C3 2D and 3D share the identical living, dead and civilian disclosure policy',()=>{
 const actor2d=read('breach-2d-actor-renderer.ts');
 const scene3d=read('breach-3d.ts');
 assert.match(actor2d,/import \{presentActor,presentCivilian,presentUnrecordedRescueMarker\}/);
 assert.match(actor2d,/const visible=presentActor\(state,a,/);
 assert.match(actor2d,/if\(!presentCivilian\(state,c,/);
 assert.match(scene3d,/const visible=presentActor\(s,actor,omniscient,replayDisclosurePolicy\)/);
 assert.match(read('rendering/breach-actor-frame-presenter.ts'),
  /presentCivilian\(s,civil,omniscient,replayDisclosurePolicy\)/);
 assert.doesNotMatch(actor2d,/civilianPresentationVisible\(/);
 assert.doesNotMatch(actor2d,/replayCivilianDisclosed\(/);
 assert.doesNotMatch(actor2d,/replayActorDisclosed\(/);
});

test('C3 replay squad missing samples cannot expose current civilians via tactical Full View',()=>{
 try{
  const s=newSession(0,9,'full-view','small');
  const civilian={id:'civil-1',p:{x:180,y:200},replayVisible:undefined};
  applyReplayKnowledge(s,null);
  assert.equal(presentCivilian(s,civilian,false,null),true,'live Full View');
  assert.equal(presentCivilian(s,civilian,false,{mode:'squad'}),false);
  assert.equal(presentCivilian(s,civilian,false,{mode:'operator',observerId:'rook'}),false);
  civilian.replayVisible=true;
  assert.equal(presentCivilian(s,civilian,false,{mode:'squad'}),true,
    'legacy per-frame evidence remains supported');
  applyReplayKnowledge(s,{visibleActorIds:[],visibleCivilianIds:[],
    discoveredBodyIds:[],operatorVisibleCivilianIds:{rook:[]}});
  assert.equal(presentCivilian(s,civilian,false,{mode:'squad'}),false,
    'recorded invisibility overrides obsolete per-civilian flag');
  assert.equal(presentCivilian(s,civilian,false,{mode:'operator',observerId:'rook'}),false);
  assert.equal(presentCivilian(s,civilian,false,{mode:'full'}),true);
  applyReplayKnowledge(s,{visibleActorIds:[],visibleCivilianIds:['civil-1'],
    discoveredBodyIds:[],operatorVisibleCivilianIds:{rook:['civil-1'],ash:[]}});
  assert.equal(presentCivilian(s,civilian,false,{mode:'squad'}),true);
  assert.equal(presentCivilian(s,civilian,false,{mode:'operator',observerId:'rook'}),true);
  assert.equal(presentCivilian(s,civilian,false,{mode:'operator',observerId:'ash'}),false);
 }finally{activateSite(null);}
});

test('C3 personal ground cache distinguishes different equal-sized evidence sets',()=>{
 const previous=globalThis.document,contexts=[];
 const makeCanvas=()=>{
  const canvas={width:0,height:0};
  const ctx={canvas,fillCount:0,save(){},restore(){},
   setTransform(){},clearRect(){},beginPath(){},rect(){},
   fill(){this.fillCount++;}};
  canvas.getContext=()=>ctx;contexts.push(ctx);return canvas;
 };
 try{
  globalThis.document={createElement:()=>makeCanvas()};
  const knowledge=new ReplayKnowledgeController();
  knowledge.omniscient=false;
  knowledge.groundLensOn=true;
  knowledge.observerId='rook';
  const first=new Set(['micro:1,1']),second=new Set(['micro:4,4']);
  let evidence=first;
  knowledge.personalGround={at:()=>evidence};
  const s={site:null},draws=[];
  const renderer=createBreach2DVisibilityRenderer({
   draw:{drawImage:(...args)=>draws.push(args)},getState:()=>s,
   isReplaying:()=>true,getViewMode:()=> 'plan2d',
   replayKnowledge:knowledge,replayPlayback:{time:1},debugPalette:false
  });
  const ctx=contexts[1];
  renderer.renderPersonalGround();
  assert.equal(ctx.fillCount,1);
  renderer.renderPersonalGround();
  assert.equal(ctx.fillCount,1,'same evidence object and count reuses canvas');
  evidence=second;
  renderer.renderPersonalGround();
  assert.equal(ctx.fillCount,2,'different same-size evidence must repaint');
  second.add('fine:10,10');
  renderer.renderPersonalGround();
  assert.equal(ctx.fillCount,3,'mutated set with changed size repaints');
  knowledge.reset();
  assert.equal(knowledge.groundCacheEvidence,null);
  knowledge.observerId='rook';
  knowledge.groundLensOn=true;
  knowledge.personalGround={at:()=>evidence};
  renderer.renderPersonalGround();
  assert.equal(ctx.fillCount,4,'new replay archive invalidates cache');
  assert.equal(draws.length,5,'each frame still draws the cached image');
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});

test('C3 cache identity is representation-only, with no new replay LOS',()=>{
 const fog=read('breach-2d-visibility-renderer.ts');
 const knowledge=read('breach-replay-knowledge-controller.ts');
 assert.match(fog,/groundCacheEvidence!==observed/);
 assert.match(fog,/groundCacheCount!==observed\.size/);
 assert.match(fog,/groundCacheEvidence=observed/);
 assert.match(knowledge,/groundCacheEvidence:ReadonlySet<string>\|null=null/);
 assert.match(knowledge,/this\.groundCacheEvidence=null/);
 assert.match(fog,/paintReplayPersonalGround\(replayGroundContext!,state\.site,observed\)/);
 assert.doesNotMatch(fog,/observerPointVisible|inSight\(|stepSession\(/);
 assert.match(read('breach-3d.ts'),/fogSessionFingerprint\(s\)/);
 assert.match(fog,/fogSessionFingerprint\(state\)/);
});
