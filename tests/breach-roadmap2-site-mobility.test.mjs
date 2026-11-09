import test from 'node:test';
import assert from 'node:assert/strict';
import {doorLeafSegment} from '../src/breach-core.ts';
import {auditTacticalMobility} from '../src/worldgen/tactical-mobility-audit.ts';

const baseDoor={
 id:'CHECK',a:{x:100,y:100},b:{x:140,y:100},
 open:false,hinge:'a',swing:1
};
const bounds={minX:0,minY:0,maxX:320,maxY:320};
const site=(cover=[])=>({doors:[{...baseDoor}],cover,walls:[],bounds});

test('physical audit accepts a full unobstructed hinge sweep',()=>{
 const result=auditTacticalMobility(site());
 assert.equal(result.checkedDoors,1);
 assert.equal(result.blockedSwings,0);
});
test('physical audit detects early-arc furniture missed by a single 73% sample',()=>{
 const early=doorLeafSegment({...baseDoor,open:true,openFraction:.35});
 const p={x:early.a.x+(early.b.x-early.a.x)*.8,
  y:early.a.y+(early.b.y-early.a.y)*.8};
 const obstacle={x:p.x,y:p.y,w:6,h:6,fixture:'desk'};
 const audit=auditTacticalMobility(site([obstacle]));
 assert.equal(audit.blockedSwings,1);
 assert.ok(audit.issues.some(i=>i.kind==='blocked-swing'&&i.doorId==='CHECK'));
});
test('audit never moves fixtures or alters original door state',()=>{
 const before=site([{x:125,y:85,w:8,h:8,fixture:'chair'}]);
 const snapshot=structuredClone(before);
 auditTacticalMobility(before);
 assert.deepEqual(before,snapshot);
});
