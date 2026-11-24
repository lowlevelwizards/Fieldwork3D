import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BreachCombatEffectsPresenter,MAX_TRANSIENT_EFFECT_SPARES} from '../src/rendering/breach-combat-effects-presenter.ts';
const state=()=>({seconds:0,casings:[],dropped:[],grenades:[],flashBursts:[]});
const allow=()=>true;
const point=id=>({x:100+id,y:150});
test('V1 batches newest visible magazines and skips settled matrix uploads',()=>{
 const root=new THREE.Group(),p=new BreachCombatEffectsPresenter(root,[],false),s=state();
 s.dropped=Array.from({length:80},(_,id)=>({id,p:point(id),age:2}));
 p.update(s,true,false,allow);
 const batch=root.children.find(o=>o.isInstancedMesh&&o.count===64);
 assert.ok(batch);assert.equal(p.stats().magazines,64);
 const m=new THREE.Matrix4();batch.getMatrixAt(0,m);
 assert.ok(Math.abs(m.elements[12]-(116+Math.sin(16)*1.5*3.5))<1e-4);
 const version=batch.instanceMatrix.version,writes=p.resourceStats().matrixWrites;
 s.seconds=5;p.update(s,true,false,allow);
 assert.equal(batch.instanceMatrix.version,version);
 assert.equal(p.resourceStats().matrixWrites,writes);
 s.dropped[16].age=.2;s.seconds=.2;p.update(s,true,false,allow);
 assert.ok(batch.instanceMatrix.version>version);
 p.update(s,false,false,()=>false);assert.equal(p.stats().magazines,0);
 p.update(s,true,true,allow);assert.equal(p.stats().magazines,0);
 p.update(s,true,false,allow);assert.equal(p.stats().magazines,64);
 p.reset();assert.equal(root.children.length,1);
});
test('V1 reuses grenade and flash resources across IDs and resets',()=>{
 const root=new THREE.Group(),p=new BreachCombatEffectsPresenter(root,[],false),s=state();
 const fill=base=>{
   s.grenades=Array.from({length:8},(_,i)=>({id:base+i,p:point(i),age:.1,path:null}));
   s.flashBursts=Array.from({length:8},(_,i)=>({id:base+i,p:point(i),age:i*.05}));
 };
 fill(0);p.update(s,true,false,allow);
 const flashes=root.children.filter(o=>o.material?.transparent);
 assert.equal(flashes.length,8);
 assert.equal(new Set(flashes.map(o=>o.geometry)).size,1);
 assert.equal(new Set(flashes.map(o=>o.material)).size,8);
 assert.notEqual(flashes[0].material.opacity,flashes[7].material.opacity);
 const first=p.resourceStats();
 for(let i=1;i<=20;i++){fill(i*100);p.update(s,true,false,allow);}
 p.reset();fill(3000);p.update(s,true,false,allow);
 const last=p.resourceStats();
 for(const key of ['geometryCreates','materialCreates','meshCreates'])assert.equal(last[key],first[key]);
 p.update(s,true,true,allow);
 assert.equal(root.children.filter(o=>o.visible&&!o.isInstancedMesh).length,0);
 p.reset();assert.ok(p.resourceStats().spares<=MAX_TRANSIENT_EFFECT_SPARES);
 assert.equal(root.children.length,1);
});
test('V1 spare limit does not cap active flashes',()=>{
 const root=new THREE.Group(),p=new BreachCombatEffectsPresenter(root,[],false),s=state();
 s.flashBursts=Array.from({length:50},(_,id)=>({id,p:point(id),age:.1}));
 p.update(s,true,false,allow);assert.equal(p.stats().flashes,50);
 p.reset();assert.equal(p.resourceStats().spares,MAX_TRANSIENT_EFFECT_SPARES);
 assert.equal(root.children.length,1);
});
test('V1 casing matrices refresh on backward seek',()=>{
 const root=new THREE.Group(),p=new BreachCombatEffectsPresenter(root,[],false),s=state();
 s.casings=[{id:1,at:0,weapon:'carbine',side:'blue',x:100,z:150,y:10,heading:0}];
 s.seconds=5;p.update(s,true,false,allow);
 const batch=root.children[0],before=new THREE.Matrix4(),after=new THREE.Matrix4();
 batch.getMatrixAt(0,before);
 s.seconds=.1;p.update(s,true,false,allow);batch.getMatrixAt(0,after);
 assert.notDeepEqual(before.elements,after.elements);
 s.seconds=5;p.update(s,true,false,allow);batch.getMatrixAt(0,after);
 assert.deepEqual(before.elements,after.elements);
});
