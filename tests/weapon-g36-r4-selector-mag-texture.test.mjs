/** G36 R4: SEF markings must be actual selector indices; magazine not blank. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_SEF_INDEX_MARKS} from '../src/weapons/geometry/weapon-pixel-detail.ts';
import {g36PixelAtlas,g36PixelAtlasLayout,applyG36PixelDetails}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(root,key)=>root.children.find(x=>x.userData[key]);
const tris=m=>(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;
const count=g=>g.children.reduce((n,m)=>n+tris(m),0);
const near=(a,b,t=.025)=>Math.abs(a-b)<=t;
const sample=(col,row,x,y)=>{
 const d=g36PixelAtlas().image.data,i=((row*96+y)*384+col*96+x)*4;
 return d[i];
};
test('R5 keeps HK SEF F/E left and S right, all on lower housing above trigger guard',()=>{
 const pivot={x:-5.20,y:-1.68};
 const expected=['S','E','F'];
 assert.deepEqual(G36_SEF_INDEX_MARKS.map(x=>x.letter),expected);
 const [s,e,f]=G36_SEF_INDEX_MARKS;
 assert.ok(s.x>pivot.x+1&&Math.abs(s.y-pivot.y)<.2,
  'S sits to the right on the flat housing');
 assert.ok(e.x<pivot.x-.7&&e.y< f.y-.25,
  'E is left/below F just as in actual HK SEF grip photo');
 assert.ok(f.x<pivot.x-.7&&f.y>e.y+.25,
  'F stays on upper-left of selector, not down the grip');
 for(const mark of [s,e,f]){
  assert.ok(mark.y-.15>=-2.18,'full glyph stays above trigger-guard seam');
  assert.ok(mark.y+.15<=-1.49,'does not cross larger upper-receiver side');
  assert.ok(near(mark.z,1.185),'same visible lower-housing side depth');
 }
 const m=new THREE.MeshBasicMaterial(),root=buildG36OriginalBlockout(m),
  glyphs=one(root,'g36SelectorMarkings');
 assert.equal(glyphs.userData.g36SelectorArtVersion,'r6-raised-indexed-sef');
 assert.equal(glyphs.userData.surfaceDetailKind,'hk-selector');
 assert.equal(tris(glyphs),12,'six quads in ONE mesh, not one mesh per letter');
 assert.equal(root.children.filter(x=>x.userData.g36SelectorMarkings).length,1);
 const positions=glyphs.geometry.getAttribute('position');
 const uvs=glyphs.geometry.getAttribute('uv');
 assert.equal(positions.count,24);
 for(let side=0;side<2;side++)for(let i=0;i<3;i++){
  const mark=G36_SEF_INDEX_MARKS[i],offset=(side*3+i)*4;
  let px=0,py=0,pz=0;
  for(let j=0;j<4;j++){
   px+=positions.getX(offset+j);py+=positions.getY(offset+j);pz+=positions.getZ(offset+j);
   assert.ok(uvs.getX(offset+j)>=16.5/24-1e-4);
   assert.ok(uvs.getX(offset+j)<=19.5/24+1e-4);
   assert.ok(uvs.getY(offset+j)>= (mark.atlasBottom-.5)/20-1e-4);
   assert.ok(uvs.getY(offset+j)<= (mark.atlasBottom+4.5)/20+1e-4);
  }
  assert.ok(near(px/4,mark.x)&&near(py/4,mark.y));
  assert.ok(near(pz/4,(side===0?1:-1)*mark.z));
 }
 // Same pooled HK white/red SEF atlas and no factory material override.
 const palette=glyphs.material;
 const data=palette.map.image.data;
 const hasColor=(r,g,b)=>{for(let i=0;i<data.length;i+=4)
  if(data[i]===r&&data[i+1]===g&&data[i+2]===b&&data[i+3])return true;
  return false;};
 assert.ok(hasColor(223,226,209)&&hasColor(191,65,56));
 const materials=Object.fromEntries(['polymer','steel','magazine','buttpad','optic','muzzle']
  .map(k=>[k,new THREE.MeshStandardMaterial()]));
 applyG36FactoryMaterials(root,materials);
 assert.strictEqual(glyphs.material,palette,'SEF survives factory color assignment');
 for(const mat of Object.values(materials))mat.dispose();
 clearWeaponSilhouette(root);m.dispose();
});
test('R5 magazine uses five low-contrast warped rounds on both opaque faces',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.magGhostCartridges,5);
 assert.equal(layout.magCurveAligned,true);
 assert.equal(layout.magCouplerImpressions,2);
 assert.equal(layout.magRibsPerSide,0,'no return to harsh vertical ribs');
 for(const col of [2,3]){
  const shades=new Set();let subtle=0;
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
   const value=sample(col,1,x,y);
   shades.add(value);
   if(value<250)subtle++;
  }
  assert.ok(shades.has(226)&&shades.has(230)&&shades.has(220));
  assert.ok(subtle>50&&subtle<1400,
   'subtle rounds visible, but majority of mag remains undecorated');
  assert.equal(sample(col,1,94,90),255,'blank outside silhouette');
 }
 const mat=new THREE.MeshStandardMaterial(),root=buildG36OriginalBlockout(mat);
 const startCount=root.children.length,startTris=count(root),mag=one(root,'g36Magazine');
 applyG36PixelDetails(root);
 assert.equal(root.children.length,startCount);
 assert.equal(count(root),startTris);
 assert.strictEqual(mag.material.map,g36PixelAtlas());
 assert.equal(mag.material.transparent,false);
 const decorated=mag.material;
 applyG36PixelDetails(root);
 assert.strictEqual(mag.material,decorated,'no repeated material cloning');
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:F.parts});
 assert.strictEqual(one(live,'g36Magazine').material.map,g36PixelAtlas());
 assert.equal(one(live,'g36Magazine').material.transparent,false);
 clearWeaponSilhouette(root);clearWeaponSilhouette(live);mat.dispose();
});
test('R4 maintains exactly 23 meshes and at most 480 triangles, same factory IDs',()=>{
 const mat=new THREE.MeshBasicMaterial(),root=buildG36OriginalBlockout(mat);
 assert.equal(root.children.length,23);
 assert.equal(count(root),476,'452 R2 + 16 muzzle R3 + 8 repositioned glyphs');
 assert.equal(tris(one(root,'g36SelectorMarkings')),12);
 assert.equal(F.parts.magazine,'g36-mag30');
 const live=new THREE.Group();
 addG36Family(live,{family:'g36',parts:F.parts});
 assert.equal(live.children.length,23);
 assert.equal(count(live),476);
 clearWeaponSilhouette(root);clearWeaponSilhouette(live);mat.dispose();
});
