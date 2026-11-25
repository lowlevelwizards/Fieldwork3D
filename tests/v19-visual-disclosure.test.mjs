import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationSightMemo} from '../src/rendering/breach-presentation-sight-memo.ts';
import {presentTransientEvidence} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {newSession} from '../src/breach-game.ts';
import {readFileSync} from 'node:fs';
test('V19 exact-point memo shares same-frame live queries across effect categories only',()=>{
 const s=newSession(0,23,'true-blind');let calls=0,seen=true;
 const memo=new PresentationSightMemo(()=>{calls++;return seen;});
 const p={x:120,y:155};
 memo.begin(s,false,true);
 assert.equal(memo.query(s,'effect','burst',p),true);
 assert.equal(memo.query(s,'impact','mark',p),true);
 assert.equal(calls,1);assert.equal(memo.stats().frameHits,1);
 memo.query(s,'effect','moved',{x:p.x+.01,y:p.y});assert.equal(calls,2);
 seen=false;memo.begin(s,false,true);
 assert.equal(memo.query(s,'effect','burst',p),false);
 assert.equal(calls,3);
 memo.begin(s,false,false);
 memo.query(s,'effect','a',p);memo.query(s,'effect','b',p);
 assert.equal(calls,5,'historical/legacy bypass');
 memo.reset();assert.equal(memo.stats().frameEntries,0);
});
test('V19 point gate fails closed for personal replay and uses exact live truth',()=>{
 let calls=0;const p={x:1,y:2},no=()=>{calls++;return false;};
 assert.equal(presentTransientEvidence(p,true,true,no),false);
 assert.equal(presentTransientEvidence(p,false,true,no),false);
 assert.equal(presentTransientEvidence(p,true,false,no),true);
 assert.equal(calls,0);
 assert.equal(presentTransientEvidence(p,false,false,no),false);
 assert.equal(calls,1);
});
test('V19 both board renderers gate point effects and suppress unrecorded personal muzzle cues',()=>{
 const two=readFileSync(new URL('../src/breach-2d-actor-renderer.ts',import.meta.url),'utf8');
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 for(const [stream,name] of [['dropped','m'],['grenades','g'],['flashBursts','b']])
  assert.ok(two.includes('for(const '+name+' of state.'+stream+'){\n    if(!effectVisible('+name+'.p))continue;'));
 assert.ok(two.includes('presentTransientEvidence(p,omni,personal'));
 assert.ok(two.includes('const firing=!(replaying&&replayKnowledge.observerId)'));
 assert.ok(three.includes('shot=>!personalDisclosure&&'));
});
