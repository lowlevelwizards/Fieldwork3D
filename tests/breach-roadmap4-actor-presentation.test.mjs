import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession} from '../src/breach-game.ts';
import {reconcileSceneActorLifetimes} from '../src/rendering/breach-actor-frame-presenter.ts';
test('scene reconciliation hides stale actors without modifying gameplay state',()=>{
 const s=newSession();const scene=new THREE.Scene(),a=new THREE.Group();
 const status=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 const shadow=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 const actors=new Map([['stale',{root:a,status,contactShadows:[shadow]}]]);
 const host={scene,actors,civilianRigs:new Map(),actorIds:new Set(),civilianIds:new Set()};
 reconcileSceneActorLifetimes(s,host,false,null);
 assert.equal(a.visible,false);assert.equal(status.visible,false);assert.equal(shadow.visible,false);
 assert.equal(s.operators.some(o=>o.id==='stale'),false);
});
