import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {StudyWorld,groundHeight,roadX,walkable}
  from '../src/study-world.ts';
import {StudySoldier} from '../src/study-soldier.ts';

test('051: authored world is a human-scale walkable road with real solid edges',()=>{
  assert.ok(Number.isFinite(groundHeight(1,10)));
  assert.ok(Math.abs(groundHeight(2,3)-groundHeight(2.1,3.1))<.3);
  for(const z of [-20,-12,2,10,24])
    assert.equal(walkable(roadX(z),z),true,'road remains walkable '+z);
  assert.equal(walkable(-14,-13),false,'the farmhouse shell obstructs');
  assert.equal(walkable(-7,5),false,'fence rail obstructs');
  assert.equal(walkable(44,2),false,'cannot leave the authored set');
});
test('051: renderer-independent study world composes ground and authored props',()=>{
  const scene=new THREE.Scene(),world=new StudyWorld(scene);
  assert.ok(scene.children.includes(world.group));
  assert.ok(world.ground.geometry.getAttribute('position').count>5000);
  const instanced=[];
  world.group.traverse(o=>{if(o instanceof THREE.InstancedMesh)instanced.push(o);});
  assert.ok(instanced.length>=2,'bounded ground cover and debris are instanced');
  world.dispose(scene);
});
test('051: Rook is articulated and scales in metres',()=>{
  const scene=new THREE.Scene(),soldier=new StudySoldier(scene);
  let count=0;soldier.group.traverse(o=>{if(o instanceof THREE.Mesh)count++;});
  assert.ok(count>=25,'silhouette should include equipment and actual limbs');
  soldier.update(0,10,0,2.4,false,1/60);
  assert.ok(Math.abs(soldier.group.position.x)<.001);
  soldier.update(0,10,0,0,true,.3);
  assert.ok(scene.children.includes(soldier.group));
  soldier.dispose(scene);
  assert.ok(!scene.children.includes(soldier.group));
});
test('051: the new study is separate, not another makeover of the world',()=>{
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const html=readFileSync(new URL('../study.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/study-main.ts',import.meta.url),'utf8');
  assert.ok(vite.includes("study: 'study.html'"));
  assert.ok(html.includes('id="studyCanvas"'));
  assert.ok(main.includes("from './study-world.ts'"));
  assert.ok(main.includes("from './study-soldier.ts'"));
  assert.ok(!main.includes('regional-command'));
  assert.ok(!main.includes('newOperation()'));
});
