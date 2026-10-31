import test from 'node:test';import assert from 'node:assert/strict';
import {handlingPose} from '../src/breach-weapon-pose.ts';
import {readFileSync} from 'node:fs';
const decide=(extra={})=>handlingPose({
 aim:0,moving:0,obstruction:false,friendlyNear:false,
 weapon:'carbine',...extra});
test('178: weapon handling responds to contextual intent and immediate threats',()=>{
 assert.equal(decide({intent:'run',moving:.95}),'low');
 assert.equal(decide({intent:'look'}),'ready');
 assert.equal(decide({intent:'pie',moving:.13}),'ready');
 assert.equal(decide({intent:'door',friendlyNear:true}),'high');
 assert.equal(decide({obstruction:true,aim:1}),'short');
 assert.equal(decide({threatRange:20,aim:.45}),'point');
 assert.equal(decide({threatRange:250,aim:.96}),'ads');
 assert.equal(decide({intent:'move',moving:.5}),'low');
});
test('178: passive pose hysteresis avoids chattering but never blocks danger',()=>{
 assert.equal(decide({intent:'move',moving:.6,
   previous:'ready',heldFor:.08}),'ready');
 assert.equal(decide({intent:'move',moving:.6,
   previous:'ready',heldFor:.18}),'low');
 assert.equal(decide({obstruction:true,
   previous:'ready',heldFor:0}),'short');
 assert.equal(decide({threatRange:15,aim:.6,
   previous:'low',heldFor:0}),'point');
});
test('178: live and shot-time barrel use same close-range selection criteria',()=>{
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 const muzzle=readFileSync(new URL('../src/breach-muzzle.ts',import.meta.url),'utf8');
 assert.match(rig,/intent:p.handlingIntent,threatRange:p.threatRange/);
 assert.match(muzzle,/threatRange:p.threatRange,weapon:p.weapon/);
 assert.match(rig,/fromWeapon:\{origin:r.weapon.position.clone\(\)/);
});
