import test from 'node:test';
import assert from 'node:assert/strict';
import {IDENTITY_MARKINGS,MARKING_SLOTS,identityMarkingChoices,
 readIdentityMarkings,referenceIdentity,setIdentityMarking}
 from '../src/operator-identity-markings.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
test('R5A: every mark has a unique ID and an actual supported mount',()=>{
 assert.equal(new Set(IDENTITY_MARKINGS.map(x=>x.id)).size,IDENTITY_MARKINGS.length);
 for(const x of IDENTITY_MARKINGS){
  assert.ok(x.slots.length>0);assert.ok(x.slots.every(slot=>MARKING_SLOTS.includes(slot)));
  assert.ok(x.from<=x.to);
  for(const slot of x.slots)assert.ok(identityMarkingChoices(slot,x.from).includes(x));
 }
});
test('R5A: only supported slots and registered IDs survive saved data',()=>{
 assert.deepEqual(readIdentityMarkings({leftShoulder:'label-police',
  chest:'flag-us',rightShoulder:'flag-germany',armband:'fake',extra:'flag-us'}),
  {rightShoulder:'flag-germany'});
 const old=initialWardrobe();
 assert.equal(readWardrobe(old).markings,undefined);
 const marked=readWardrobe({...old,markings:{
  rightShoulder:'flag-ukraine',chest:'label-police',armband:'band-yellow'}});
 assert.deepEqual(marked.markings,{
  rightShoulder:'flag-ukraine',chest:'label-police',armband:'band-yellow'});
 assert.deepEqual(readWardrobe(marked),marked);
 assert.deepEqual(setIdentityMarking(marked.markings??{},'chest',null),{
  rightShoulder:'flag-ukraine',armband:'band-yellow'});
});
test('R5A: historical flag choices never pretend recent flags existed earlier',()=>{
 assert.ok(!identityMarkingChoices('rightShoulder',1980).some(x=>x.id==='flag-ukraine'));
 assert.ok(!identityMarkingChoices('rightShoulder',1975).some(x=>x.id==='flag-south-africa'));
 assert.deepEqual(referenceIdentity('South Africa',1985,'military'),{});
 assert.deepEqual(referenceIdentity('East Germany',1980,'military'),{rightShoulder:'flag-east-germany'});
 assert.deepEqual(referenceIdentity('United States',2015,'police'),{chest:'label-police'});
});
