import test from 'node:test';
import assert from 'node:assert/strict';
import {FogRefreshGate} from '../src/breach-fog-cache.ts';
import {paintFogVisibility} from '../src/breach-fog-mask.ts';
import {resolveWallPresentation} from '../src/rendering/breach-wall-presentation.ts';
const make=()=>({site:{seed:23},intel:{mode:'true-blind'},seenGround:new Set(),seenGroundRevision:0,objectRevision:0,seconds:0,operators:[{id:'blue',side:'blue',health:2,p:{x:100,y:100},heading:0,posture:'stand'}],doors:[]});
test('W5 invalidates exact site/session, revisions and rewind, bounds unchanged probes',()=>{
 const g=new FogRefreshGate(),s=make();
 assert.deepEqual(g.poll(s,0,.1),{paint:true,memoryInvalid:true});
 for(let i=0;i<20;i++)assert.equal(g.poll(s,.016,.1).paint,false);
 s.operators[0].heading=1;
 assert.equal(g.poll(s,.1,.1).paint,true);
 s.seenGround.add('micro:1,1');s.seenGroundRevision++;
 assert.deepEqual(g.poll(s,0,.1),{paint:true,memoryInvalid:true});
 s.seenGround=new Set(['micro:2,2']);s.seenGroundRevision++;
 assert.equal(g.poll(s,0,.1).memoryInvalid,true);
 s.objectRevision++;assert.equal(g.poll(s,0,.1).paint,true);
 s.intel.mode='exterior-known';assert.equal(g.poll(s,0,.1).memoryInvalid,true);
 s.site={seed:23};assert.equal(g.poll(s,0,.1).memoryInvalid,true);
 s.seconds=5;assert.equal(g.poll(s,0,.1,true).paint,true);
 s.seconds=1;assert.equal(g.poll(s,0,.1,true).memoryInvalid,true);
 const next={...s};assert.equal(g.poll(next,0,.1).memoryInvalid,true);
 g.invalidate();assert.equal(g.poll(next,0,.1).paint,true);assert.equal(g.owner,next);
});
test('W5 foot context has bounded round footprint, not a square or full room',()=>{
 const s=make();s.site={seed:23,bounds:{minX:0,minY:0,maxX:300,maxY:300},walls:[],cover:[],rooms:[]};
 const paths=[];let path=[];
 const ctx={canvas:{width:300,height:300},save(){},restore(){},setTransform(){},beginPath(){path=[]},moveTo(x,y){path.push({x,y})},lineTo(x,y){path.push({x,y})},closePath(){},fill(){paths.push(path)},filter:'none'};
 paintFogVisibility(ctx,s);
 assert.equal(paths.length,2);const foot=paths[1];
 assert.equal(foot.length,16);assert.ok(foot.every(p=>Math.abs(Math.hypot(p.x-100,p.y-100)-7)<1e-6));
});
test('W5 opaque wall audition changes only pass selection, not cutaway opacity or bodycam',()=>{
 const old=resolveWallPresentation(1,false,1,false,false,false,true);
 const opaque=resolveWallPresentation(1,false,1,false,false,false,true,true);
 assert.equal(old.transparent,true);assert.equal(opaque.transparent,false);assert.equal(opaque.depthWrite,true);assert.equal(opaque.renderOrder,0);
 for(const mode of [[false,false,false],[false,true,true],[true,false,false]]){
  const args=[1,true,1,...mode,true];
  const a=resolveWallPresentation(...args),b=resolveWallPresentation(...args,true);
  assert.equal(a.opacity,b.opacity);assert.equal(a.depthWrite,b.depthWrite);
  assert.equal(a.transparent,b.transparent);
 }
});
