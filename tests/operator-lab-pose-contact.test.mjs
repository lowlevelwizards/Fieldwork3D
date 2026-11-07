import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadVisualContact} from '../src/breach-reload-visual-contact.ts';
const fixture=(region,material,upper,lower)=>({
 valid:false,hardDepth:material==='rigid'?Math.max(upper,lower):0,
 softDepth:material!=='rigid'?Math.max(upper,lower):0,quality:1,
 contacts:[{label:region,region,material,upperDepth:upper,
  lowerDepth:lower,upperAllowed:.12,lowerAllowed:.12,
  upperExcess:Math.max(0,upper-.12),lowerExcess:Math.max(0,lower-.12),
  allowed:.12,depth:Math.max(upper,lower),blocking:true}]
});
test('Presentation accommodates a sleeve under a plate, not through torso',()=>{
 const plate=fixture('front-insert','rigid',1.4,.6);
 assert.equal(reloadVisualContact(plate,false,'carry').valid,false);
 const carry=reloadVisualContact(plate,true,'carry');
 assert.equal(carry.valid,true);
 assert.equal(carry.strictValid,false);
 assert.equal(carry.acceptedOverlaps,1);
 assert.equal(reloadVisualContact(fixture('torso-core','rigid',.92,.4),
  true,'carry').valid,false,'deep torso remains blocked');
 assert.equal(reloadVisualContact(fixture('front-insert','rigid',3.0,.2),
  true,'reload').valid,false,'deep plate stays blocked');
});
test('Loose pouches and textiles may compress, aim remains bounded',()=>{
 const pouch=fixture('rig-pouch','structured',1.5,.8);
 assert.equal(reloadVisualContact(pouch,true,'carry').valid,true);
 assert.equal(reloadVisualContact(pouch,false,'carry').valid,false);
 const returnToCenter=fixture('torso-core','rigid',1.2,.4);
 assert.equal(reloadVisualContact(returnToCenter,true,'aim').valid,false);
 assert.equal(reloadVisualContact(returnToCenter,true,'reload').valid,true);
 const shell=fixture('side-flank','soft',1.2,1.3);
 assert.equal(reloadVisualContact(shell,true,'carry').valid,true);
});
