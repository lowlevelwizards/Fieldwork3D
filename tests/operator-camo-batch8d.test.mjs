import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoCoverage,headwearCamoPixels,
 headwearCamoPlacement,headwearCamoSize} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,
 wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';

const targets=['jgsdf-type2','south-african-s2000','norwegian-m98'];
const unchanged=['russian-izlom','greek-lizard','urban-kamysh',
 'pencott-metropolis','kryptek-typhon','ss-leto'];
const edges=tile=>{
 let n=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const ink=tile[y*64+x];
  if(ink!==tile[y*64+((x+1)&63)])n++;
  if(ink!==tile[((y+1)&63)*64+x])n++;
 }
 return n;
};
const difference=(a,b)=>{
 let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;
 return n/a.length;
};
test('8D retains the 62-camo registry, saved looks and unchanged relatives',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,62);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,62);
 for(const id of [...targets,...unchanged]){
  assert.ok(HEADWEAR_CAMO_IDS.includes(id));
  const tile=headwearCamoIndices(id),palette=HEADWEAR_CAMO_RECIPES[id].colors;
  assert.equal(tile.length,4096);
  assert.equal(headwearCamoSize(id),64);
  assert.deepEqual(tile,headwearCamoIndices(id),'immutable cached tile '+id);
  assert.equal(new Set(tile).size,palette.length,id+' retains its inks');
  assert.equal(headwearCamoPixels(id).length,16384);
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 }
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
});

test('8D JGSDF has a fine-scale green fleck family, unlike broad brown S2000',()=>{
 const j=headwearCamoIndices('jgsdf-type2');
 const s=headwearCamoIndices('south-african-s2000');
 const m=headwearCamoIndices('norwegian-m98');
 const jc=headwearCamoCoverage('jgsdf-type2');
 const sc=headwearCamoCoverage('south-african-s2000');
 console.log('8D coverages',JSON.stringify({
  jgsdf:jc.map(v=>+v.toFixed(3)),soldier:sc.map(v=>+v.toFixed(3)),
  edgeCounts:{jgsdf:edges(j),soldier:edges(s),m98:edges(m)}
 }));
 assert.ok(jc[0]>.15,'leafy green ground remains visible');
 assert.equal(new Set(j).size,5,'JGSDF retains the full multicolor fleck hierarchy');
 assert.ok(difference(j,s)>.35,'JGSDF must not read as S2000 recolored');
 assert.ok(edges(j)>edges(m)*1.1,'JGSDF small flecks are richer than M98 lobes');
 assert.ok(HEADWEAR_CAMO_RECIPES['jgsdf-type2'].colors[0][1]>
  HEADWEAR_CAMO_RECIPES['jgsdf-type2'].colors[0][0]);
});

test('8D Soldier 2000 keeps brown ground and spotted sage/grass islands',()=>{
 const s=headwearCamoIndices('south-african-s2000');
 const sc=headwearCamoCoverage('south-african-s2000');
 assert.ok(sc[0]>.38&&sc[0]<.55,'preserve at least 38% earth-brown background');
 assert.ok(sc[3]>.035&&sc[4]>.025,'light and dark island-spot colors survive');
 assert.equal(new Set(s).size,5);
 assert.ok(edges(s)>edges(headwearCamoIndices('norwegian-m98')),
  'Soldier 2000 has richer fine structure than 3-ink Norwegian lobes');
 // Internal pea accents touch authored green shapes, not free-floating dots.
 let internal=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=s[y*64+x];
  if(v!==3&&v!==4)continue;
  const neighbor=[s[y*64+((x+1)&63)],s[y*64+((x+63)&63)],
   s[((y+1)&63)*64+x],s[((y+63)&63)*64+x]];
  if(neighbor.some(n=>n===1||n===2))internal++;
 }
 assert.ok(internal>12,'interior contrast spots are integrated into islands');
});

test('M98 8D identity survives later approved fabric-density revisions',()=>{
 const tile=headwearCamoIndices('norwegian-m98');
 assert.deepEqual([...new Set(tile)].sort(),[0,1,2],'strict Norwegian 3-ink art');
 assert.equal(FABRIC_CAMO_DENSITY['norwegian-m98'],3.0);
 const baselinePeriod=64/2.55,selectedPeriod=fabricCamoWorldPeriod('norwegian-m98');
 const highDensityPeriod=64/3.4;
 assert.ok(highDensityPeriod<selectedPeriod&&selectedPeriod<baselinePeriod);
 assert.ok(selectedPeriod>21.3&&selectedPeriod<21.4);
 const sections=[];
 for(let qy=0;qy<2;qy++)for(let qx=0;qx<2;qx++){
  const tones=new Set();
  for(let y=qy*32;y<(qy+1)*32;y++)
   for(let x=qx*32;x<(qx+1)*32;x++)tones.add(tile[y*64+x]);
  sections.push(tones.size);
 }
 assert.ok(sections.every(n=>n>=2),'every large cloth crop keeps useful lobe breaks');
});

test('8D five fixed garment cuts share pixels, headgear identity and metric repeat',()=>{
 for(const id of targets)for(const seed of [0,5,17,73,401]){
  const cut=headwearCamoPlacement('rook','trousers',id,seed);
  assert.deepEqual(cut,headwearCamoPlacement('rook','trousers',id,seed));
  const tex=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.equal(tex.image.width,64);
  assert.deepEqual(tex.image.data,headwearCamoPixels(id));
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.equal(tex.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64);
  assert.equal(tex.repeat.y,tex.repeat.x);
 }
});
