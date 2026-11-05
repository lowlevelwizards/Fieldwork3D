import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {headwearCuboidVolumes,createHeadwearSilhouette,
 HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {headwearColorChoices} from '../src/operator-headwear-colors.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';

test('R5D: M1 is independent, wider and less ear-wrapping than the SSh-40',()=>{
 const m1=headwearCuboidVolumes('m1-steel');
 const ssh=headwearCuboidVolumes('soviet-steel');
 assert.ok(m1.length>=8);
 assert.ok(m1.some(p=>p.name.includes('rolled-rim')));
 assert.ok(ssh.some(p=>p.name.includes('edge')));
 assert.notDeepEqual(m1,ssh);
 assert.ok(Math.abs(HEAD_SILHOUETTE_METRICS['m1-steel'].frontExtent)>
  Math.abs(HEAD_SILHOUETTE_METRICS['soviet-steel'].frontExtent));
 const built=createHeadwearSilhouette('m1-steel',new THREE.MeshStandardMaterial());
 assert.equal(built.children.length,1);
 assert.equal(built.userData.primitive,'cuboids-only');
});
test('R5D: M1 retains the real helmet equipment class and curated shell finishes',()=>{
 assert.deepEqual(headwearCamoChoices('m1-steel'),[]);
 assert.ok(headwearColorChoices('m1-steel').includes('olive-drab'));
 assert.ok(!headwearColorChoices('m1-steel').includes('beret-scarlet'));
 const kit=setEquipmentChoice(initialEquipmentLoadout('carbine'),'head','head-helmet');
 const look=setWardrobeStyle(initialWardrobe(),'headwear','m1-steel');
 assert.equal(resolvedWardrobe(look,kit).headwear,'m1-steel');
});
