import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readHelmetCoverConfig,resolvedHelmetCoverConfig,helmetCoverChoices}
 from '../src/operator-helmet-cover-policy.ts';
import {createM1HelmetCoverLayers,updateM1HelmetCoverLayers}
 from '../src/operator-helmet-cover-visuals.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';
test('R5E: a M1 cover is separate from the shell; other helmets cannot inherit it',()=>{
 assert.deepEqual(headwearCamoChoices('m1-steel'),[]);
 assert.ok(helmetCoverChoices('m1-steel').includes('mitchell-leaf'));
 assert.deepEqual(helmetCoverChoices('pasgt'),[]);
 assert.deepEqual(resolvedHelmetCoverConfig('ach',{helmetCover:'loose',
  helmetCoverCamo:'mitchell-leaf'}),{});
 const safe=resolvedHelmetCoverConfig('m1-steel',{
  helmetCover:'fitted',helmetCoverCamo:'multicam',helmetBand:'elastic'});
 assert.equal(safe.helmetCoverCamo,undefined);
 assert.equal(safe.helmetBand,'elastic');
});
test('R5E: optional cover fields serialize through the existing version-one wardrobe',()=>{
 const old=readWardrobe(initialWardrobe());
 assert.equal(old.helmetCover,undefined);
 const worn=readWardrobe({...old,helmetCover:'loose',
  helmetCoverCamo:'mitchell-leaf',helmetBand:'cloth',
  helmetNet:'coarse',helmetScrim:'field'});
 assert.equal(readWardrobe(worn).helmetCoverCamo,'mitchell-leaf');
 assert.equal(worn.helmetScrim,'field');
 assert.deepEqual(readHelmetCoverConfig({helmetCover:'nonsense',helmetBand:'none'}),{
  helmetBand:'none'});
});
test('R5E: fitted and loose cloth have distinct meshes and optional field equipment',()=>{
 const parent=new THREE.Group(),v=createM1HelmetCoverLayers(parent);
 for(const group of [v.fitted,v.loose,v.clothBand,v.elasticBand,v.net,
  v.sparseScrim,v.fieldScrim]){
  assert.equal(group.visible,false);
  assert.ok(group.children.length>0);
  assert.ok(group.children.every(x=>x instanceof THREE.Mesh));
 }
 const fittedGeo=v.fitted.children[0].geometry;
 const looseGeo=v.loose.children[0].geometry;
 fittedGeo.computeBoundingBox();looseGeo.computeBoundingBox();
 assert.ok(looseGeo.boundingBox.max.x>fittedGeo.boundingBox.max.x);
 updateM1HelmetCoverLayers(v,{helmetCover:'fitted',helmetCoverCamo:'mitchell-leaf',
  helmetNet:'coarse',helmetBand:'cloth',helmetScrim:'sparse'},'test-1');
 assert.equal(v.fitted.visible,true);
 assert.equal(v.loose.visible,false);
 assert.equal(v.net.visible,true);
 assert.equal(v.clothBand.visible,true);
 assert.equal(v.sparseScrim.visible,true);
 assert.ok(v.fabric.map);
 updateM1HelmetCoverLayers(v,{helmetCover:'none'},'test-1');
 assert.equal(v.fitted.visible,false);
 assert.equal(v.loose.visible,false);
 assert.equal(v.fabric.map,null);
});
