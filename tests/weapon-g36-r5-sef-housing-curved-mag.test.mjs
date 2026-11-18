/** R5: authenticity-led placement and curvilinear magazine ink, zero mesh growth. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY as FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_SEF_INDEX_MARKS,G36_SEF_GLYPH_SIZE}
 from '../src/weapons/geometry/weapon-pixel-detail.ts';
import {G36_MAG30_CURVE} from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {arMagazineSample} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {g36PixelAtlas,g36PixelAtlasLayout,applyG36PixelDetails}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(x=>x.userData[k]);
const tri=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const census=g=>g.children.reduce((n,m)=>n+tri(m),0);
const near=(a,b,t=.02)=>Math.abs(a-b)<=t;
const tilePixel=(col,x,y)=>{
 const b=[-1.35,3.30,-8.42,-2.60];
 const sx=Math.floor((x-b[0])/(b[1]-b[0])*96);
 const sy=Math.floor((y-b[2])/(b[3]-b[2])*96);
 if(sx<0||sx>=96||sy<0||sy>=96)return 255;
 return g36PixelAtlas().image.data[((sy+96)*384+(col*96+sx))*4];
};
const mapMagazine=(t,u)=>{
 const c=G36_MAG30_CURVE,p=arMagazineSample(c,t);
 return [p.x+p.nx*u*c.width/2,p.y+p.ny*u*c.width/2];
};

test('R5 SEF is entirely above trigger-guard boundary, visible on flat housing, HK F-E-left S-right',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const pivot={x:-5.20,y:-1.68};
 const marks=one(g,'g36SelectorMarkings');
 const [S,E,F]=G36_SEF_INDEX_MARKS;
 assert.deepEqual([S.letter,E.letter,F.letter],['S','E','F']);
 assert.ok(F.x<pivot.x-.70&&E.x<pivot.x-.70,'F/E left of pivot');
 assert.ok(F.y>E.y+.25,'F above E');
 assert.ok(S.x>pivot.x+1.2,'S to the right of safety lever');
 assert.equal(g.children.filter(x=>x.userData.g36SelectorMarkings).length,1);
 assert.equal(tri(marks),12,'six quad letters in one mesh/draw');
 assert.equal(marks.userData.g36SelectorArtVersion,'r6-raised-indexed-sef');
 const pos=marks.geometry.getAttribute('position');
 assert.equal(pos.count,24);
 const hub=one(g,'g36SelectorHub');
 const lever=one(g,'g36SelectorLever');
 for(const [i,mark] of [S,E,F].entries()){
  assert.ok(mark.y-G36_SEF_GLYPH_SIZE.height/2>=-2.18,
   mark.letter+' below top of imaginary trigger guard');
  assert.ok(mark.y+G36_SEF_GLYPH_SIZE.height/2<=-1.49,
   mark.letter+' creeps onto offset upper receiver');
  assert.ok(near(mark.z,1.185),'glyph clears lower receiver side z=1.14');
  const dist=Math.hypot(mark.x-pivot.x,mark.y-pivot.y);
  assert.ok(dist>.74,mark.letter+' touches pivot housing');
  for(const side of [0,1]){
   const start=(side*3+i)*4,sign=side===0?1:-1;
   let x=0,y=0,z=0;
   for(let k=0;k<4;k++){
    x+=pos.getX(start+k);y+=pos.getY(start+k);z+=pos.getZ(start+k);
   }
   assert.ok(near(x/4,mark.x)&&near(y/4,mark.y));
   assert.ok(near(z/4,sign*mark.z));
  }
 }
 // The present right-pointing lever ends before S's left edge.
 assert.ok(S.x-G36_SEF_GLYPH_SIZE.width/2 > -4.16);
 assert.ok(hub&&lever);
 clearWeaponSilhouette(g);m.dispose();
});

test('R5 magazine decorative cartridges follow THE production curved magazine frame',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.magCurveAligned,true);
 assert.equal(layout.magGhostCartridges,5);
 assert.equal(layout.magRibsPerSide,0);
 // At three separated cross-mag stations, identical t does NOT produce
 // a horizontal stroke; the artwork tilts with t - .065*u.
 for(const [i,station] of [ .29,.54,.80 ].entries()){
  const u=-.35,shifted=station-.065*u;
  const [x,y]=mapMagazine(shifted,u);
  const [xOther,yOther]=mapMagazine(station-.065*.30,.30);
  assert.ok(Math.abs(y-yOther)>.15,'strokes must be diagonally canted');
  // 96px nearest-neighbor rasterization can put an exact center on a
  // blank pixel. Accept any adjacent pixel inside a quarter-unit window.
  const neighborhood=(col,px,py)=>[-.065,0,.065].some(dx=>
   [-.065,0,.065].some(dy=>tilePixel(col,px+dx,py+dy)<247));
  assert.ok(neighborhood(2,x,y),'curve-aligned cartridge '+i+' visible');
  assert.ok(neighborhood(3,xOther,yOther),'other side of same cartridge visible');
 }
 for(const col of [2,3]){
  let decorated=0;
  const shades=new Set();
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
   const rgba=g36PixelAtlas().image.data,i=((96+y)*384+col*96+x)*4;
   const v=rgba[i];shades.add(v);
   assert.equal(rgba[i+3],255,'no alpha-sort transparency');
   if(v<255)decorated++;
  }
  assert.ok(shades.has(227)&&shades.has(231)&&shades.has(220),
   'two round values and muted coupling detail');
  assert.ok(decorated>750&&decorated<1200,
   'approximately 10 percent of tile, bold five curved strokes, not full-width bands');
 }
 const arr=g36PixelAtlas().image.data;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++)
  assert.equal(arr[((96+y)*384+2*96+x)*4],arr[((96+y)*384+3*96+x)*4],
   'both magazine faces must be equivalent without mirrored barcode effect');
});

test('R5 keeps same 476-triangle 23-mesh actual Arsenal factory with pooled magazine atlas',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 assert.equal(g.children.length,23);
 assert.equal(census(g),476);
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:FACTORY.parts});
 assert.equal(live.children.length,23);
 assert.equal(census(live),476);
 assert.equal(one(live,'g36SelectorMarkings').userData.g36SelectorArtVersion,'r6-raised-indexed-sef');
 const mag=one(live,'g36Magazine');
 assert.strictEqual(mag.material.map,g36PixelAtlas());
 assert.equal(mag.material.transparent,false);
 assert.equal(FACTORY.parts.magazine,'g36-mag30');
 assert.equal(FACTORY.feedVisualId,'g36-polymer-556');
 const mapped=mag.material;
 applyG36PixelDetails(live);
 assert.strictEqual(mag.material,mapped,'no material/texture reallocation on repeat');
 clearWeaponSilhouette(live);clearWeaponSilhouette(g);m.dispose();
});
