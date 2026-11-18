/** G36 R6 — one-variable selector and magazine read-distance polish. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_SEF_INDEX_MARKS,G36_SEF_GLYPH_SIZE}
 from '../src/weapons/geometry/weapon-pixel-detail.ts';
import {G36_E0_FACTORY as FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {g36PixelAtlas,g36PixelAtlasLayout} from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const triangleCount=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const census=g=>g.children.reduce((a,m)=>a+triangleCount(m),0);
const near=(a,b,t=.018)=>Math.abs(a-b)<t;

test('R6 selector rises 0.28 on both sides with unchanged robust six-sided controls',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 assert.equal(all(g,'g36SelectorHub').length,2);
 assert.equal(all(g,'g36SelectorLever').length,2);
 for(const hub of all(g,'g36SelectorHub')){
  assert.ok(near(hub.position.x,-5.20));
  assert.ok(near(hub.position.y,-1.68));
  assert.equal(hub.geometry.parameters.radialSegments,6);
 }
 for(const lever of all(g,'g36SelectorLever')){
  assert.ok(near(lever.position.x,-4.74));
  assert.ok(near(lever.position.y,-1.58));
 }
 assert.equal(all(g,'g36SelectorMarkings').length,1);
 clearWeaponSilhouette(g);mat.dispose();
});

test('R6 SEF remains above the guard boundary despite raising pivot near upper/lower seam',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const glyphs=all(g,'g36SelectorMarkings')[0];
 const [S,E,F]=G36_SEF_INDEX_MARKS;
 assert.deepEqual(G36_SEF_INDEX_MARKS.map(x=>x.letter),['S','E','F']);
 assert.equal(glyphs.userData.g36SelectorArtVersion,'r6-raised-indexed-sef');
 assert.equal(triangleCount(glyphs),12,'six quad marks remain one pooled mesh');
 assert.ok(F.y>E.y+.25);
 assert.ok(S.x>-4.00&&S.x<-3.85);
 assert.ok(E.x>-6.03&&E.x<-5.90);
 assert.ok(F.x>-6.03&&F.x<-5.90);
 for(const mark of G36_SEF_INDEX_MARKS){
  assert.ok(mark.y-G36_SEF_GLYPH_SIZE.height/2>=-2.18,
   mark.letter+' creeps below trigger-guard threshold');
  assert.ok(mark.y+G36_SEF_GLYPH_SIZE.height/2<=-1.49,
   mark.letter+' becomes occluded under wider upper receiver');
  assert.ok(near(mark.z,1.185),'one flat lower-housing plane');
 }
 // Whole rectangular F/E glyphs must not run into the .55-radius hub.
 const edge=(mark)=>Math.hypot(Math.max(0,Math.abs(mark.x+5.20)-G36_SEF_GLYPH_SIZE.width/2),
  Math.max(0,Math.abs(mark.y+1.68)-G36_SEF_GLYPH_SIZE.height/2));
 assert.ok(edge(F)>.55,'F touches pivot');
 assert.ok(edge(E)>.55,'E touches pivot');
 // S starts just to the right of the lever tip.
 assert.ok(S.x-G36_SEF_GLYPH_SIZE.width/2>-4.16);
 const uv=glyphs.geometry.getAttribute('uv');
 assert.equal(uv.count,24,'both SEF sets retain exact 3-letter atlas crops');
 clearWeaponSilhouette(g);mat.dispose();
});

test('R6 75%-thicker curve strokes retain gentle contrast and atlas bilateral symmetry',()=>{
 const a=g36PixelAtlas(),data=a.image.data;
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.magGhostCartridges,5);
 assert.equal(layout.magCurveAligned,true);
 assert.equal(layout.magRibsPerSide,0);
 assert.equal(layout.magCouplerImpressions,2);
 const fingerprints=[];
 for(const col of [2,3]){
  const shades=new Map();let decorated=0;
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
   const i=((96+y)*384+col*96+x)*4,v=data[i];
   shades.set(v,(shades.get(v)||0)+1);
   assert.equal(data[i+3],255,'magazine remains fully opaque');
   if(v!==255)decorated++;
  }
  assert.ok(shades.has(227)&&shades.has(231)&&shades.has(243),
   '12–14% stronger dark-value ghost rounds, with tapered lighter border');
  assert.ok(shades.has(220)&&shades.has(246),'subtle existing coupling impressions');
  assert.ok(decorated>=850&&decorated<=1100,
   'thickened strokes must remain clearly present, not fill the magazine face');
  assert.ok((shades.get(255)||0)>8000,'most of magazine remains unpainted polymer');
  fingerprints.push([...shades.entries()].sort((a,b)=>a[0]-b[0]));
 }
 assert.deepEqual(fingerprints[0],fingerprints[1],
  'same low-contrast atlas art on both curved magazine sides');
 assert.equal(a.image.width,384);
 assert.equal(a.image.height,192);
});

test('R6 unchanged live Arsenal complexity, magazine/optic identity and reload datum',()=>{
 const material=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(material);
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:FACTORY.parts});
 for(const group of [g,live]){
  assert.equal(group.children.length,23);
  assert.equal(census(group),476);
  assert.equal(all(group,'g36SelectorMarkings').length,1);
  assert.equal(all(group,'g36Magazine').length,1);
 }
 assert.equal(FACTORY.parts.magazine,'g36-mag30');
 assert.equal(FACTORY.feedVisualId,'g36-polymer-556');
 assert.equal(FACTORY.lowerSightY,4.19);
 assert.equal(FACTORY.upperSightY,5.16);
 clearWeaponSilhouette(g);clearWeaponSilhouette(live);material.dispose();
});
