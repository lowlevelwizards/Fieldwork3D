import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {sweptBodyClear,squeezeExitClear} from '../src/breach-navigation.ts';
import {smoothTraversalRoute} from '../src/breach-squeeze-route.ts';

const openSite=()=>({
 seed:709,doors:[],walls:[],cover:[],
 bounds:{minX:0,minY:0,maxX:440,maxY:460}
});
const pt=(x,y)=>({x,y});
test('R6a: clear motor route drops excess grid turns but retains final destination',()=>{
 activateSite(openSite());
 try{
  const from=pt(100,100);
  const path=[pt(112,116),pt(128,116),pt(144,132),pt(160,140)];
  const original=structuredClone(path);
  const improved=smoothTraversalRoute(from,path,(a,b)=>sweptBodyClear(a,b,[]));
  assert.deepEqual(improved,[pt(160,140)]);
  assert.deepEqual(path,original,'no authored or path source nodes mutated');
 }finally{activateSite(null);}
});
test('R6a: smoothing never skips around a solid wall through the body radius',()=>{
 const site=openSite();
 site.walls=[{a:pt(150,108),b:pt(150,238)}];
 activateSite(site);
 try{
  const from=pt(117,170);
  const path=[pt(117,260),pt(183,260),pt(183,170)];
  const improved=smoothTraversalRoute(from,path,
   (a,b)=>sweptBodyClear(a,b,[]));
  assert.equal(sweptBodyClear(from,pt(183,170),[]),false);
  assert.deepEqual(improved.at(-1),pt(183,170));
  assert.ok(improved.length>1,'must keep the real obstacle detour');
  let prior=from;
  for(const point of improved){
   assert.equal(sweptBodyClear(prior,point,[]),true);
   prior=point;
  }
 }finally{activateSite(null);}
});
test('R6b: normal stance returns only with full-body space ahead',()=>{
 activateSite(openSite());
 try{
  assert.equal(squeezeExitClear(pt(100,100),pt(100,103),[]),true);
 }finally{activateSite(null);}
 const site=openSite();
 site.walls=[{a:pt(80,118),b:pt(125,118)}];
 activateSite(site);
 try{
  assert.equal(squeezeExitClear(pt(100,100),pt(100,103),[]),false,
    'a forward shoulder obstruction prevents squeeze/normal flicker');
 }finally{activateSite(null);}
});
test('R6b: a stationary step never changes shoulder stance',()=>{
 activateSite(openSite());
 try{assert.equal(squeezeExitClear(pt(100,100),pt(100,100),[]),false);}
 finally{activateSite(null);}
});
