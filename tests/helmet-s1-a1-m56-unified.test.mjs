import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createM56UnifiedShellGeometry,M56_PERIMETER,
 M56_SHELL_RINGS,M56_SHELL_FIT,m56SurfacePoint}
 from '../src/operator-m56-unified-shell.ts';
import {HEAD_SILHOUETTE_METRICS,createHeadwearSilhouette,
 headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {createM56Extras,updateM56Extras}
 from '../src/operator-ddr-m56-visuals.ts';
import {headwearColorChoices} from '../src/operator-headwear-colors.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';
const near=(actual,expected,label,tol=.002)=>
 assert.ok(Math.abs(actual-expected)<tol,
  label+' expected '+expected+' received '+actual);

test('S1-A1D one 112-triangle helmet replaces the smoothed 192-triangle model',()=>{
 const root=createHeadwearSilhouette('ddr-m56',new THREE.MeshStandardMaterial());
 assert.equal(root.children.length,1,'one rendered shell');
 assert.equal(root.userData.stage,'S1-A1');
 assert.equal(root.userData.primitive,'m56-one-piece-stamped-flare');
 const mesh=root.children[0],g=mesh.geometry;
 assert.equal(mesh.children.length,0);
 assert.equal(mesh.castShadow,true);
 assert.equal(mesh.receiveShadow,false);
 for(const marker of ['m56UnifiedStampedShell','m56ContinuousFlare',
  'm56VisibleRecessedInterior','m56ConsistentQuadNormals',
  'm56SkirtSwept','m56EarToNapeContour','m56SingleLowerAngularBreak'])
  assert.equal(g.userData[marker],true,marker);
 assert.equal(g.userData.m56ProfileRevision,'S1-A1D');
 assert.equal(g.userData.m56TriangleBudget,112);
 assert.equal(g.userData.greedyCuboidUnion,undefined);
 assert.equal(M56_PERIMETER.length,8);
 assert.equal(M56_SHELL_RINGS.length,7);
 assert.equal(g.userData.m56PerimeterFacets,8);
 assert.equal(g.userData.m56ProfileStations.length,7);
 assert.equal(g.index.count/3,112,'indexed roof, broad shell and underside');
 assert.equal(g.userData.exteriorQuads,6*8,'no extra ring or trim');
 assert.equal(g.userData.materialRegions,true);
 assert.equal(g.userData.pixelWorldSize,1);
 assert.equal(g.userData.materialAtlasPixels,64);
 assert.equal(g.userData.camoAtlasPixels,128);
 for(const name of ['uv','uv1','color','normal'])
  assert.equal(g.getAttribute(name).count,g.getAttribute('position').count,name);
 assert.equal(headwearCuboidVolumes('ddr-m56').length,13,
  'old cuboids remain non-rendered compatibility metadata only');
 assert.ok(root.userData.sourceCuboids);
});

test('S1-A1D actual M56 extents, brow/ear/nape landmarks and wardrobe fit agree',()=>{
 const g=createM56UnifiedShellGeometry(),b=g.boundingBox;
 assert.ok(b);
 near(b.max.y,8.775,'top');
 near(b.min.x,-6.87,'left');
 near(b.max.x,6.87,'right');
 near(b.min.z,-6.80,'front');
 near(b.max.z,8.10,'rear');
 near(b.min.y,3.35,'rear nape');
 near(m56SurfacePoint(3,0)[1],5.30,'front lip');
 near(m56SurfacePoint(3,2)[1],4.9846,'front side');
 near(m56SurfacePoint(3,3)[1],4.126,'ear corner');
 near(m56SurfacePoint(3,4)[1],3.35,'rear');
 for(const [key,value] of [
  ['top',M56_SHELL_FIT.top],['frontExtent',M56_SHELL_FIT.frontExtent],
  ['rearExtent',M56_SHELL_FIT.rearExtent],
  ['foreheadEdge',M56_SHELL_FIT.frontHem],['earEdge',M56_SHELL_FIT.sideHem]]){
  near(HEAD_SILHOUETTE_METRICS['ddr-m56'][key],value,'fit '+key);
 }
 assert.ok(M56_SHELL_RINGS[3].rear >
  HEAD_SILHOUETTE_METRICS['m1-steel'].rearExtent+1.4,
  'DDR nape much longer than M1');
});

test('S1-A1D one strong bottom angle instead of layered smooth side bands',()=>{
 const [crown,shoulder,bell,hem,returnRing]=M56_SHELL_RINGS;
 near(crown.side,3.08,'approved crown half-width');
 near(crown.y,8.775,'approved crown height');
 near(shoulder.y,7.87,'single upper shoulder');
 assert.ok(shoulder.side>5.4&&bell.side>shoulder.side,
  'broad upper dome encloses skull');
 const upperSlope=(bell.side-shoulder.side)/(shoulder.y-bell.y);
 const skirtSlope=(hem.side-bell.side)/(bell.y-hem.y);
 assert.ok(skirtSlope>upperSlope*4,
  'the stamped apron breaks visibly outward at the lower bell');
 assert.ok(skirtSlope>.65,'lower slope reads at thumbnail scale');
 assert.ok(hem.rear-bell.rear>1.3,'rear skirt extends substantially');
 assert.ok(hem.front-bell.front>.8,'front visor projects');
 assert.equal(M56_SHELL_RINGS.filter(r=>r.name.includes('skirt')).length,0,
  'no subordinate skirt terraces');
 assert.ok(returnRing.side<hem.side,'lip returns inward, no extra brim');
});

test('S1-A1D eight-point front-ear-nape hem has deliberately angular rake',()=>{
 const hem=Array.from({length:8},(_,i)=>m56SurfacePoint(3,i));
 assert.ok(hem[0][1]>hem[2][1]+.30,'raised visor to front side');
 assert.ok(hem[2][1]>hem[3][1]+.75,'front side to ear is distinct');
 assert.ok(hem[3][1]>hem[4][1]+.70,'behind-ear to nape slopes down');
 assert.ok(hem[0][1]-hem[4][1]>1.8,'high forehead/deep nape');
 // On either side the 3D contour is exactly reflected.
 for(const [left,right] of [[0,1],[2,7],[3,6],[4,5]])
  for(const [a,b,label]of [[0,0,'X'],[1,1,'Y'],[2,2,'Z']]){
   const sign=label==='X'?-1:1;
   near(hem[left][a],hem[right][b]*sign,'mirrored '+label);
  }
 // Recessed steel edge is visibly thin and follows the same profile.
 for(let i=0;i<8;i++){
  const edge=m56SurfacePoint(3,i),returnPoint=m56SurfacePoint(4,i);
  assert.ok(returnPoint[1]-edge[1]>.04&&returnPoint[1]-edge[1]<.18,
   'thin rising inturned return at '+i);
  assert.ok(Math.abs(edge[0]-returnPoint[0])<.45,
   'no extra-projecting lower trim at '+i);
 }
 near(hem[3][1],M56_SHELL_FIT.sideHem,'side ear hem');
 near(hem[0][1],M56_SHELL_FIT.frontHem,'brow hem');
 near(hem[4][1],M56_SHELL_FIT.rearHem,'rear hem');
});

test('S1-A1D consistent broad quad normals, winding, UVs and no degenerates',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal'),uv=g.getAttribute('uv');
 const offset=M56_PERIMETER.length*3,quads=(M56_SHELL_RINGS.length-1)*8;
 assert.equal(n.count,p.count);
 for(let i=0;i<uv.count;i++)
  assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
 for(let q=0;q<quads;q++){
  const at=offset+q*4;
  const normal=new THREE.Vector3(n.getX(at),n.getY(at),n.getZ(at));
  near(normal.length(),1,'normal length '+q,.0001);
  for(let k=1;k<4;k++)for(const axis of ['X','Y','Z'])
   near(n['get'+axis](at+k),n['get'+axis](at),
    'authored broad-plane normal '+q+' '+axis,.0001);
  const v=i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
  const [a,b,c,d]=[v(at),v(at+1),v(at+2),v(at+3)];
  for(const [u,vv,w]of [[a,b,c],[a,c,d]]){
   const cross=new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(vv,u),
    new THREE.Vector3().subVectors(w,u));
   assert.ok(cross.length()>.00001,'non-degenerate triangle '+q);
   assert.ok(cross.dot(normal)>0,'consistent outward winding '+q);
  }
 }
});

