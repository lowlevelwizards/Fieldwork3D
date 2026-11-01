import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,passable} from '../src/breach-core.ts';
import {coverHeight} from '../src/breach-cover-height.ts';
import {exposure} from '../src/breach-combat.ts';
import {materialForFixture} from '../src/breach-materials.ts';
import {generateSite} from '../src/breach-site.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';

test('full-height glass is transparent to vision but remains an actual glass barrier',()=>{
 const glass={x:100,y:100,w:10,h:44,low:true,fixture:'glass-barrier'};
 try{
  activateSite({walls:[],doors:[],cover:[glass]});
  const a={x:60,y:100},b={x:140,y:100};
  assert.equal(coverHeight(glass),39);
  assert.equal(materialForFixture(glass.fixture),'glass');
  assert.equal(passable({x:100,y:100}),false,'glass still blocks passage');
  assert.equal(exposure(a,b,[],false,false,true).blocked,false,'standing sees through glass');
  assert.equal(exposure(a,b,[],true,true,true).blocked,false,'crouching sees through glass');
  assert.equal(exposure(a,b,[],false,false).blocked,true,'glass still intercepts fire');
 }finally{activateSite(null);}
});
test('raised sills use low real cover and do not become full-height glass',()=>{
 const sill={x:100,y:100,w:10,h:44,low:true,fixture:'window-sill'};
 try{
  activateSite({walls:[],doors:[],cover:[sill]});
  assert.equal(coverHeight(sill),14);
  assert.equal(materialForFixture(sill.fixture),'brick');
  const a={x:60,y:100},b={x:140,y:100};
  assert.equal(exposure(a,b,[],false,false).blocked,false,'standing shoots over sill');
  assert.equal(exposure(a,b,[],true,true).blocked,true,'crouching shot meets sill');
 }finally{activateSite(null);}
});
test('bar installations derive the same physical cover category as the asset catalog',()=>{
 const asset=propDefinition('bar-counter');
 assert.ok(asset);
 let found=0;
 for(let seed=1;seed<=110;seed++){
  const site=generateSite(seed);
  for(const prop of site.cover.filter(c=>c.fixture==='bar-counter')){
   found++;
   assert.equal(prop.low,asset.cover==='low','bar counter on seed '+seed);
   assert.equal(coverHeight(prop),asset.height);
  }
 }
 assert.ok(found>0,'at least one restaurant should generate a complete bar');
});
