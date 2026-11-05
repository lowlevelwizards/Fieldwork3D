import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {letoPeaDotOverlay,LETO_PEADOT_DENSITIES} from '../src/operator-camo-leto-peadots.ts';
import {HEADWEAR_CAMO_IDS,headwearCamoIndices,headwearCamoPixels,
 headwearCamoCoverage,headwearCamoPlacement,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';

const WIDTH=64;
const countDiff=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);

function syntheticLetoBase(){
 const src=new Uint8Array(WIDTH*WIDTH).fill(1);
 for(let y=0;y<WIDTH;y++)for(let x=0;x<WIDTH;x++){
  const i=y*WIDTH+x;
  if(x<26 && y<35)src[i]=0;           // broad khaki leaf
  if(x>37 && y<35)src[i]=2;           // moss-green leaf
  if(x>23 && x<42 && y>39)src[i]=4;   // loam lobe
  if(x>9 && x<19 && y>39 && y<57)src[i]=3; // dark leaf shadow
  if(x>48 && y>44)src[i]=5;           // deepest shadow
 }
 return src;
}

test('7C maintains 54 camouflage IDs and saves original SS-Leto selection',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.ok(HEADWEAR_CAMO_IDS.includes('ss-leto'));
 assert.ok(headwearCamoChoices('boonie').includes('ss-leto'));
 const saved=readWardrobe({...initialWardrobe(),
  headwearCamo:'ss-leto',headwearCamoRoll:19,
  fabricCamo:{top:'ss-leto',trousers:'ss-leto'}});
 assert.equal(saved.headwearCamo,'ss-leto');
 assert.equal(saved.headwearCamoRoll,19);
 assert.equal(saved.fabricCamo.top,'ss-leto');
 assert.equal(saved.fabricCamo.trousers,'ss-leto');
});

test('7C low / medium / high are deterministic, increasing pea-dot auditions',()=>{
 const source=syntheticLetoBase(),original=source.slice();
 assert.deepEqual(Object.keys(LETO_PEADOT_DENSITIES),['low','medium','high']);
 const low=letoPeaDotOverlay(source,'low');
 const mid=letoPeaDotOverlay(source,'medium');
 const high=letoPeaDotOverlay(source,'high');
 assert.deepEqual(source,original,'does not mutate the 7B macro art');
 assert.deepEqual(mid,letoPeaDotOverlay(source),'medium is production default');
 assert.deepEqual(mid,letoPeaDotOverlay(source,'medium'));
 const dl=countDiff(source,low),dm=countDiff(source,mid),dh=countDiff(source,high);
 assert.ok(dl>0 && dl<dm && dm<dh,'three genuinely different overlay densities');
 assert.ok(dm/4096>.025 && dm/4096<.095,
  'medium changes only a controlled 2.5–9.5% of the canonical master');
 // Dark leaf shadows remain intact, as do edge pixels in unbroken fields.
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const ink=source[y*64+x],changed=mid[y*64+x]!==ink;
  if(ink===3||ink===5)assert.equal(changed,false,'preserve the dark shadow forms');
  if(changed){
   assert.ok([0,1,2,4].includes(ink),'only eligible leaf interiors');
   assert.notEqual(mid[y*64+x],ink,'a real contrasting colored pea-dot');
  }
 }
 assert.throws(()=>letoPeaDotOverlay(new Uint8Array(32*32)),/64px master/);
});

test('7C live SS-Leto master prints opaque pea dots on identical headwear and cloth pixels',()=>{
 const ink=headwearCamoIndices('ss-leto'),bytes=headwearCamoPixels('ss-leto');
 assert.equal(ink.length,4096);
 assert.equal(bytes.length,16384);
 assert.deepEqual(ink,headwearCamoIndices('ss-leto'),'fixed master for stable UV reroll');
 const coverage=headwearCamoCoverage('ss-leto');
 assert.ok(coverage[0]>.12 && coverage[4]>.08,
  'tan and loam leaf masses are retained after micro detail');
 assert.ok(coverage[5]>.03,'pea dots do not remove deepest shadows');
 const tex=wardrobeFabricCamoTexture('ss-leto','trousers',
  headwearCamoPlacement('rook','trousers','ss-leto',7));
 assert.equal(tex.image.width,64);
 assert.equal(tex.magFilter,THREE.NearestFilter);
 assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
 assert.deepEqual(tex.image.data,bytes);
 for(let i=3;i<bytes.length;i+=4)assert.equal(bytes[i],255);
});

test('7C leaves unrelated camouflage family masters unchanged and distinct',()=>{
 const leto=headwearCamoIndices('ss-leto');
 for(const id of ['spectre-skwo','berezka','multicam','multicam-tropic',
  'pencott-greenzone','aor1','ukrainian-mm14']){
  assert.notDeepEqual(leto,headwearCamoIndices(id),'SS-Leto stays distinct from '+id);
 }
});
