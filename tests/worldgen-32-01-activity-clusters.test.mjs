import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITY_CLUSTERS,activityClusterCandidates}
 from '../src/worldgen/activity-clusters.ts';
const room={id:'R',kind:'room',purpose:'living',x:0,y:0,w:200,h:180,tone:0};
test('activity clusters describe functional pairings rather than random labels',()=>{
 for(const id of ['living-side-table','bedside','reception-seat','repair-tools','clinical-cart'])
  assert.ok(ACTIVITY_CLUSTERS.some(c=>c.id===id));
});
test('side tables are suggested alongside seating, not in front of the seat',()=>{
 const points=activityClusterCandidates(room,'side-table',20,19,
  [{x:80,y:80,w:48,h:24,fixture:'sofa'}]);
 assert.deepEqual(points[0],{x:122,y:80});
 assert.deepEqual(points[1],{x:38,y:80});
});
test('clusters honor room function, supporting items and actual bounds',()=>{
 assert.deepEqual(activityClusterCandidates(room,'nightstand',20,19,[]),[]);
 assert.deepEqual(activityClusterCandidates({...room,purpose:'kitchen'},
  'side-table',20,19,[{x:80,y:80,w:48,h:24,fixture:'sofa'}]),[]);
 const points=activityClusterCandidates({...room,purpose:'bedroom'},
  'nightstand',19,17,[{x:25,y:25,w:50,h:39,fixture:'bed'}]);
 assert.ok(points.every(p=>p.x>=9&&p.y>=9));
});
