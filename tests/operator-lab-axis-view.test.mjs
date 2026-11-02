import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('operator Lab front/back/side and inspection camera depend on local -Z axis',()=>{
 const s=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(s,/next==='front'\?new THREE\.Vector3\(0,0,-75\)/);
 assert.match(s,/next==='back'\?new THREE\.Vector3\(0,0,75\)/);
 assert.match(s,/next==='side'\?new THREE\.Vector3\(75,0,0\)/);
 assert.match(s,/LEGACY_FRAME_YAW/);
 assert.match(s,/const threeQuarter=new THREE\.Vector3\(57,35,-54\)/);
 assert.match(s,/operatorAttachmentPoint\(rig,focusZone\)/);
 assert.match(s,/box\.rotation\.y=rig!\.legacyYaw/);
});

test('full look frame aims at torso-center; headwear selection is automatically framed',()=>{
 const s=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(s,/rig\?\.root\.position\.x\?\?0,25,rig\?\.root\.position\.z\?\?0/);
 assert.match(s,/isolation\.value='head'/);
 assert.match(s,/chooseTrack\('idle'\);frameWardrobeSelection\(\)/);
 assert.doesNotMatch(s,/headReviewFraming/);
});
