/** Cover geometry regression: actual shell/cloth triangle intersections.
 * H30's bounding-box-only checks could pass when a draped polygon crossed
 * the shell between authored contour stations. This samples the triangles
 * actually uploaded to WebGL, not the nominal widths at the vertices.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,createHeadwearSilhouette}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
const EPS=1e-4;
const V=()=>new THREE.Vector3();
function triangles(geometry){
 const a=geometry.getAttribute('position'),idx=geometry.getIndex();
 const v=i=>V().fromBufferAttribute(a,idx?idx.getX(i):i);
 const out=[];
 for(let k=0;k<(idx?idx.count:a.count);k+=3){
  const points=[v(k),v(k+1),v(k+2)];
  const box=new THREE.Box3().setFromPoints(points);
  out.push({points,box,id:k/3});
 }
 return out;
}
function segmentHitsTriangle(a,b,tri){
 const direction=b.clone().sub(a),length=direction.length();
 if(length<EPS)return false;
 const ray=new THREE.Ray(a,direction.divideScalar(length));
 const hit=ray.intersectTriangle(...tri,false,V());
 return hit!==null&&hit.distanceTo(a)>EPS&&hit.distanceTo(a)<length-EPS;
}
function intersects(a,b){
 if(!a.box.intersectsBox(b.box))return false;
 const ap=a.points,bp=b.points;
 for(let i=0;i<3;i++)
  if(segmentHitsTriangle(ap[i],ap[(i+1)%3],bp))return true;
 for(let i=0;i<3;i++)
  if(segmentHitsTriangle(bp[i],bp[(i+1)%3],ap))return true;
 return false;
}
test('H31C: actual draped cover surface never penetrates exterior ACH/MICH shell',()=>{
 for(const cut of ACH_MICH_SHELLS){
  const shell=createHeadwearSilhouette(cut,new THREE.MeshStandardMaterial())
   .children[0].geometry;
  const cover=createAchMichDrapedGeometry(cut);
  const shellTris=triangles(shell),coverTris=triangles(cover),hits=[];
  for(const c of coverTris)for(const s of shellTris)
   if(intersects(c,s)){
    hits.push({fabric:c.id,shell:s.id,
     fabricCenter:c.points.map(p=>p.toArray()).reduce(
      (a,p)=>a.map((v,i)=>v+p[i]/3),[0,0,0]).map(n=>+n.toFixed(3))});
    if(hits.length>=8)break;
   }
  assert.deepEqual(hits,[],cut+' cover triangles cross the actual 3D shell');
 }
});
