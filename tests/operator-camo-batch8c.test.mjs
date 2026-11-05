import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAMO8A_IDS} from '../src/operator-camo-batch-8a.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoPixels,headwearCamoCoverage,
 headwearCamoPlacement,headwearCamoSize} from '../src/operator-headwear-camo.ts';
import {wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';

const id8=[...CAMO8A_IDS];
const difference=(a,b)=>a.reduce((sum,value,i)=>sum+(value!==b[i]?1:0),0)/a.length;
const transitions=(tile,dx,dy)=>{
 let n=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)
  if(tile[y*64+x]!==tile[((y+dy)&63)*64+((x+dx)&63)])n++;
 return n;
};
const palette=id=>HEADWEAR_CAMO_RECIPES[id].colors;

test('8C preserves all 54 IDs and cosmetic save identifiers',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(46),id8);
 for(const id of id8){
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 }
});

test('8C keeps Greek Lizard horizontal brush continuity and distinct blue Kamysh bands',()=>{
 const greek=headwearCamoIndices('greek-lizard');
 const kamysh=headwearCamoIndices('urban-kamysh');
 const gh=transitions(greek,1,0),gv=transitions(greek,0,1);
 const kh=transitions(kamysh,1,0),kv=transitions(kamysh,0,1);
 console.log('8C stripe edges',JSON.stringify({greekH:gh,greekV:gv,kamyshH:kh,kamyshV:kv}));
 assert.ok(gh<gv,'Greek brushstrokes must retain horizontally continuous runs');
 assert.ok(kh<kv,'Kamysh must remain horizontally banded');
 assert.ok(difference(greek,kamysh)>.25,'different authored structures, not a recolor');
 assert.ok(palette('greek-lizard')[0][0]>palette('greek-lizard')[0][2],
  'Greek should remain warm khaki');
 assert.ok(palette('urban-kamysh')[0][2]>=palette('urban-kamysh')[0][0],
  'Kamysh should remain cool steel blue');
});

test('8C separates JGSDF clustered print from Soldier 2000 brown-ground islands',()=>{
 const jgsdf=headwearCamoIndices('jgsdf-type2');
 const soldier=headwearCamoIndices('south-african-s2000');
 const jc=headwearCamoCoverage('jgsdf-type2');
 const sc=headwearCamoCoverage('south-african-s2000');
 console.log('8C fleck and island coverage',JSON.stringify({
  jgsdf:jc.map(x=>+x.toFixed(3)),soldier:sc.map(x=>+x.toFixed(3))
 }));
 assert.ok(jc[0]>.13,'JGSDF retains green ground');
 assert.ok(sc[0]>.37,'Soldier 2000 must keep broad exposed earth-brown ground');
 assert.ok(sc[0]<.58,'Soldier 2000 still needs plenty of green islands');
 assert.ok(sc[3]>.035&&sc[4]>.025,'Soldier 2000 pale and dark spot roles survive');
 assert.ok(difference(jgsdf,soldier)>.35,'independent masks');
 assert.ok(palette('jgsdf-type2')[0][1]>palette('jgsdf-type2')[0][0]);
 assert.ok(palette('south-african-s2000')[0][0]>palette('south-african-s2000')[0][1]);
});

test('8C Izlom stays dark/angular and separate from Leto; M98 remains pure 3-ink',()=>{
 const izlom=headwearCamoIndices('russian-izlom'),leto=headwearCamoIndices('ss-leto');
 const ic=headwearCamoCoverage('russian-izlom');
 assert.ok(ic[2]>.01&&ic[2]<.23,'tan shards remain accents');
 assert.ok(difference(izlom,leto)>.35,'Izlom is no Leto oakleaf recolor');
 const m98=headwearCamoIndices('norwegian-m98');
 assert.deepEqual([...new Set(m98)].sort(),[0,1,2]);
 const quarters=[];
 for(let qy=0;qy<2;qy++)for(let qx=0;qx<2;qx++){
  const inks=new Set();
  for(let y=qy*32;y<(qy+1)*32;y++)for(let x=qx*32;x<(qx+1)*32;x++)
   inks.add(m98[y*64+x]);
  quarters.push(inks.size);
 }
 assert.ok(quarters.every(n=>n>=2),'M98 each large garment-scale crop uses at least two tones');
});

test('8C frozen family patterns preserve exact PenCott / Kryptek geometry and 7C Leto',()=>{
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
 assert.notDeepEqual(headwearCamoPixels('pencott-metropolis'),
  headwearCamoPixels('pencott-greenzone'));
 assert.notDeepEqual(headwearCamoPixels('kryptek-typhon'),
  headwearCamoPixels('kryptek-highlander'));
 assert.deepEqual(headwearCamoIndices('ss-leto'),headwearCamoIndices('ss-leto'));
});

test('8C fixed-seed swatches and cloth agree, with unchanged nearest-neighbor sampling',()=>{
 for(const id of id8){
  const ix=headwearCamoIndices(id),bytes=headwearCamoPixels(id);
  assert.equal(headwearCamoSize(id),64);
  assert.equal(ix.length,4096);
  assert.equal(bytes.length,16384);
  assert.deepEqual(ix,headwearCamoIndices(id),'stable deterministic tile '+id);
  const inks=new Set(ix);
  assert.equal(inks.size,palette(id).length,id+' uses all its inks');
  for(let i=0;i<4096;i++){
   const c=palette(id)[ix[i]],o=i*4;
   assert.ok(c,'palette valid '+id);
   assert.deepEqual([...bytes.slice(o,o+3)],c);
   assert.equal(bytes[o+3],255);
  }
  const seed=headwearCamoPlacement('rook','trousers',id,17);
  assert.deepEqual(seed,headwearCamoPlacement('rook','trousers',id,17),'fixed preview UV phase');
  const tex=wardrobeFabricCamoTexture(id,'trousers',seed);
  assert.equal(tex.image.width,64);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.deepEqual(tex.image.data,bytes);
 }
});
