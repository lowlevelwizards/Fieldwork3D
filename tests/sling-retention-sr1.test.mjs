import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
import {garmentContactAnchor} from '../src/operator-garment-contact-surface.ts';
test('SR1 bare and concealed fit follow visible clothing, not invisible armor',()=>{
 for(const top of ['combat-shirt','smock-jacket','gorka-jacket']){
  const bare=equipmentExterior('armor-bare','no-rig',top);
  const hidden=equipmentExterior('soft-slick','no-rig',top);
  const g=garmentContactAnchor(top,0);
  assert.equal(bare.front(0,0),g.front);
  assert.equal(hidden.back(0,0),g.back);
  assert.equal(bare.side(0,0,-1),-g.side);
  assert.equal(bare,equipmentExterior('armor-bare','no-rig',top));
 }
});
test('SR1 armor and localized rig surfaces fit independently',()=>{
 const bare=equipmentExterior('armor-bare','no-rig','combat-shirt');
 const armor=equipmentExterior('plate-heavy','no-rig','combat-shirt');
 const rig=equipmentExterior('plate-heavy','full-chest','combat-shirt');
 assert.ok(armor.front(0,0)>bare.front(0,0));
 assert.ok(armor.back(0,0)<bare.back(0,0));
 assert.ok(rig.front(-3.23,1.5)>armor.front(-3.23,1.5));
 assert.equal(rig.front(5.9,0),armor.front(5.9,0));
 assert.ok(rig.shoulder(1)[1]>=bare.shoulder(1)[1]);
 assert.equal(rig.side(0,0,1),-rig.side(0,0,-1));
});
