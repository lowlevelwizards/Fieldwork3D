import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAD_SILHOUETTE_METRICS,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
const yMinAt=(v,x,z)=>Math.min(...v.filter(p=>
 Math.abs(x-p.x)<=p.width/2&&Math.abs(z-p.z)<=p.depth/2)
 .map(p=>p.y-p.height/2));
test('reported ear clearance is grounded in the authored cuboid volumes',()=>{
 for(const id of ['ach','high-cut']){
  const shape=headwearCuboidVolumes(id);
  assert.ok(Math.abs(yMinAt(shape,4.4,0)-
   HEAD_SILHOUETTE_METRICS[id].earEdge)<1e-6);
 }
});
test('high-cut gains substantial ear clearance while keeping both brow profiles',()=>{
 const ach=HEAD_SILHOUETTE_METRICS.ach;
 const high=HEAD_SILHOUETTE_METRICS['high-cut'];
 assert.ok(high.earEdge-ach.earEdge>2.5);
 assert.ok(Math.abs(high.foreheadEdge-ach.foreheadEdge)<.5);
 assert.ok(ach.top<9.0&&high.top<9.0,
  'helmet tops sit close to the unchanged skull crown');
});
