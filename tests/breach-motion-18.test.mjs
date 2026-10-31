import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const feet=[{position:{x:0,y:-5.6},contact:true,worldYaw:0,height:0,
 phase:'planted',progress:1},{position:{x:0,y:5.6},contact:false,worldYaw:0,
 height:1,phase:'swinging',progress:.5}];
const motion=tacticalTension=>bodyFromContacts({feet,velocity:48,
 heading:0,travelYaw:.5,turning:.8,injury:0,posture:'stand',
 position:{x:0,y:0},hybridSupport:true,acceleration:85,
 tacticalTension});
test('alert tactical movement stabilizes upper body without changing contacts',()=>{
 const relaxed=motion(0),alert=motion(1);
 assert.ok(Math.abs(alert.weaponYaw)<Math.abs(relaxed.weaponYaw));
 assert.ok(Math.abs(alert.torsoSide)<Math.abs(relaxed.torsoSide));
 assert.ok(Number.isFinite(alert.pelvisY));
});
