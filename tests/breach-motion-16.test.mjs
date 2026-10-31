import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const feet=[-1,1].map(side=>({position:{x:0,y:side*5.6},
 phase:'planted',progress:1,height:0,contact:true,worldYaw:0}));
const input=(weaponWeight)=>({feet,velocity:45,heading:0,travelYaw:.3,
 turning:.4,injury:0,posture:'stand',position:{x:0,y:0},
 acceleration:110,weaponWeight,hybridSupport:true});
test('load makes physical low-ready inertia meaningful but bounded',()=>{
 const light=bodyFromContacts(input(.8));
 const heavy=bodyFromContacts(input(1.3));
 assert.ok(Math.abs(heavy.weaponYaw)>Math.abs(light.weaponYaw));
 assert.ok(Math.abs(heavy.weaponYaw)<.05);
 assert.ok(Math.abs(heavy.weaponPitch)<.05);
});
