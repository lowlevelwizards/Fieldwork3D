import test from 'node:test';import assert from 'node:assert/strict';
import {sampleRetentionFreeWrist} from '../src/operator-retention-locomotion.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
test('SR10 idle arms hang, walking arms swing in opposite phases, run and crouch are distinct',()=>{
 const idle={speed:0,stride:.25,posture:'stand'};
 const walk={...idle,speed:40,gait:'walk'},run={...walk,gait:'run'};
 const l=sampleRetentionFreeWrist(-1,'front-slung',idle),r=sampleRetentionFreeWrist(1,'front-slung',idle);
 assert.ok(l.y<-14&&r.y<-14);assert.equal(l.x,r.x);
 const a=sampleRetentionFreeWrist(-1,'front-slung',walk),b=sampleRetentionFreeWrist(1,'front-slung',walk);
 assert.ok((a.x-l.x)*(b.x-r.x)<0);
 assert.ok(Math.abs(sampleRetentionFreeWrist(-1,'front-slung',run).x-l.x)>Math.abs(a.x-l.x));
 const crouch=sampleRetentionFreeWrist(-1,'front-slung',{...walk,posture:'crouch'});
 assert.ok(crouch.y>a.y);
 const side=sampleRetentionFreeWrist(1,'side-slung',walk);
 assert.ok(Math.abs(side.x-r.x)<Math.abs(b.x-r.x));assert.ok(side.z>b.z);
 assert.deepEqual(sampleRetentionFreeWrist(-1,'front-slung',walk),a);
});
test('SR10 wide armor moves free wrist outboard without raising the arm',()=>{
 const bare=equipmentExterior('armor-bare','no-rig','combat-shirt');
 const armor=equipmentExterior('plate-heavy','full-chest','gorka-jacket');
 const a=sampleRetentionFreeWrist(1,'front-slung',undefined,bare);
 const b=sampleRetentionFreeWrist(1,'front-slung',undefined,armor);
 assert.ok(b.z>=a.z);assert.equal(a.y,b.y);
});
