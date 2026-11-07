import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PASGT_ATLAS_WIDTH,PASGT_ATLAS_HEIGHT,PASGT_PANEL_CENTER_U,
 PASGT_FABRIC_PANELS,PASGT_TOP_SEAM_OFFSETS,PASGT_UV_TEXELS_PER_UNIT,
 createPasgtDrapedGeometry,pasgtAtlasUv,pasgtFabricCoordinate,
 PASGT_RING_SAMPLES
} from '../src/operator-pasgt-drape-geometry.ts';
import {pasgtCoverTexture,PASGT_PANEL_PRINT_PHASE,PASGT_SEAM_HALF_WIDTH_TEXELS}
 from '../src/operator-pasgt-cover-texture.ts';

test('PASGT three sewn panels have isolated, non-overlapping metric UV islands',()=>{
 assert.equal(PASGT_ATLAS_WIDTH,512);
 assert.equal(PASGT_ATLAS_HEIGHT,256);
 assert.deepEqual([...PASGT_FABRIC_PANELS],['left','top','right']);
 assert.equal(PASGT_UV_TEXELS_PER_UNIT,7);
 const centers=PASGT_FABRIC_PANELS.map(p=>PASGT_PANEL_CENTER_U[p]);
 assert.ok(centers[0]+88<centers[1]-40);
 assert.ok(centers[1]+40<centers[2]-88);
 for(const panel of PASGT_FABRIC_PANELS)
  for(const s of PASGT_RING_SAMPLES){
   if(panel==='left'&&s.side!=='left')continue;
   if(panel==='right'&&s.side!=='right')continue;
   for(const ring of ['top','shoulder','ramp','hem']){
    const uv=pasgtAtlasUv(pasgtFabricCoordinate(s,ring),panel);
    assert.ok(uv[0]>0&&uv[0]<1 && uv[1]>0&&uv[1]<1,
     panel+' '+s.side+' '+ring+' '+uv);
   }
  }
 const g=createPasgtDrapedGeometry();
 assert.equal(g.userData.pasgtUvLayout,'three-sewn-cuts-independent-islands');
 assert.deepEqual(g.userData.printPanels,['left','top','right']);
 assert.ok(g.getAttribute('uv').count===g.getAttribute('position').count);
});
test('three sewn material cuts have independent camouflage phase but same scale',()=>{
 const shift=PASGT_FABRIC_PANELS.map(p=>PASGT_PANEL_PRINT_PHASE[p].join(','));
 assert.equal(new Set(shift).size,3);
 for(const pattern of ['m81-woodland','three-color-desert']){
  const a=pasgtCoverTexture(pattern,'operator-p6');
  const b=pasgtCoverTexture(pattern,'operator-p6');
  assert.equal(a,b,'cached by operator and print placement');
  assert.equal(a.image.width,512);
  for(const p of PASGT_FABRIC_PANELS){
   const uv=pasgtAtlasUv([0,0],p);
   const x=Math.round(uv[0]*512-.5);
   const y=Math.round(uv[1]*256-.5);
   assert.equal(a.image.data[(y*512+x)*4+3],255,'opaque printed panel '+p);
  }
 }
});
test('two bold front-to-back seams exist on both plain and camouflaged covers',()=>{
 assert.deepEqual([...PASGT_TOP_SEAM_OFFSETS],[-2.6,2.6]);
 assert.ok(PASGT_SEAM_HALF_WIDTH_TEXELS>=2);
 for(const print of [undefined,'m81-woodland']){
  const t=pasgtCoverTexture(print,'operator-p6');
  for(const x of PASGT_TOP_SEAM_OFFSETS){
   const u0=pasgtAtlasUv([x,0],'top')[0],x0=Math.round(u0*512-.5);
   const v0=pasgtAtlasUv([0,0],'top')[1],y0=Math.round(v0*256-.5);
   const a=(y0*512+x0)*4,b=(y0*512+x0+10)*4;
   assert.equal(t.image.data[a+3],255);
   const seam=Array.from(t.image.data.slice(a,a+3)).reduce((n,x)=>n+x,0);
   const plain=Array.from(t.image.data.slice(b,b+3)).reduce((n,x)=>n+x,0);
   if(!print)assert.ok(seam<plain,'seam must show even without camo');
  }
 }
});
