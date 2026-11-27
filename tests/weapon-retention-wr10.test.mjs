import test from 'node:test';import assert from 'node:assert/strict';
import {hasGroundedPrimary,ownGroundedPrimary,usesUnslungPlacement} from '../src/breach-grounded-primary.ts';
test('WR10 exact world identity distinguishes temporary placement from evidence',()=>{
 const a={id:'a',side:'blue',groundedPrimaryId:7,weaponConfiguration:{slots:{sling:'sling-none'}}};
 const item={id:7,ownerId:'a',status:'loose',temporaryPlacement:true};
 const s={droppedFirearms:[item],doors:[],coverState:[],civilians:[]};
 assert.ok(hasGroundedPrimary(a));assert.equal(ownGroundedPrimary(s,a),item);
 assert.equal(usesUnslungPlacement(s,a),true);
 item.status='secured';assert.equal(ownGroundedPrimary(s,a),undefined);
 assert.equal(hasGroundedPrimary(a),true);
 assert.equal(ownGroundedPrimary({...s,droppedFirearms:[{...item,status:'loose',ownerId:'b'}]},a),undefined);
});

import {newSession,team} from '../src/breach-game.ts';
import {setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {prepareGroundedPrimary,retrieveGroundedPrimary} from '../src/breach-grounded-primary.ts';
import {activateSite} from '../src/breach-core.ts';
test('WR10 new friendly starter is slung; explicit unslung world placement is unique and reversible',()=>{
 const s=newSession(),a=team(s)[0];
 try{
  assert.equal(a.weaponConfiguration.slots.sling,'sling-two-point');
  a.weaponConfiguration=setWeaponAttachment(a.weaponConfiguration,'sling','sling-none');
  const ammo=a.magazine;
  for(let i=0;i<60&&!hasGroundedPrimary(a);i++)prepareGroundedPrimary(s,a,1/60);
  assert.ok(hasGroundedPrimary(a));
  const item=ownGroundedPrimary(s,a);
  assert.ok(item);assert.equal(item.loadedRounds,ammo);
  prepareGroundedPrimary(s,a,1/60);
  assert.equal(s.droppedFirearms.filter(w=>w.temporaryPlacement&&w.ownerId===a.id).length,1);
  assert.equal(retrieveGroundedPrimary(s,a),true);
  assert.equal(item.status,'retrieved');assert.equal(hasGroundedPrimary(a),false);
  assert.equal(a.magazine,ammo);
 }finally{activateSite(null);}
});
