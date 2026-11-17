/** E6.23: Node-only authoring-time and cache reuse proxy, not FPS data. */
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {StaticVisualTemplateLibrary}
 from '../../src/rendering/fieldwork-visual-template-library.ts';
import {acquireRigidFixtureTemplate}
 from '../../src/rendering/breach-fixture-template.ts';
const cache=new StaticVisualTemplateLibrary(),N=200;
const palette={wood:new THREE.MeshStandardMaterial(),steel:new THREE.MeshStandardMaterial(),
 olive:new THREE.MeshStandardMaterial(),metal:new THREE.MeshStandardMaterial()};
const solid=new THREE.MeshStandardMaterial();
const ctx={solid:()=>solid,box:()=>{throw Error('Cache must author without site box geometry');}};
const fixtures=['bar-stool','queue-stanchion','diner-booth','entry-bench'];
function build(){
 const leases=[];
 for(let i=0;i<N;i++){
  const kind=fixtures[i%fixtures.length];
  const lease=acquireRigidFixtureTemplate(cache,
   {fixture:kind,x:0,y:0,w:48,h:26},i%3,ctx,palette);
  if(!lease)throw Error('Expected fixture recipe cache');
  leases.push(lease);
 }
 return leases;
}
const cold=performance.now(),first=build(),coldMs=performance.now()-cold;
const warm=performance.now(),second=build(),warmMs=performance.now()-warm;
const stats=cache.stats(),expectedRecipes=fixtures.length*3;
if(stats.builds!==expectedRecipes||stats.hits!==N*2-expectedRecipes)
 throw Error('Missing fixture cache hits '+JSON.stringify(stats));
console.log('E6_23_FIXTURE_TEMPLATE_BENCH',JSON.stringify({
 schema:'fieldwork-e6.23-rigid-fixture-node-v1',
 instancesPerPhase:N,recipes:expectedRecipes,
 coldMs:+coldMs.toFixed(2),warmMs:+warmMs.toFixed(2),stats
}));
for(const lease of [...first,...second])lease.release();
cache.clear();
if(cache.stats().geometries!==0)throw Error('Fixture template leaked buffers');
for(const material of [...Object.values(palette),solid])material.dispose();
