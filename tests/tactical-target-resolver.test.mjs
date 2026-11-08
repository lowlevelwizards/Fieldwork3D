import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveTacticalPick,screenSegmentDistance,watchDragReady}
  from '../src/ui/tactical-target-resolver.ts';

const hit=(kind,distancePx,corePx=18,owner='rook',extra={})=>
  ({kind,distancePx,corePx,owner,...extra});
test('precise hit always beats an overlapping forgiving halo',()=>{
 const chosen=resolveTacticalPick([
   hit('node',22,17,'rook',{haloPx:27,nodeId:1}),
   hit('operator',10,18,'moss')
 ],'rook');
 assert.equal(chosen?.kind,'operator');
 assert.equal(chosen?.owner,'moss');
});
test('selected operator only wins genuine same-kind near ties',()=>{
 const picked=resolveTacticalPick([
   hit('node',9,18,'moss',{nodeId:5}),
   hit('node',12,18,'rook',{nodeId:2})
 ],'rook');
 assert.equal(picked?.nodeId,2);
 const clear=resolveTacticalPick([
   hit('node',3,18,'moss',{nodeId:5}),
   hit('node',15,18,'rook',{nodeId:2})
 ],'rook');
 assert.equal(clear?.nodeId,5);
});
test('handles and a visible door do not lose near ties to selected route',()=>{
 for(const kind of ['door','watch','node','operator']){
   const selection=resolveTacticalPick([
     hit('route',1,14,'rook',{routeIndex:0}),
     hit(kind,3,18,kind==='door'?undefined:'moss',
       kind==='door'?{doorId:'entry'}:{nodeId:11})
   ],'rook');
   assert.equal(selection?.kind,kind);
 }
});
test('selected route retains crossings, foreign route is selection-only',()=>{
 const selected=resolveTacticalPick([
   hit('route',7,8,'moss',{routeIndex:1}),
   hit('route',11,14,'rook',{routeIndex:2})
 ],'rook');
 assert.equal(selected?.owner,'rook');
 assert.equal(resolveTacticalPick([
   hit('route',4,8,'moss',{routeIndex:1})
 ],'rook')?.owner,'moss');
});
test('neither background floor nor invisible object gets an invented pick',()=>{
 assert.equal(resolveTacticalPick([], 'rook'),null);
 assert.equal(resolveTacticalPick([
   hit('node',40,17,'moss',{nodeId:7})
 ], 'rook'),null);
});
test('door picking uses projected leaf segment proximity',()=>{
 assert.equal(screenSegmentDistance({x:50,y:8},{x:0,y:0},{x:100,y:0}),8);
 assert.equal(screenSegmentDistance({x:120,y:0},{x:0,y:0},{x:100,y:0}),20);
});
test('WATCH requires more deliberate travel on finger than ordinary tap',()=>{
 assert.equal(watchDragReady(17,'touch'),false);
 assert.equal(watchDragReady(20,'touch'),true);
 assert.equal(watchDragReady(13,'pen'),false);
 assert.equal(watchDragReady(14,'pen'),true);
});
test('input remains single-commit and unselected overlays are subdued',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const start=main.indexOf("canvas.addEventListener('pointerdown',e=>{");
 const finish=main.indexOf("canvas.addEventListener('pointermove',e=>{",start);
 const down=main.slice(start,finish);
 assert.ok(start>=0&&finish>start);
 assert.doesNotMatch(down,/selectUnit\(/);
 assert.match(main,/pick\.owner!==selected/);
 assert.match(main,/!p\.dragCommitted\|\|retargetActiveWatch/);
 assert.match(main,/!p\.dragCommitted\|\|planWatch/);
 assert.match(main,/muted\?\.18/);
 assert.match(main,/muted\?\.32/);
 assert.match(main,/muted\?\.30/);
 assert.match(main,/const muted=!replaying&&a\.id!==selected/);
});
