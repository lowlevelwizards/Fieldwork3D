import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groundView,groundViewCandidate} from '../src/breach-ground-view.ts';
import {forEachGroundSightCandidate} from '../src/breach-ground-discovery.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {sightRangeForBounds,NEAR_FINE_SIGHT_RANGE}
 from '../src/breach-visibility-range-policy.ts';

test('V1 open sight reaches distant site corners without revealing behind the observer',()=>{
 const bounds={minX:0,minY:0,maxX:900,maxY:1100};
 const range=sightRangeForBounds(bounds);
 const view=groundView(100,200,0,range);
 assert.ok(groundViewCandidate(view,820,200));
 assert.ok(!groundViewCandidate(view,20,200));
 assert.ok(!groundViewCandidate(view,range+100,200));
 assert.ok(!groundViewCandidate(groundView(100,200,0),820,200),
  'legacy near-radius stays available for fine-only legacy consumers');
 const far=[];
 forEachGroundSightCandidate(view,bounds,20,(col,row,p)=>{
   if(p.x>NEAR_FINE_SIGHT_RANGE+100)far.push([col,row]);
 });
 assert.ok(far.length>0,'far grid remains grid-clipped to the generated site');
});

test('V1 sight polygons reach distant ground but stop on solid walls',()=>{
 const origin={x:100,y:200},range=800;
 const wall={a:{x:280,y:0},b:{x:280,y:400}};
 const center=poly=>poly.slice(1).reduce((best,p)=>
   Math.abs(p.y-origin.y)<Math.abs(best.y-origin.y)?p:best);
 assert.ok(center(visionPolygon(origin,0,range,[],[],false,[])).x>850);
 assert.ok(center(visionPolygon(origin,0,range,[wall],[],false,[])).x<=281);
});

test('V1 distant memory queries are bucketed while close details stay exact',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.ok(game.includes('const bucket=Math.floor(s.seconds*7)&15'));
 assert.ok(game.includes('if(((col+row*3)&15)!==bucket)return;'));
 assert.ok(game.includes('NEAR_FINE_SIGHT_RANGE**2'));
 assert.ok(game.includes('notePersonalGround(s,blue.id,s.seconds,fine)'));
});
