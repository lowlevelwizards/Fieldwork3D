import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureServiceClear,auditFixtureService,serviceApproachPoint}
 from '../src/worldgen/fixture-service-clearance.ts';
import {orientFurnishings} from '../src/worldgen/prop-orientation.ts';
const room={id:'r1',kind:'room',purpose:'kitchen',x:0,y:0,w:200,h:170};
test('functional fixtures require a usable real working side',()=>{
 const sink={fixture:'sink',x:90,y:22,w:28,h:22,orientation:0};
 assert.deepEqual(serviceApproachPoint(sink),{x:90,y:49});
 assert.equal(fixtureServiceClear(room,sink,[sink]),true);
 const blocked={fixture:'crate',x:90,y:48,w:28,h:25};
 assert.equal(fixtureServiceClear(room,sink,[sink,blocked]),false);
 const issues=auditFixtureService({rooms:[room],cover:[sink,blocked]});
 assert.deepEqual(issues.map(i=>i.reason),['blocked-approach']);
 const facingWall={...sink,y:13,orientation:2};
 assert.deepEqual(auditFixtureService({rooms:[room],cover:[facingWall]})
   .map(i=>i.reason),['faces-wall']);
});
test('inward-facing kitchen workstations prefer clear access without changing collisions',()=>{
 const site={rooms:[room],doors:[]};
 const sink={fixture:'sink',x:100,y:24,w:28,h:22};
 const oriented=orientFurnishings(site,[sink]);
 assert.equal(oriented[0].orientation,0);
 assert.deepEqual(oriented[0],orientFurnishings(site,[sink])[0]);
});
