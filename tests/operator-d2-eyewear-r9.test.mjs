/** R9 targeted silhouette regression: rounded, recognizable pilot aviators. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';

const frame=new THREE.MeshStandardMaterial({color:0x25292b});
const lens=new THREE.MeshStandardMaterial({color:0x7c877b,transparent:true,opacity:.4,side:THREE.DoubleSide});
const getModel=()=>createD2Glasses('glasses-aviator',frame,lens);
const meshes=root=>{const a=[];root.traverse(o=>{if(o.isMesh)a.push(o);});return a;};
const contour=m=>m.geometry.parameters.shapes.getPoints();
const cutXs=(points,y)=>{
 const x=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if(((a.y<=y&&b.y>=y)||(b.y<=y&&a.y>=y))&&Math.abs(b.y-a.y)>1e-8)
   x.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
 }
 return x;
};
function turnDegrees(points,i){
 const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];
 const ax=b.x-a.x,ay=b.y-a.y,bx=c.x-b.x,by=c.y-b.y;
 return Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by)*180/Math.PI);
}

test('R9 rounded lower cheek has no abrupt outer-corner kink and retains broad foot',()=>{
 const model=getModel();
 const collars=meshes(model).filter(m=>m.name.includes('pilot-lens-collar-housing'));
 assert.equal(collars.length,2);
 const left=collars.find(m=>Math.max(...contour(m).map(p=>p.x))<0);
 assert.ok(left,'left lens contour');
 const points=contour(left);
 assert.equal(new Set(points.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3))).size,15,
  'hand-authored 15-facet low-poly silhouette');
 const bottom=Math.min(...points.map(p=>p.y));
 assert.ok(Math.abs(bottom-2.39)<.015,'retains approved aviator height');
 const shelf=points.filter(p=>Math.abs(p.y-bottom)<.02);
 assert.equal(shelf.length,2,'single simple broad lower shelf');
 const shelfXs=shelf.map(p=>p.x);
 assert.ok(Math.max(...shelfXs)-Math.min(...shelfXs)>1.10,'full rounded underside');
 const foot=(shelfXs[0]+shelfXs[1])/2;
 assert.ok(foot< -2.75&&foot> -3.02,'full lower lens without extreme outward splay');
 const cheek=points.map((p,i)=>({p,i})).filter(({p})=>p.x< -3.2&&p.y<=3.10);
 assert.ok(cheek.length>=3,'several deliberate broad cheek facets');
 for(const {i} of cheek)
  assert.ok(turnDegrees(points,i)<42,'outer lower cheek should not form a sharp hook');
 assert.ok(Math.max(...cutXs(points,3.27))> -1.16,
  'lower inner lens stays full toward the nose instead of forming Spider-Man fangs');
});

test('R9 inner apertures remain nested and pilot parts remain paired and connected',()=>{
 const model=getModel(),ms=meshes(model);
 const collars=ms.filter(m=>m.name.includes('pilot-lens-collar-housing'));
 const lenses=ms.filter(m=>m.name.includes('pilot-full-teardrop-lens'));
 assert.equal(collars.length,2);
 assert.equal(lenses.length,2);
 assert.equal(ms.filter(m=>m.name.includes('pilot-')&&m.name.includes('-bridge')).length,2);
 assert.equal(ms.filter(m=>m.userData.d2TempleFit).length,2);
 assert.equal(ms.length,8,'do not add unnecessary geometry');
 const left=collars.find(m=>Math.max(...contour(m).map(p=>p.x))<0);
 const right=collars.find(m=>Math.min(...contour(m).map(p=>p.x))>0);
 assert.ok(left&&right);
 for(const m of collars){
  assert.equal(m.geometry.parameters.shapes.holes.length,1);
  assert.equal(new Set(contour(m).map(p=>p.x.toFixed(3)+','+p.y.toFixed(3))).size,15);
  const hole=m.geometry.parameters.shapes.holes[0].getPoints();
  assert.equal(new Set(hole.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3))).size,15,
   'one matched aperture profile instead of overlapping fragments');
 }
 for(const [part,y] of [['pilot-upper-bridge-housing',4.73],['pilot-lower-bridge-housing',4.04]]){
  const bridge=ms.find(m=>m.name.includes(part));
  const span=cutXs(contour(bridge),y),lx=cutXs(contour(left),y),rx=cutXs(contour(right),y);
  assert.ok(span.length&&lx.length&&rx.length,'bridge and collars cross the same section');
  assert.ok(Math.min(...span)<Math.max(...lx)-.10,'bridge joins left collar');
  assert.ok(Math.max(...span)>Math.min(...rx)+.10,'bridge joins right collar');
 }
 const leftFoot=contour(left).filter(p=>Math.abs(p.y-2.39)<.02);
 const rightFoot=contour(right).filter(p=>Math.abs(p.y-2.39)<.02);
 const midpoint=pts=>pts.reduce((sum,p)=>sum+p.x,0)/pts.length;
 assert.ok(Math.abs(midpoint(leftFoot)+midpoint(rightFoot))<.04,'paired silhouettes mirror exactly');
});
