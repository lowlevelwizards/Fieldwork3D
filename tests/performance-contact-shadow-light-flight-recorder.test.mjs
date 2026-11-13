import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {BreachContactShadowBatch}
 from '../src/rendering/breach-contact-shadow-batch.ts';
import {PerformanceTimeline,emptyPerformanceSceneCosts}
 from '../src/breach-performance-timeline.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const matrixAt=(mesh,index)=>{
 const matrix=new THREE.Matrix4();mesh.getMatrixAt(index,matrix);return matrix;
};
test('operator foot decals share one draw while retaining independent visibility and motion',()=>{
 const scene=new THREE.Scene(),batch=new BreachContactShadowBatch(scene);
 assert.equal(scene.children.includes(batch.draw),true);
 const a=batch.register('rook'),b=batch.register('moss');
 assert.equal(batch.register('rook'),a,'register reuses the saved foot pair');
 a[0].position.set(14,.16,21);a[1].position.set(15,.16,24);
 b[0].position.set(70,.16,80);b[1].position.set(75,.16,80);
 b[0].visible=false;
 batch.sync();
 assert.equal(batch.stats.draws,1);
 assert.equal(batch.stats.instances,4);
 assert.equal(batch.draw.count,4);
 assert.equal(matrixAt(batch.draw,0).elements[12],14);
 assert.equal(matrixAt(batch.draw,1).elements[14],24);
 assert.equal(matrixAt(batch.draw,2).elements[0],0);
 assert.equal(matrixAt(batch.draw,3).elements[12],75);
 assert.equal(batch.draw.material.opacity,.20);
 a[0].position.x=28;b[0].visible=true;
 batch.sync();
 assert.equal(matrixAt(batch.draw,0).elements[12],28);
 assert.equal(matrixAt(batch.draw,2).elements[12],70);
 a[0].visible=false;a[1].visible=false;
 batch.sync();
 assert.equal(matrixAt(batch.draw,0).elements[0],0);
 assert.equal(matrixAt(batch.draw,1).elements[0],0);
 assert.equal(matrixAt(batch.draw,2).elements[0]===0,false,
  'concealment of rook cannot conceal moss');
 batch.unregister('rook');batch.sync();
 assert.equal(batch.stats.instances,2);
 assert.equal(matrixAt(batch.draw,0).elements[12],70);
 assert.equal(batch.stats.trackedOperators,1);
 batch.dispose(scene);
 assert.equal(scene.children.includes(batch.draw),false);
});
test('normal live RAF history retains previous CPU parent costs without opening PERF',()=>{
 const timeline=new PerformanceTimeline();
 const work={beforeUi:87,ui:9,sceneSync:48,render:13,postRender:2,
  diagnostics:0,scene:emptyPerformanceSceneCosts()};
 timeline.addCoarseFrame(500,33,160,'live','iso');
 timeline.addCoarseFrame(750,180,30,'live','iso',160,'live',work,54);
 const output=timeline.report('planning','iso');
 assert.match(output,/LIGHT CPU SLICES/);
 assert.match(output,/prior-frame JS occupied RAF interval/);
 assert.match(output,/3D scene 48ms/);
 assert.match(output,/PREVIOUS SIM 54/);
 assert.match(output,/zero detailed phase values in BASIC\/LIGHT/i);
});
test('live render instrumentation preserves cheap start when PERF is not open',()=>{
 const loop=source('src/breach-runtime-loop.ts');
 assert.match(loop,/previousCoarseWork=\{/);
 assert.match(loop,/sceneSync:sceneUpdateEnd-perfRenderStart/);
 assert.match(loop,/recordingMs\+=performance\.now\(\)-beforeRecording/);
 assert.match(loop,/previousCoarseWork,previousCoarseSim/);
 assert.match(loop,/previousPerfWork=previousCoarseWork/);
 assert.match(loop,/const simPhaseCosts=perfOverlay\?new Map/);
 const scene=source('src/breach-3d.ts');
 assert.match(scene,/this\.contactShadowBatch\.sync\(\)/);
 assert.match(scene,/this\.contactShadowBatch\.unregister\(id\)/);
 assert.match(scene,/const contactShadows=this\.contactShadowBatch\.register\(a\.id\)/);
});
