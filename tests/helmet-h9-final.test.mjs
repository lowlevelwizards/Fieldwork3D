import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {readHelmetField,resolveHelmetField,HELMET_FIELD_DEFAULTS}
 from '../src/operator-helmet-field-policy.ts';

const fullLook={...HELMET_FIELD_DEFAULTS,band:true,bandColor:'tan',
 webbingColor:'black',concealment:'net',fastened:false,tilt:'forward',
 shroud:true,rails:true,bungees:true,velcro:true,
 goggles:'rear',goggleSleeve:true,strobe:true,counterweight:true,
 battery:true,light:true,camera:true,chemlight:true,patches:true};
test('H9.8: full appearance configuration serializes without destructive suppression',()=>{
 const stored=readHelmetField(JSON.parse(JSON.stringify(fullLook)));
 assert.deepEqual(stored,fullLook);
 const modern=resolveHelmetField('ach',stored);
 assert.equal(modern.goggles,'rear');
 assert.equal(modern.goggleSleeve,true);
 for(const key of ['shroud','rails','bungees','velcro','strobe',
  'light','camera','chemlight','patches'])
  assert.equal(modern[key],true,key);
 assert.equal(modern.counterweight,false);
 assert.equal(modern.battery,false);
 assert.equal(stored.battery,true,'raw appearance retains suppressed preference');
 const pasgt=resolveHelmetField('pasgt',stored);
 for(const key of ['rails','bungees','velcro','counterweight','battery','camera','light'])
  assert.equal(pasgt[key],false,key);
 // Unsupported PASGT options remain in the saved look; switching back
 // to ACH must not destroy preferences.
 assert.equal(readHelmetField(stored).battery,true);
});
test('H9.8: updating appearance never recreates geometry or adds frame-time cost',()=>{
 for(const shell of ['ach','mich-2001','mich-2002']){
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const groups=Object.fromEntries(Object.entries(kit.modules)
   .map(([key,value])=>[key,value]));
  const meshCount=kit.root.getObjectByName('helmet-field-shroud')
   ?.children.length??0;
  let beforeMeshes=0,beforeVertices=0;
  kit.root.traverse(o=>{
   if(o instanceof THREE.Mesh){
    beforeMeshes++;
    beforeVertices+=o.geometry.getAttribute('position')?.count??0;
   }
  });
  assert.ok(beforeMeshes<280,'too many draw candidates '+shell+' '+beforeMeshes);
  assert.ok(beforeVertices<85000,'too many geometry vertices '+shell+' '+beforeVertices);
  for(let i=0;i<24;i++){
   updateHelmetFieldLayers(kit,i%2?fullLook:{
    ...fullLook,concealment:'none',goggles:'front',goggleSleeve:false,
    strobe:false,camera:false,shroud:false,rails:false,bungees:false
   },0x586548,true);
   for(const [key,g] of Object.entries(groups))
    assert.equal(kit.modules[key],g,'replaced group '+key);
  }
  let after=0;kit.root.traverse(o=>{if(o instanceof THREE.Mesh)after++});
  assert.equal(after,beforeMeshes,'appearance mutated mesh count');
  assert.equal(kit.root.getObjectByName('helmet-field-shroud')?.children.length??0,
   meshCount);
 }
});
