import test from 'node:test';
import assert from 'node:assert/strict';
import {readHelmetField,resolveHelmetField,resolveHelmetFieldColor}
 from '../src/operator-helmet-field-policy.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
test('H7 field helmet choices roundtrip through wardrobe without granting equipment',()=>{
 const v=readHelmetField({band:true,bandColor:'tan',fastened:false,
  goggles:'rear',goggleSleeve:true,shroud:true,battery:true,rails:true,
  scrim:'garbage',concealment:'foliage-medium',tilt:'forward',patches:true});
 const read=readWardrobe({...initialWardrobe(),helmetField:v});
 assert.deepEqual(read.helmetField,v);
 assert.equal(v.concealment,'foliage');
 assert.equal(readHelmetField({goggles:'fake',webbingColor:'pink'}).goggles,'none');
});
test('H7 saved options do not vanish when changing between historical and modern shells',()=>{
 const v=readHelmetField({rails:true,shroud:true,camera:true,velcro:true,
  band:true,concealment:'net',goggles:'front',light:true,strobe:true});
 const old=resolveHelmetField('pasgt',v);
 assert.equal(old.rails,true);assert.equal(old.camera,false);
 assert.equal(old.shroud,true);assert.equal(old.goggles,'front');
 assert.equal(resolveHelmetField('ach',v).rails,true);
 assert.equal(v.rails,true);
});
test('H7 webbing defaults remain quiet with manual swatch overrides',()=>{
 assert.equal(resolveHelmetFieldColor('auto',0x333b42),0x262a29);
 assert.equal(resolveHelmetFieldColor('auto',0xb7a17e),0x977e59);
 assert.equal(resolveHelmetFieldColor('auto',0x6b7264,true),0x586548);
 assert.equal(resolveHelmetFieldColor('match',0x7c634b),0x7c634b);
 assert.equal(resolveHelmetFieldColor('black',0xb7a17e),0x262a29);
});
