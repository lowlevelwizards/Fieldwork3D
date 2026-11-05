import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {CAMO6A_IDS,camo6AIndices} from '../src/operator-camo-batch-6a.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 HEADWEAR_CAMO_DENSITY,headwearCamoPixels,headwearCamoSize,headwearCamoCoverage,headwearCamoIndices,
 headwearCamoPlacement,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {CAMO_CATALOG,filterCamoCatalog} from '../src/operator-headwear-camo-catalog.ts';
import {headwearCamoTexture} from '../src/operator-headwear-materials.ts';
import {FABRIC_CAMO_DENSITY,wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {fabricCamoCompatible} from '../src/operator-fabric-camo-policy.ts';
import {initialWardrobe,readWardrobe,matchWardrobeUniformCamo} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {validArmorPrint,validRigPrint} from '../src/operator-rig-authenticity-policy.ts';

const BATCH=['atacs-fg','ukrainian-mm14','aor2','multicam-tropic',
 'atacs-au','ss-leto','aor1','multicam-arid'];
test('6A appends precisely eight new masters without renaming historical 30 IDs',()=>{
 assert.deepEqual(CAMO6A_IDS,BATCH);
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(30,38),BATCH);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 assert.ok(headwearCamoChoices('boonie').every(id=>HEADWEAR_CAMO_IDS.includes(id)));
 assert.equal(headwearCamoChoices('soviet-steel').length,0);
 assert.ok(!headwearCamoChoices('high-cut').includes('ss-leto'));
});
test('6A fabrics have distinct opaque canonical colors, periodic 64px masters and stable art',()=>{
 const seen=new Set();
 for(const id of CAMO6A_IDS){
  const r=HEADWEAR_CAMO_RECIPES[id],indices=headwearCamoIndices(id);
  const headwear=headwearCamoPixels(id),coverage=headwearCamoCoverage(id);
  assert.equal(headwearCamoSize(id),64);
  assert.equal(indices.length,4096);
  assert.equal(headwear.length,64*64*4);
  assert.equal(r.colors.length,r.targetCoverage.length);
  assert.ok(r.motifs.length>=4,id);
  assert.ok(r.colors.length>=4&&r.colors.length<=7,id);
  assert.ok(r.description.length>50,id);
  assert.deepEqual(indices,camo6AIndices(id,
   id==='multicam-tropic'||id==='multicam-arid'?headwearCamoIndices('multicam'):undefined),
   'deterministic '+id);
  assert.ok(coverage.every(v=>v>.01&&v<.80),id+' distinct ink proportions');
  for(let n=0;n<coverage.length;n++)
   assert.ok(Math.abs(coverage[n]-r.targetCoverage[n])<
    ((id==='multicam-tropic'||id==='multicam-arid')?.035:.002),id+' palette ratio '+n);
  for(let j=0;j<indices.length;j++){
   const o=j*4;
   assert.deepEqual(Array.from(headwear.slice(o,o+3)),r.colors[indices[j]],id);
   assert.equal(headwear[o+3],255);
  }
  const key=Buffer.from(headwear).toString('base64');
  assert.ok(!seen.has(key),'batch must not be simple palette recolors: '+id);
  seen.add(key);
  assert.ok(CAMO_CATALOG[id]?.origin,id);
 }
});
test('6A look identities preserve digital vs organic, terrain and per-pattern density',()=>{
 assert.equal(CAMO_CATALOG['ukrainian-mm14'].origin,'Ukraine');
 assert.equal(CAMO_CATALOG['aor1'].terrain,'arid');
 assert.equal(CAMO_CATALOG['aor2'].terrain,'woodland');
 assert.equal(CAMO_CATALOG['ss-leto'].origin,'Russia');
 assert.equal(CAMO_CATALOG['atacs-fg'].style,'organic');
 assert.equal(CAMO_CATALOG['aor1'].style,'digital');
 assert.equal(HEADWEAR_CAMO_DENSITY.aor1,4);
 assert.equal(HEADWEAR_CAMO_DENSITY.aor2,4);
 assert.equal(FABRIC_CAMO_DENSITY['atacs-fg'],2.8);
 assert.equal(filterCamoCatalog({terrain:'all',style:'all',origin:'Ukraine',
  text:'',onlyCompatible:false,onlyFavorites:false},[],new Set())[0],'ukrainian-mm14');
});
test('6A applies same master to UV1 headwear and body cuts with repeat/reroll persistence',()=>{
 const outfit=resolvedWardrobe(initialWardrobe(),initialEquipmentLoadout());
 for(const id of CAMO6A_IDS){
  const phase=headwearCamoPlacement('rook','headwear:boonie',id,7);
  const texture=headwearCamoTexture('boonie',id,phase);
  const cloth=wardrobeFabricCamoTexture(id,'top',phase);
  assert.equal(texture.image.width,128,id);
  assert.equal(texture.channel,1,id);
  assert.equal(texture.magFilter,THREE.NearestFilter);
  assert.equal(cloth.image.width,64,id);
  assert.equal(cloth.magFilter,THREE.NearestFilter);
  assert.equal(cloth.colorSpace,THREE.SRGBColorSpace);
  assert.deepEqual(cloth.image.data,headwearCamoPixels(id));
  assert.ok(cloth.repeat.x>0&&cloth.repeat.y>0);
  const saved=readWardrobe({...initialWardrobe(),headwearCamo:id,headwearCamoRoll:3});
  assert.equal(saved.headwearCamo,id);
  assert.equal(saved.headwearCamoRoll,3);
  const withMatch=matchWardrobeUniformCamo(initialWardrobe(),outfit,id);
  if(fabricCamoCompatible(id,'top',outfit)&&fabricCamoCompatible(id,'trousers',outfit)){
   assert.equal(withMatch.fabricCamo.top,id);
   assert.equal(withMatch.fabricCamo.trousers,id);
  }
 }
});
test('6A authentic garment and loadbearing restrictions remain independent',()=>{
 const outfit=resolvedWardrobe(initialWardrobe(),initialEquipmentLoadout());
 assert.equal(fabricCamoCompatible('ss-leto','top',{...outfit,top:'gorka-jacket'}),true);
 assert.equal(fabricCamoCompatible('atacs-fg','top',{...outfit,top:'gorka-jacket'}),true);
 assert.equal(fabricCamoCompatible('aor1','top',{...outfit,top:'gorka-jacket'}),false);
 assert.equal(fabricCamoCompatible('aor2','armor',outfit),false);
 assert.equal(validArmorPrint('plate-standard','ukrainian-mm14'),true);
 assert.equal(validRigPrint('micro-rig','atacs-fg'),true);
 assert.equal(validRigPrint('chicom-rig','multicam-arid'),false);
 assert.equal(validRigPrint('field-webbing','ss-leto'),false);
});

