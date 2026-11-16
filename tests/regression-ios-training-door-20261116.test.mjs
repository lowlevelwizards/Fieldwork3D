import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crossesDoorThreshold} from '../src/breach-door.ts';
import {repairDoorwayClutter} from '../src/worldgen/doorway-clutter-repair.ts';

const door={id:'D',a:{x:100,y:100},b:{x:148,y:100},
 open:false,openedAt:-1,kind:'hinged'};

test('auto-open intent crosses the physical aperture, not a parallel wall path',()=>{
 assert.equal(crossesDoorThreshold({x:124,y:130},{x:124,y:70},door),true);
 assert.equal(crossesDoorThreshold({x:90,y:115},{x:170,y:115},door),false);
 assert.equal(crossesDoorThreshold({x:170,y:130},{x:170,y:70},door),false);
 assert.equal(crossesDoorThreshold({x:124,y:120},{x:124,y:100},door),true);
 assert.equal(crossesDoorThreshold({x:124,y:120},{x:124,y:122},door),false);
});

test('open arches get the same incidental furnishing clearance as real doorways',()=>{
 const site={
  rooms:[{id:'R',kind:'room',x:50,y:55,w:190,h:170}],
  walls:[],doors:[],
  openings:[{id:'ARCH',kind:'arch',a:{x:100,y:100},b:{x:172,y:100}}],
  cover:[{x:136,y:110,w:16,h:16,fixture:'box'}]
 };
 const result=repairDoorwayClutter(site);
 assert.equal(result.moved,1);
 assert.equal(result.unresolved,0);
 assert.notDeepEqual(result.site.cover[0],site.cover[0]);
 assert.deepEqual(site.cover,[{x:136,y:110,w:16,h:16,fixture:'box'}],
  'site repair is deterministic and does not mutate the source');
});

test('training setup is above campaign and iOS does not auto-focus native select',()=>{
 const root=new URL('../',import.meta.url);
 const css=readFileSync(new URL('src/ui/breach-training.css',root),'utf8');
 const campaign=readFileSync(new URL('src/campaign-style.css',root),'utf8');
 const ui=readFileSync(new URL('src/ui/breach-training-screen.ts',root),'utf8');
 assert.match(campaign,/\.campaign-screen\{position:fixed;z-index:120/);
 assert.match(css,/\.breach-training-screen\{position:fixed;inset:0;z-index:160/);
 assert.match(ui,/beginButton\.focus\(\{preventScroll:true\}\)/);
 assert.doesNotMatch(ui,/activity\.el\.focus\(/);
});

test('implicit motor open is gated, but real physical leaf pressure survives',()=>{
 const motor=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 const collision=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(motor,/crossesDoorThreshold\(a\.p,next,door\)/);
 assert.match(motor,/crossesDoorThreshold\(next,a\.nav\[1\],touched\)/);
 assert.doesNotMatch(motor,/crossesDoorThreshold\(a\.p,p,door\)/,
  'a remote authored goal is not proof of a planned door crossing');
 assert.match(collision,/pressDoorOnBodyAttempt\(a\.p,desiredMove/);
});
