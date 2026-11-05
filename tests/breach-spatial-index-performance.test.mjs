import test from 'node:test';
import assert from 'node:assert/strict';
import {TacticalGeometryIndex,pointBounds,rayBounds} from '../src/breach-spatial-index.ts';
import {activateSite,activeSite,passable,segmentsCross} from '../src/breach-core.ts';
import {segmentHitsBox} from '../src/breach-ray.ts';

test('spatial ray and point queries preserve brute-force collision truth',()=>{
 let seed=8812;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const range=(lo,hi)=>lo+rand()*(hi-lo);
 const walls=Array.from({length:90},()=>({
  a:{x:range(-500,500),y:range(-450,450)},
  b:{x:range(-500,500),y:range(-450,450)}
 }));
 const cover=Array.from({length:90},()=>({
  x:range(-500,500),y:range(-450,450),w:range(3,110),h:range(3,115)
 }));
 const index=new TacticalGeometryIndex(walls,cover);
 for(let i=0;i<2500;i++){
  const a={x:range(-510,510),y:range(-510,510)};
  const b={x:range(-510,510),y:range(-510,510)};
  const ray={a,b};
  assert.equal(index.someWall(rayBounds(a,b),w=>segmentsCross(ray,w)),
    walls.some(w=>segmentsCross(ray,w)),'wall ray '+i);
  assert.equal(index.someCover(rayBounds(a,b),o=>segmentHitsBox(a,b,o)),
    cover.some(o=>segmentHitsBox(a,b,o)),'cover ray '+i);
  const r=range(0,18),box=pointBounds(a,r);
  const wallCandidate=(w)=>Math.min(w.a.x,w.b.x)<=box.maxX&&
   Math.max(w.a.x,w.b.x)>=box.minX&&Math.min(w.a.y,w.b.y)<=box.maxY&&
   Math.max(w.a.y,w.b.y)>=box.minY;
  const coverCandidate=(o)=>o.x-o.w/2<=box.maxX&&o.x+o.w/2>=box.minX&&
    o.y-o.h/2<=box.maxY&&o.y+o.h/2>=box.minY;
  assert.equal(index.someWall(box,wallCandidate),walls.some(wallCandidate),'wall point '+i);
  assert.equal(index.someCover(box,coverCandidate),cover.some(coverCandidate),'cover point '+i);
 }
});

test('site activation refreshes indexed geometry without stale walkability',()=>{
 const original=activeSite();
 const bounds={minX:-300,minY:-300,maxX:300,maxY:300};
 const farWall={a:{x:150,y:-100},b:{x:150,y:100}};
 const nearWall={a:{x:0,y:-100},b:{x:0,y:100}};
 try{
  activateSite({walls:[farWall],cover:[],doors:[],bounds});
  assert.equal(passable({x:0,y:0}),true);
  activateSite({walls:[nearWall],cover:[],doors:[],bounds});
  assert.equal(passable({x:0,y:0}),false);
  assert.equal(passable({x:120,y:0}),true);
 }finally{activateSite(original);}
});