test('6B MultiCam variants use the exact original ink topology and identical world scale',()=>{
 const original=headwearCamoIndices('multicam');
 const originalColors=HEADWEAR_CAMO_RECIPES.multicam.colors;
 for(const id of ['multicam-tropic','multicam-arid']){
  const indices=headwearCamoIndices(id);
  assert.equal(headwearCamoSize(id),64);
  assert.equal(indices.length,4096);
  assert.equal(HEADWEAR_CAMO_DENSITY[id],4);
  assert.equal(FABRIC_CAMO_DENSITY[id],4);
  assert.equal(32/HEADWEAR_CAMO_DENSITY.multicam,64/HEADWEAR_CAMO_DENSITY[id]);
  assert.equal(32/FABRIC_CAMO_DENSITY.multicam,64/FABRIC_CAMO_DENSITY[id]);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)
   assert.equal(indices[y*64+x],original[(y>>1)*32+(x>>1)],id+' pixel '+x+','+y);
  assert.notDeepEqual(HEADWEAR_CAMO_RECIPES[id].colors,originalColors,
   id+' is a distinct seasonal palette');
 }
});
test('6B authored families preserve independent geometry and controlled micro/macro scale',()=>{
 const idList=['atacs-fg','atacs-au','ukrainian-mm14','aor1','aor2','ss-leto'];
 const tiles=idList.map(id=>headwearCamoIndices(id));
 const signatures=tiles.map(b=>Buffer.from(b).toString('base64'));
 assert.equal(new Set(signatures).size,idList.length);
 const diff=(a,b)=>a.reduce((n,p,i)=>n+(p!==b[i]?1:0),0)/a.length;
 assert.ok(diff(tiles[0],tiles[1])>.20,'A-TACS FG and AU have separately authored fields, not recolors');
 assert.ok(diff(tiles[3],tiles[4])>.20,'AOR1/AOR2 are separate connected digital designs');
 for(const id of ['ukrainian-mm14','aor1','aor2']){
  const image=headwearCamoIndices(id);
  const edges=[0,0];
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   if(image[y*64+x]!==image[y*64+(x+1)%64])edges[0]++;
   if(image[y*64+x]!==image[((y+1)%64)*64+x])edges[1]++;
  }
  assert.ok(edges[0]>160&&edges[1]>160,id+' requires digital breakup in both axes');
  assert.ok(Math.max(...edges)/Math.min(...edges)<2.5,id+' no single-direction stripe dominance');
 }
 const raw=readFileSync(new URL('../src/operator-camo-batch-6a.ts',import.meta.url),'utf8');
 assert.doesNotMatch(raw,/order\.sort\(/,'no percentile-sorted generic noise');
 assert.doesNotMatch(raw,/function score\(/,'no shared score field');
 assert.match(raw,/Multicam variants require the original 32px MultiCam ink master|MultiCam variants require the original 32px MultiCam ink master/i);
});
