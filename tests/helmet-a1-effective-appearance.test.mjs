import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEffectiveHelmetAppearance} from '../src/operator-helmet-effective-appearance.ts';
const shells=['ach','mich-2002','mich-2001','pasgt'];
test('A1: effective appearance is deterministic and preserves every requested preference',()=>{
 for(const shell of shells){
  const raw={shroud:false,rails:false,bungees:true,light:true,
   battery:true,counterweight:true,goggles:'rear',strobe:true,chemlight:true,
   band:false,concealment:'foliage',patches:true};
  const frozen=JSON.stringify(raw);
  const input={shell,helmetField:raw,helmetSetup:{cover:'none'}};
  const a=resolveEffectiveHelmetAppearance(input),b=resolveEffectiveHelmetAppearance(input);
  assert.deepEqual(a,b);
  assert.equal(JSON.stringify(raw),frozen);
  assert.equal(a.cover,false);
  assert.equal(a.field.light,false);
  assert.equal(a.field.bungees,false);
  assert.equal(a.field.counterweight,false);
  assert.equal(a.field.battery,false);
  assert.equal(a.field.chemlight,false);
  assert.equal(a.field.concealment,'none');
  assert.ok(a.feedback.find(x=>x.key==='light'&&x.status==='saved-inactive'));
  assert.ok(a.feedback.find(x=>x.key==='concealment'));
 }
});
test('A1: field net automatically requires band without rewriting save',()=>{
 const input={shell:'ach',helmetSetup:{cover:'fitted'},helmetField:{band:false,concealment:'net'}};
 const e=resolveEffectiveHelmetAppearance(input);
 assert.equal(e.field.band,true,'effective state includes the required net band');
 assert.ok(e.feedback.some(x=>x.key==='band'&&x.status==='required'));
 assert.equal(input.helmetField.band,false);
});
test('A1: covered status matches legacy printed look fallback and PASGT details',()=>{
 const ach=resolveEffectiveHelmetAppearance({shell:'ach',headwearCamo:'ucp'});
 assert.equal(ach.cover,true);
 const pasgt=resolveEffectiveHelmetAppearance({shell:'pasgt',helmetSetup:{cover:'fitted'},
  pasgtDetails:{band:'elastic',concealment:'scrim'}});
 assert.equal(pasgt.cover,true);
 assert.equal(pasgt.pasgt?.band,'elastic');
});
test('A1: other headwear has no helmet accessories',()=>{
 const e=resolveEffectiveHelmetAppearance({shell:'boonie',
  helmetField:{rails:true,strobe:true}});
 assert.equal(e.field.rails,false);
 assert.equal(e.field.strobe,false);
});
