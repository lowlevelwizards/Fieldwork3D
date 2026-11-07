import test from 'node:test';
import assert from 'node:assert/strict';
import {readPasgtDetails,resolvePasgtDetails,pasgtConcealmentRequiresSlits}
 from '../src/operator-pasgt-cover-policy.ts';
import {resolveHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
test('old sewn loops and crossed band migrate to slits and elastic',()=>{
 assert.deepEqual(readPasgtDetails(undefined,{band:'elastic',scrim:'net'}),{
  slits:true,band:'elastic',concealment:'net'
 });
 assert.deepEqual(readPasgtDetails({construction:'loops',band:'crossed',concealment:'foliage'}),{
  slits:true,band:'elastic',concealment:'foliage'
 });
});
test('foliage/scrim automatically expose slits, without changing saved no-slits preference',()=>{
 for(const concealment of ['foliage','scrim']){
  const saved={slits:false,band:'none',concealment};
  assert.equal(resolvePasgtDetails(saved).slits,true);
  assert.equal(saved.slits,false);
  assert.equal(pasgtConcealmentRequiresSlits(concealment),true);
 }
 assert.equal(resolvePasgtDetails({slits:false,band:'none',concealment:'net'}).slits,false);
 assert.equal(resolvePasgtDetails({slits:false,band:'none',concealment:'none'}).slits,false);
});
test('PASGT modern hardware suppressed; old loose stays a fitted cover',()=>{
 const s=resolveHelmetSetup('pasgt',{
  cover:'loose',rails:'arc',shroud:'legacy',nvg:'dual-stowed',
  rearModule:'battery',rearStrobe:true
 }).setup;
 assert.equal(s.cover,'fitted');
 for(const k of ['rails','shroud','nvg','rearModule'])assert.equal(s[k],'none');
 assert.equal(s.rearStrobe,false);
});
test('PASGT details persist and retain other wardrobe fields',()=>{
 const w=readWardrobe({...initialWardrobe(),styles:{headwear:'pasgt'},
  headwearCamo:'m81-woodland',pasgtDetails:{
   slits:false,band:'elastic',concealment:'scrim'
  }});
 assert.equal(w.pasgtDetails.slits,false);
 assert.equal(w.pasgtDetails.band,'elastic');
 assert.equal(w.pasgtDetails.concealment,'scrim');
 assert.equal(w.styles.headwear,'pasgt');
 assert.equal(w.headwearCamo,'m81-woodland');
});