test('S1-A1D roof and underside are lit and hollow, not a head-covering bottom',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');let roof=0,inside=0,filled=0;
 for(let i=0;i<p.count;i++){
  const [x,y,z]=[p.getX(i),p.getY(i),p.getZ(i)];
  assert.ok([x,y,z,n.getY(i)].every(Number.isFinite));
  if(y>8.774&&n.getY(i)>.9)roof++;
  if(y>7.74&&y<7.76&&n.getY(i)<-.9)inside++;
  if(Math.abs(x)<1&&Math.abs(z)<1&&y<6)filled++;
 }
 assert.ok(roof>=8,'top face');
 assert.ok(inside>=8,'recessed underside visible from below');
 assert.equal(filled,0,'no face-covering bottom closure');
});

test('S1-A1D physical square-head diagonal clearance survives extreme slope',()=>{
 const mesh=new THREE.Mesh(createM56UnifiedShellGeometry(),
  new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 // The intentionally raised brow Y5.30 exposes lower front head at
 // Y5.1; that opening is part of the requested silhouette, not a leak.
 // Raycast every skull corner above the front rim and the deep rear at
 // Y5.1 so genuine split steel/corner clipping still fails the gate.
 for(const y of [7,6.8,6.5,6,5.6,5.4,5.1]){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   if(y<5.30&&sz<0)continue;
   const ray=new THREE.Raycaster(new THREE.Vector3(0,y,0),
    new THREE.Vector3(sx,0,sz).normalize(),0,25);
   const hits=ray.intersectObject(mesh,false);
   assert.ok(hits.length,'shell continuous at Y'+y+' '+sx+','+sz);
   assert.ok(hits[0].distance>Math.sqrt(32)+.10,
    'no skull poke-through at Y'+y+' '+sx+','+sz);
  }
 }
});

