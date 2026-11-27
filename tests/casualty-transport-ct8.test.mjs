import test from 'node:test';import assert from 'node:assert/strict';
import {sampleLoadedCarrier,loadedCarrierHeading} from '../src/breach-loaded-carrier-pose.ts';
test('CT8 distinct loaded silhouettes and rearward drag facing',()=>{
 const base={patientId:'b',patient:{x:-25,y:0},heading:0};
 const drag=sampleLoadedCarrier({...base,mode:'drag'},20,10);
 const carry=sampleLoadedCarrier({...base,mode:'carry'},20,10);
 assert.ok(drag.crouch>carry.crouch);assert.notDeepEqual(drag.wristRight,carry.wristRight);
 assert.equal(loadedCarrierHeading('drag',{x:0,y:0},base.patient,0),Math.PI);
 assert.equal(loadedCarrierHeading('carry',{x:0,y:0},base.patient,0),0);
});
