import test from 'node:test';
import assert from 'node:assert/strict';
import {readHelmetField,resolveHelmetField} from '../src/operator-helmet-field-policy.ts';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers} from '../src/operator-helmet-field-visuals.ts';

test('H5.5: never delete legacy data while suppressing impossible gear',()=>{
 const raw=readHelmetField({rails:false,shroud:false,bungees:true,
  light:true,camera:true,chemlight:true,concealment:'scrim',
  counterweight:true,battery:true,goggles:'rear',patches:true});
 const bare=resolveHelmetField('ach',raw,{covered:false});
 assert.equal(bare.bungees,false);
 assert.equal(bare.light,false);assert.equal(bare.camera,false);
 assert.equal(bare.chemlight,true,'top-rear clip no longer needs side rails');
 assert.equal(bare.concealment,'none');assert.equal(bare.patches,false);
 assert.equal(bare.counterweight,false);assert.equal(bare.battery,false);
 assert.equal(raw.concealment,'scrim');assert.equal(raw.counterweight,true);
 const net=resolveHelmetField('ach',{concealment:'net'},{covered:false});
 assert.equal(net.concealment,'net');
 const kit=createHelmetFieldLayers(new THREE.Group(),'ach');
 updateHelmetFieldLayers(kit,{concealment:'net'},0x77715f,false);
 assert.equal(kit.modules.net.visible,true);
 assert.equal(kit.modules.band.visible,true);
});
test('H5.5: exclusive rear slots and occupied rail side',()=>{
 const rear=resolveHelmetField('ach',{counterweight:true,battery:true});
 assert.equal(rear.battery,true);assert.equal(rear.counterweight,false);
 const sameSide=resolveHelmetField('ach',{
  rails:true,camera:true,light:true,cameraSide:'right',lightSide:'right'
 });
 assert.equal(sameSide.camera,true);assert.equal(sameSide.light,false);
 const split=resolveHelmetField('ach',{
  rails:true,camera:true,light:true,cameraSide:'right',lightSide:'left'
 });
 assert.equal(split.camera,true);assert.equal(split.light,true);
});
