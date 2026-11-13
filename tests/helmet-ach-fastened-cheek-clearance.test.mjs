import test from 'node:test';
import assert from 'node:assert/strict';
import {achMichRetentionPaths,createAchMichRetentionGeometry}
 from '../src/operator-ach-mich-details.ts';
import {createPasgtRetentionGeometry} from '../src/operator-pasgt-field-dress.ts';
import {CUBE_HEAD_ANATOMY} from '../src/operator-head-anatomy.ts';

// Check *triangles*, not only centerline waypoints. Ribbon width used to
// enter the cube despite endpoints appearing outside it from one angle.
function penetratesHead(geometry){
 const a=geometry.getAttribute('position');
 const p=index=>[a.getX(index),a.getY(index),a.getZ(index)];
 for(let i=0;i<a.count;i+=3){
  const v=[p(i),p(i+1),p(i+2)];
  for(let j=0;j<=12;j++)for(let k=0;k<=12-j;k++){
   const u=j/12,w=k/12;
   const q=v[0].map((n,c)=>n+u*(v[1][c]-n)+w*(v[2][c]-n));
   const margin=.035;
   if(Math.abs(q[0])<CUBE_HEAD_ANATOMY.rightX+margin&&
      q[1]>CUBE_HEAD_ANATOMY.skullBottom-margin&&
      q[1]<CUBE_HEAD_ANATOMY.skullTop+margin&&
      q[2]>CUBE_HEAD_ANATOMY.frontZ-margin&&
      q[2]<CUBE_HEAD_ANATOMY.rearZ+margin)return true;
  }
 }
 return false;
}
test('PASGT reference and ACH/MICH fastened webbing clear cube head',()=>{
 assert.equal(penetratesHead(createPasgtRetentionGeometry()),false);
 for(const shell of ['ach','mich-2001','mich-2002']){
  const paths=achMichRetentionPaths(shell);
  assert.equal(paths.length,6,'retain four shell suspension legs');
  for(const side of [0,3]){
   assert.deepEqual(paths[side].at(-1),paths[side+1].at(-1));
   assert.deepEqual(paths[side].at(-1),paths[side+2][0]);
   assert.equal(paths[side+2].length,3,'exterior cheek drop before chin');
   const cheek=paths[side+2][1],chin=paths[side+2][2];
   const lateralGap=Math.abs(cheek[0])-CUBE_HEAD_ANATOMY.rightX;
   assert.ok(lateralGap>=.42&&lateralGap<=.49,
    shell+' cheek bends should be just outside both jaw sides');
   // Both cheek corners sit just forward of the box face.
   const cheekGap=CUBE_HEAD_ANATOMY.frontZ-cheek[2];
   assert.ok(cheekGap>=.33&&cheekGap<=.39,
    shell+' forward cheek turn must be close but not intersect head');
   // PASGT's chin cup sits near -4.34, ahead of the -4 face.
   // Reject both the former .65-unit hover and any face penetration.
   const chinGap=CUBE_HEAD_ANATOMY.frontZ-chin[2];
   assert.ok(chinGap>=.25&&chinGap<=.40,
    shell+' chin cup should rest close to the front face');
   assert.ok(chin[1]<CUBE_HEAD_ANATOMY.skullBottom);
  }
  const geometry=createAchMichRetentionGeometry(shell);
  const positions=geometry.getAttribute('position');
  const padStart=positions.count-6;
  for(let i=padStart;i<positions.count;i++)
   assert.ok(Math.abs(positions.getZ(i)+4.34)<1e-5,
    shell+' cup should follow the strap endpoints at PASGT face depth');
  assert.equal(positions.count,54);
  assert.equal(penetratesHead(geometry),false,shell+' fastened strap clips face');
  assert.ok(geometry.boundingBox.max.y>2,'shell anchors remain at upper rim');
  assert.ok(geometry.boundingBox.min.y<-1.5,'chin cup clears jaw bottom');
 }
});
