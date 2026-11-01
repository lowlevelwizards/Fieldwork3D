import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSpaceQuality} from '../src/worldgen/space-quality.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';

test('baseline room occupancy distinguishes sparse and crowded rooms',()=>{
 const room={id:'A',purpose:'living',kind:'room',x:10,y:10,w:100,h:100,tone:0};
 const original={rooms:[room],doors:[],cover:[]};
 const empty=assessSpaceQuality(original);
 assert.equal(empty.rooms[0].freeFraction,1);
 assert.equal(empty.rooms[0].solidCount,0);
 const filled=assessSpaceQuality({...original,cover:[
  {x:40,y:40,w:65,h:65,fixture:'sofa',low:true},
  {x:85,y:85,w:25,h:25,fixture:'chair',low:true}
 ]});
 assert.equal(filled.crowdedRoomIds[0],'A');
 assert.ok(filled.rooms[0].solidFraction>.32);
 assert.equal(filled.fixtureCounts.chair,1);
});
test('door warnings are center-specific; decorative window sills do not count',()=>{
 const site={rooms:[],doors:[{id:'FRONT',a:{x:100,y:0},b:{x:148,y:0}}],cover:[
  {x:124,y:3,w:24,h:24,fixture:'crate'},
  {x:124,y:0,w:40,h:8,fixture:'window-sill'}
 ]};
 assert.deepEqual(assessSpaceQuality(site).doorApproachIssues,
  [{doorId:'FRONT',fixture:'crate'}]);
});
test('existing generated sites expose geometry-only baseline',()=>{
 const report=auditGeneratedSite(2,'small');
 assert.ok(report.spaceQuality.rooms.length>0);
 assert.ok(Number.isFinite(report.spaceQuality.averageSolidFraction));
 assert.ok(report.spaceQuality.averageSolidFraction>=0);
 assert.ok(report.spaceQuality.averageSolidFraction<=1);
});
