import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {HEAD_SILHOUETTE_METRICS as M,
 createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';

const ids=['patrol-cap','boonie','beanie','pasgt','soviet-steel','ach','high-cut'];
const bounds=v=>({
 minX:Math.min(...v.map(p=>p.x-p.width/2)),
 maxX:Math.max(...v.map(p=>p.x+p.width/2)),
 minY:Math.min(...v.map(p=>p.y-p.height/2)),
 maxY:Math.max(...v.map(p=>p.y+p.height/2)),
 minZ:Math.min(...v.map(p=>p.z-p.depth/2)),
 maxZ:Math.max(...v.map(p=>p.z+p.depth/2))
});
const bottomAt=(v,x,z)=>Math.min(...v.filter(p=>
 Math.abs(x-p.x)<=p.width/2+1e-6&&Math.abs(z-p.z)<=p.depth/2+1e-6)
 .map(p=>p.y-p.height/2));
const overlap=(a,b,axis)=>{
 const pos=axis,dim=axis==='x'?'width':axis==='y'?'height':'depth';
 return Math.min(a[pos]+a[dim]/2,b[pos]+b[dim]/2)-
  Math.max(a[pos]-a[dim]/2,b[pos]-b[dim]/2);
};

test('all seven headgear families are unified, orthogonal exteriors',()=>{
 for(const id of ids){
  const v=headwearCuboidVolumes(id);
  const group=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(group.children.length,1,id);
  assert.equal(group.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  const mesh=group.children[0],geometry=mesh.geometry;
  assert.equal(geometry.userData.greedyCuboidUnion,true,id);
  assert.equal(geometry.userData.cuboids.length,v.length,id);
  assert.equal(mesh.receiveShadow,false,id);
  assert.ok(geometry.index.count>=36,id);
  assert.ok(geometry.userData.exteriorQuads<150,id);
  const b=bounds(v),m=M[id];
  assert.ok(Math.abs(b.maxY-m.top)<1e-5,id+' crown metrics');
  assert.ok(Math.abs(b.minZ-m.frontExtent)<1e-5,id+' front metrics');
  assert.ok(Math.abs(b.maxZ-m.rearExtent)<1e-5,id+' rear metrics');
  assert.ok(m.top-A.skullTop<2.4,id+' should hug head, not float');
  assert.ok(v.every(p=>p.height>.60&&p.width>.90&&p.depth>1.2),
   id+' should avoid tiny, unjustified silhouette cubes');
  for(let i=1;i<v.length;i++)
   assert.ok(v.slice(0,i).some(other=>
    overlap(other,v[i],'x')>.1&&overlap(other,v[i],'y')>.1&&
    overlap(other,v[i],'z')>.1),
    id+' each cuboid must overlap an earlier shell mass');
 }
});

test('stage 1F patrol is a three-mass cap with a meaningful bill',()=>{
 const v=headwearCuboidVolumes('patrol-cap'),m=M['patrol-cap'];
 assert.equal(v.length,3);
 const brim=v.find(p=>p.name==='patrol-bill');
 assert.ok(brim);
 assert.ok(brim.height>=.7&&brim.depth>=3.5);
 assert.ok(m.frontExtent< -7.5&&m.top<9);
 assert.ok(m.earEdge>A.hairline,'not helmet-like ear coverage');
});

test('stage 1G boonie has large all-around brim and one broad fabric drop',()=>{
 const v=headwearCuboidVolumes('boonie');
 assert.equal(v.length,4);
 const crown=v.find(p=>p.name==='boonie-low-crown');
 const brim=v.find(p=>p.name==='boonie-wide-brim');
 assert.ok(crown&&brim);
 assert.ok(brim.width-crown.width>4);
 assert.ok(brim.depth-crown.depth>4);
 assert.ok(bottomAt(v,0,-6)<bottomAt(v,0,6));
});

test('stage 1H fitted watch cap has just a crown and a folded cuff',()=>{
 const v=headwearCuboidVolumes('beanie');
 assert.equal(v.length,2);
 const crown=v.find(p=>p.name==='beanie-fitted-crown');
 const cuff=v.find(p=>p.name==='beanie-folded-cuff');
 assert.ok(crown&&cuff);
 assert.ok(cuff.width>crown.width+.5);
 assert.ok(cuff.height>=1.2);
 assert.ok(bounds(v).maxX<5&&bounds(v).minX> -5);
});

test('stage 1I PASGT has deeper wrap than ACH and is not its scaled clone',()=>{
 const pas=headwearCuboidVolumes('pasgt'),ach=headwearCuboidVolumes('ach');
 assert.equal(pas.length,7);
 assert.ok(bounds(pas).maxX>bounds(ach).maxX);
 assert.ok(bounds(pas).maxY>bounds(ach).maxY);
 assert.ok(bottomAt(pas,4.4,0)<bottomAt(ach,4.4,0));
 assert.ok(bottomAt(pas,0,5)<bottomAt(ach,0,5));
});

test('stage 1J steel pot has one projecting structural rim and dome step',()=>{
 const v=headwearCuboidVolumes('soviet-steel');
 assert.equal(v.length,3);
 const body=v.find(p=>p.name==='steel-pot-body');
 const dome=v.find(p=>p.name==='steel-pot-upper-crown');
 const brim=v.find(p=>p.name==='steel-pot-strong-rim');
 assert.ok(body&&dome&&brim);
 assert.ok(brim.width-body.width>1.4&&brim.depth-body.depth>1.4);
 assert.ok(body.width-dome.width>1.4);
 assert.ok(brim.height>=1,'not a thin decorative lip');
 assert.ok(M['soviet-steel'].earEdge>A.brow);
});

test('wardrobe renders all planned types from canonical head coordinates',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',
  import.meta.url),'utf8');
 for(const id of ['boonie','beanie','pasgt','soviet-steel'])
  assert.ok(source.includes("g(headwear,id,true).add(createHeadwearSilhouette(id,silhouetteMaterial))"),
   'all new families use the canonical unified headwear loop');
 for(const legacy of ["helmet('pasgt'","const beanie=g(headwear","const boonie=g(headwear","const steel=g(headwear"])
  assert.ok(!source.includes(legacy),'no legacy blocky placeholder: '+legacy);
});
