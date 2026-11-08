import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {serviceFixtureInRoad}
  from '../src/worldgen/road-service-fixtures.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {damageCover} from '../src/breach-reactive-cover.ts';

test('fixed utility cabinets never occupy the actual street footprint',()=>{
 const south={entrySide:'south',entrance:{x:300,y:500},
   bounds:{minX:0,minY:0,maxX:650,maxY:700}};
 const cabinet={x:300,y:600,w:30,h:20};
 assert.equal(serviceFixtureInRoad(south,'utility-cabinet',cabinet),true);
 assert.equal(serviceFixtureInRoad(south,'utility-cabinet',
   {...cabinet,x:390}),false);
 assert.equal(serviceFixtureInRoad(south,'utility-cabinet',
   {...cabinet,y:450}),false);
 assert.equal(serviceFixtureInRoad(south,'parking-sign',cabinet),false);
 const east={...south,entrySide:'east',entrance:{x:450,y:315}};
 assert.equal(serviceFixtureInRoad(east,'utility-cabinet',
   {x:560,y:315,w:30,h:20}),true);
 assert.equal(serviceFixtureInRoad(east,'utility-cabinet',
   {x:560,y:405,w:30,h:20}),false);
});

test('a collapsed shelf renders as debris rather than scaled intact geometry',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(code,/renderFixtureVisual\(intact,visual,i,localCtx,/);
 assert.match(code,/visuals\.intact\.visible=!collapsed/);
 assert.match(code,/visuals\.debris\.visible=collapsed/);
 assert.match(code,/group\.scale\.set\(collapsed\?1:transform\.scaleX,/);
 assert.match(code,/exteriorSetDressing\?true:/);
 assert.match(code,/s\.intel\.mode==='exterior-known'/);
 assert.match(code,/exteriorBriefedAt\(s\.site\?\?undefined,/);
});

test('cover destruction stays authored, reversible and tied to original fixture index',()=>{
 const s=newSession(),index=0;
 const original={...s.coverState[index],fixture:'desk',integrity:.25,
   material:'hardwood',w:60,h:42,low:false,destroyed:false};
 s.coverState[index]=original;
 const before=snapshot(s);
 assert.equal(damageCover(s.coverState[index],1),'collapsed');
 s.objectRevision++;
 s.seconds=2;
 const after=snapshot(s);
 assert.equal(after.coverState[index].destroyed,true);
 assert.ok(after.coverState[index].w<before.coverState[index].w);
 applyReplayFrame(s,before);
 assert.equal(s.coverState[index].destroyed,false);
 assert.equal(s.coverState[index].w,60);
 applyReplayFrame(s,after);
 assert.equal(s.coverState[index].destroyed,true);
 assert.equal(s.coverState[index].fixture,'desk');
});