test('S1-A1D optional M56 fasteners and net remain sparse and opt-in',()=>{
 const parent=new THREE.Group(),dark=new THREE.MeshStandardMaterial();
 const extras=createM56Extras(parent,dark);
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 updateM56Extras(extras,{m56Details:'early-rivets',m56Net:'coarse'});
 assert.equal(extras.rivets.visible,true);
 assert.equal(extras.net.visible,true);
 assert.ok(extras.rivets.children.length<=3,'merged historical three rivets');
 assert.ok(extras.net.children.length<=2,'merged period net');
 updateM56Extras(extras,{m56Details:'late-smooth',m56Net:'none'});
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 assert.ok(headwearColorChoices('ddr-m56').length>0);
 assert.equal(headwearCamoChoices('ddr-m56').length,0);
});

test('S1-A1D keep M56 authored normals without changing approved M1/SSh shading',()=>{
 const m56Mat=new THREE.MeshStandardMaterial({flatShading:true});
 createHeadwearSilhouette('ddr-m56',m56Mat);
 assert.equal(m56Mat.flatShading,false,'re-use broad quad normals');
 for(const id of ['m1-steel','soviet-steel']){
  const material=new THREE.MeshStandardMaterial({flatShading:true});
  createHeadwearSilhouette(id,material);
  assert.equal(material.flatShading,true,'unrelated '+id+' unchanged');
 }
});
