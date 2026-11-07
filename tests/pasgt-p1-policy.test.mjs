import test from 'node:test';
import assert from 'node:assert/strict';
import {readPasgtDetails} from '../src/operator-pasgt-cover-policy.ts';
import {resolveHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
test('PASGT legacy field options resolve into a minimal field kit',()=>{
 assert.deepEqual(readPasgtDetails(undefined,{band:'elastic',scrim:'net'}),{
  construction:'slits',band:'standard',concealment:'net'
 });
 assert.deepEqual(readPasgtDetails({construction:'loops',band:'crossed',concealment:'foliage'}),{
  construction:'loops',band:'crossed',concealment:'foliage'
 });
});
test('PASGT cannot enable modern hardware and old loose becomes one fitted cover',()=>{
 const s=resolveHelmetSetup('pasgt',{
  cover:'loose',rails:'arc',shroud:'legacy',nvg:'dual-stowed',
  rearModule:'battery',rearStrobe:true
 }).setup;
 assert.equal(s.cover,'fitted');
 for(const k of ['rails','shroud','nvg','rearModule'])assert.equal(s[k],'none');
 assert.equal(s.rearStrobe,false);
});
test('PASGT field options persist without changing shell, print, or other slots',()=>{
 const w=readWardrobe({...initialWardrobe(),styles:{headwear:'pasgt'},
  headwearCamo:'m81-woodland',pasgtDetails:{
   construction:'loops',band:'crossed',concealment:'scrim'
  }});
 assert.equal(w.pasgtDetails.construction,'loops');
 assert.equal(w.pasgtDetails.band,'crossed');
 assert.equal(w.pasgtDetails.concealment,'scrim');
 assert.equal(w.styles.headwear,'pasgt');
 assert.equal(w.headwearCamo,'m81-woodland');
});
