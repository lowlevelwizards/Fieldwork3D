import test from 'node:test';import assert from 'node:assert/strict';
import {readTransportPatientPose,patientDrape,patientChestTilt,patientHipOffset,patientAnkleOffset} from '../src/breach-transport-patient-pose.ts';
import {buildTransportLabTrack} from '../src/casualty-transport-lab-track.ts';
test('carry pelvis is seated on one shoulder and independent of physical convergence',()=>{
 const carrier={id:'c',p:{x:100,y:50},health:4,heading:0,carryingId:'p'};
 const subject={id:'p',p:{x:80,y:50},health:0,heading:0,carriedById:'c',transportMode:'carry'};
 const a=readTransportPatientPose(subject,[carrier]),b=readTransportPatientPose({...subject,p:{x:100,y:52}},[carrier]);
 assert.deepEqual(a.chest,b.chest);assert.ok(a.chest.z>carrier.p.y+9);assert.ok(a.chest.x>carrier.p.x+2);
 assert.ok(patientChestTilt(a)>.7);assert.ok(patientHipOffset(a)>3);
 assert.ok(patientAnkleOffset(a,1).x<-12);
});
test('carry pickup arcs into a supported pose before custody and release loses drape',()=>{
 const frames=buildTransportLabTrack('carry','idle');
 const pickup=frames.filter(x=>x.stage==='pickup'&&x.pose),loaded=frames.find(x=>x.stage==='loaded'),release=frames.filter(x=>x.stage==='release');
 assert.ok(pickup.length>10);assert.ok(pickup[0].pose.chest.y<10);
 assert.ok(pickup.at(-1).pose.chest.y>30);
 assert.ok(Math.abs(pickup.at(-1).pose.chest.y-loaded.pose.chest.y)<1);
 assert.ok(patientDrape(release.at(-1).pose)<.01);
 assert.ok(release.at(-1).pose.chest.y<7);
});
