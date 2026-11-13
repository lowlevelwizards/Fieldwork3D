import test from 'node:test';
import assert from 'node:assert/strict';
import {createAchMichSurfaceBandGeometry}
 from '../src/operator-helmet-field-fit.ts';
import {createAchMichDrapedGeometry,ACH_MICH_COVER_OFFSET,
 ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE}
 from '../src/operator-ach-mich-cover-drape.ts';
import {ACH_MICH_SHELLS,ACH_MICH_UPPER_INSET,ACH_MICH_BEVEL_HEIGHT,
 headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,ACH_MICH_BINDING_HEIGHT}
 from '../src/operator-ach-mich-details.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';

const close=(a,b)=>Math.abs(a-b)<.0003;

test('H7.1 ACH band is a closed, horizontal four-wall ring outside the cloth',()=>{
 const shell='ach',p=achMichProfile(shell);
 for(const covered of [true,false]){
  const geo=createAchMichSurfaceBandGeometry(shell,covered);
  assert.equal(geo.userData.h71SquareAchBand,true);
  assert.equal(geo.userData.h10BandStations,32);
  const pos=geo.getAttribute('position');
  assert.equal(pos.count,192);
  const target=HELMET_MOUNT_PROFILES[shell].top-2.89;
  const layer=covered?ACH_MICH_COVER_OFFSET:0;
  const side=p.side+layer+.075;
  const front=p.front-layer-.075,rear=p.rear+layer+.075;
  let frontFaces=0,backFaces=0,sideFaces=0;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   assert.ok(close(y,target-.35)||close(y,target+.35),
    'band rail must not slope diagonally into cover');
   assert.ok(close(Math.abs(x),side)||close(z,front)||close(z,rear),
    'band vertex must stay on the four square perimeter walls');
   if(close(z,front))frontFaces++;
   if(close(z,rear))backFaces++;
   if(close(Math.abs(x),side))sideFaces++;
  }
  assert.ok(frontFaces>0&&backFaces>0&&sideFaces>0);
 }
});

test('H7.1 textile stays beyond hard side crown and has joined side corners',()=>{
 assert.ok(ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE>=.20);
 for(const shell of ACH_MICH_SHELLS){
  const cover=createAchMichDrapedGeometry(shell);
  const roof=headwearCuboidVolumes(shell)[0],p=achMichProfile(shell);
  const roofTop=roof.y+roof.height/2;
  const startBevel=roofTop-ACH_MICH_BEVEL_HEIGHT;
  const clothTop=roofTop+ACH_MICH_COVER_OFFSET;
  const shoulder=shell==='ach'?6.53:shell==='mich-2001'?6.77:6.79;
  const clothTopX=roof.width/2-ACH_MICH_UPPER_INSET+
   ACH_MICH_COVER_OFFSET+ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE;
  const clothShoulderX=p.side+ACH_MICH_COVER_OFFSET;
  const fabricAtBevel=clothShoulderX+(clothTopX-clothShoulderX)*
   (startBevel-shoulder)/(clothTop-shoulder);
  assert.ok(fabricAtBevel>roof.width/2+.035,
   shell+': shell flank must remain inside the angled textile');
  const pos=cover.getAttribute('position');
  for(const sign of [-1,1]){
   for(const rear of [false,true]){
    const x=sign*clothShoulderX;
    const z=rear?p.rear+ACH_MICH_COVER_OFFSET:
     p.front-ACH_MICH_COVER_OFFSET;
    for(const y of [shoulder,
     (rear?p.nape:p.brow)+ACH_MICH_BINDING_HEIGHT+.035]){
     let shared=0;
     for(let i=0;i<pos.count;i++)
      if(close(pos.getX(i),x)&&close(pos.getY(i),y)&&
       close(pos.getZ(i),z))shared++;
     assert.ok(shared>=2,
      shell+': front/rear side shoulder and hem must share corners');
    }
   }
  }
  assert.equal(cover.userData.h71JoinedCoverCorners,true);
 }
});
