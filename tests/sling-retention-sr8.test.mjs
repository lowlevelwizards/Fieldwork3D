import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {clearRetentionEnvelope} from '../src/breach-weapon-retention-clearance.ts';
import {retentionShape,MAX_RETENTION_SUPPORT_POINTS} from '../src/operator-retention-shape.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
const fit=equipmentExterior('armor-bare','no-rig','combat-shirt');
const p={mode:'front-slung',bounds:new THREE.Box3(new THREE.Vector3(-2,-2,-1),new THREE.Vector3(2,2,1)),position:new THREE.Vector3(18,0,0),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3(1,1,1),chestHeight:26,armorPush:0,pack:false,exterior:fit};
test('SR8 resting solve can pull a floating model inward and preserve clearance',()=>{
 const f=clearRetentionEnvelope(p);
 assert.ok(f.correction.x<0);
 assert.ok(Math.abs(f.box.min.x-fit.front(0,0)-.38)<1e-5);
 const s=clearRetentionEnvelope({...p,mode:'side-slung',position:new THREE.Vector3(0,0,18)});
 assert.ok(s.correction.z<0);
 assert.ok(Math.abs(s.box.min.z-fit.side(0,0,1)-.38)<1e-5);
 const b=clearRetentionEnvelope({...p,mode:'back-slung',position:new THREE.Vector3(-18,0,0)});
 assert.ok(b.correction.x>0);
 assert.ok(Math.abs(b.box.max.x-fit.back(0,0)+.38)<1e-5);
});
test('SR8 bounded artwork support rejects the empty global-box corner',()=>{
 const root=new THREE.Group();
 const m=new THREE.MeshBasicMaterial();
 const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),m);a.position.set(-6,0,0);
 const b=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),m);b.position.set(6,0,8);
 root.add(a,b);const bounds=new THREE.Box3().setFromObject(root);
 const shape=retentionShape([root],bounds);
 assert.ok(shape.length>0&&shape.length<=MAX_RETENTION_SUPPORT_POINTS);
 assert.ok(!shape.some(v=>v.x<0&&v.z>5));
 const data={...p,bounds,position:new THREE.Vector3(10,0,0)};
 const local=clearRetentionEnvelope({...data,shape});
 assert.ok(Number.isFinite(local.correction.x));
 assert.equal(clearRetentionEnvelope({...data,mode:'held-one'}).correction.length(),0);
 a.geometry.dispose();b.geometry.dispose();m.dispose();
});
test('SR8 ground correction precedes local fitting; pack stays a real obstruction',()=>{
 const floor=clearRetentionEnvelope({...p,position:new THREE.Vector3(10,-30,0)});
 assert.ok(floor.box.min.y+p.chestHeight>=2-1e-6);
 const pack=new THREE.Box3(new THREE.Vector3(-13,-4,-4),new THREE.Vector3(-6,5,4));
 const b=clearRetentionEnvelope({...p,mode:'back-slung',position:new THREE.Vector3(-6,0,0),pack:true,packBounds:pack});
 assert.ok(b.box.max.x<=-13.38+1e-6);
});
