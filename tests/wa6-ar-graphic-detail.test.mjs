import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {refs,construct} from '../src/arsenal/wa-art-models.ts';
import {arMagazineGraphicAtlas} from '../src/weapons/geometry/ar-magazine-graphic.ts';
import {AR_WA6_MAGAZINE_STEEL,AR_WA6_LOWER_STEEL} from '../src/weapons/geometry/weapon-visual-palette.ts';
test('WA6 opaque artwork atlas retains blank edges and shared authored marks',()=>{
 const t=arMagazineGraphicAtlas(),{width,height,data}=t.image;
 assert.equal(t,arMagazineGraphicAtlas());
 assert.equal(width,192);assert.equal(height,64);
 assert.equal(t.minFilter,THREE.NearestFilter);
 assert.equal(t.generateMipmaps,false);
 let short=0,long=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  assert.equal(data[i+3],255);
  assert.equal(data[i],data[i+1]);assert.equal(data[i],data[i+2]);
  if(x>=128)assert.equal(data[i],255);
  else if(data[i]===168){if(x<64)short++;else long++;}
 }
 assert.ok(short>100&&long>100);
 assert.equal(AR_WA6_MAGAZINE_STEEL.map,null,'unmapped base material stays pristine');
});
test('WA6 factory graphic details remain on actual body, independent of owner or variant',()=>{
 const mapped=new Set(),t=arMagazineGraphicAtlas();
 for(const e of refs.filter(e=>e.platform==='ar15')){
  const m=construct(e);
  try{
   const mags=[];let lower=0;
   m.model.traverse(n=>{if(n instanceof THREE.Mesh){
    if(n.name.startsWith('family-magazine-'))mags.push(n);
    if(n.material===AR_WA6_LOWER_STEEL)lower++;
   }});
   assert.ok(lower>0,e.id+' broad lower metal mass');
   if(e.id==='ar-mk18'){assert.equal(mags.length,2);assert.ok(mags.every(n=>!n.userData.arWA6IntegratedMagazineArt));continue;}
   assert.equal(mags.length,1,e.id);
   const n=mags[0];assert.ok(n.userData.arWA6IntegratedMagazineArt);
   assert.equal(n.material.map,t);assert.equal(n.material.transparent,false);
   assert.equal(n.material.color.getHex(),AR_WA6_MAGAZINE_STEEL.color.getHex());
   mapped.add(n.material);
   const uv=n.geometry.getAttribute('uv'),normal=n.geometry.getAttribute('normal');
   let face=0,edge=0;
   for(let i=0;i<uv.count;i++){
    if(Math.abs(normal.getZ(i))>.99){assert.ok(uv.getX(i)<2/3);face++;}
    else{assert.ok(uv.getX(i)>2/3);edge++;}
   }
   assert.ok(face>0&&edge>0);
  }finally{m.cleanup();}
 }
 assert.equal(mapped.size,1,'one app-owned mapped material, no per-model texture allocation');
});
