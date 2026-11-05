/** Eyewear R10 acceptance: tiny pilot center-spacing correction only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';

const material=new THREE.MeshStandardMaterial({color:0x2d3130});
const glass=new THREE.MeshStandardMaterial({color:0x899792,transparent:true,opacity:.35,side:THREE.DoubleSide});
const root=createD2Glasses('glasses-aviator',material,glass);
const meshes=[];
root.traverse(o=>{if(o.isMesh)meshes.push(o)});
const pts=o=>o.geometry.parameters.shapes.getPoints();
const outer=meshes.filter(m=>m.name.includes('pilot-lens-collar-housing'));
const lenses=meshes.filter(m=>m.name.includes('pilot-full-teardrop-lens'));
const bridges=meshes.filter(m=>m.name.includes('pilot-')&&m.name.includes('-bridge'));
const temples=meshes.filter(m=>m.userData.d2TempleFit);
const left=outer.find(m=>pts(m).every(p=>p.x<0));
const right=outer.find(m=>pts(m).every(p=>p.x>0));
const atY=(poly,y)=>{
 const xs=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  if(((a.y<=y&&b.y>=y)||(a.y>=y&&b.y<=y))&&Math.abs(b.y-a.y)>1e-8)
   xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
 }
 return xs;
};

test('R10-A pilot lenses move in 0.13 per side without resizing or overlapping',()=>{
 assert.ok(left&&right,'both pilot eye outlines remain on separate sides');
 assert.equal(outer.length,2);
 assert.equal(lenses.length,2);
 const l=pts(left),r=pts(right);
 const foot=poly=>poly.filter(p=>Math.abs(p.y-2.39)<.02);
 const center=poly=>foot(poly).reduce((s,p)=>s+p.x,0)/foot(poly).length;
 assert.ok(Math.abs(center(l)+2.67)<.025,'left lens shelf centers at R10 1.95 offset');
 assert.ok(Math.abs(center(r)-2.67)<.025,'right lens shelf centers at R10 1.95 offset');
 assert.ok(Math.abs(center(l)+center(r))<.001,'symmetric inward movement');
 assert.ok(Math.abs(Math.max(...l.map(p=>p.y))-5.12)<.001);
 const uniqueCount=poly=>new Set(poly.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size;
 assert.equal(uniqueCount(l),15,'keep approved bold R9 outer silhouette');
 assert.equal(uniqueCount(r),15);
 const innerGap=Math.min(...r.map(p=>p.x))-Math.max(...l.map(p=>p.x));
 assert.ok(innerGap>.90&&innerGap<1.05,'small, readable nose gap: neither separated nor touching');
});

test('R10-B dual bridges and side temples still join the shifted lenses',()=>{
 assert.equal(bridges.length,2);
 assert.equal(temples.length,2);
 assert.equal(meshes.length,8,'no new detail pieces');
 for(const [part,y] of [['pilot-upper-bridge-housing',4.73],['pilot-lower-bridge-housing',4.04]]){
  const bridge=bridges.find(m=>m.name.includes(part));
  assert.ok(bridge);
  const a=atY(pts(bridge),y),b=atY(pts(left),y),d=atY(pts(right),y);
  assert.ok(a.length&&b.length&&d.length);
  assert.ok(Math.min(...a)<Math.max(...b)-.10,'left bridge overlap');
  assert.ok(Math.max(...a)>Math.min(...d)+.10,'right bridge overlap');
  const bbox=new THREE.Box3().setFromObject(bridge);
  assert.ok(bbox.intersectsBox(new THREE.Box3().setFromObject(left)));
  assert.ok(bbox.intersectsBox(new THREE.Box3().setFromObject(right)));
 }
 for(const temple of temples){
  const {frontX,frontWidth}=temple.userData.d2TempleFit;
  const side=temple.userData.d2TempleFit.side;
  const profile=side<0?pts(left):pts(right);
  const edge=Math.max(...profile.map(p=>Math.abs(p.x)));
  assert.ok(Math.abs(edge-frontX)<frontWidth*.75,'original temple root still nests inside the frame edge');
 }
});
