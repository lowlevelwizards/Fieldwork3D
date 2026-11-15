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

test('S1-A1E renders one 96-triangle M56 instead of the previous layered models',()=>{
 const root=createHeadwearSilhouette('ddr-m56',new THREE.MeshStandardMaterial());
 assert.equal(root.children.length,1);
 assert.equal(root.userData.stage,'S1-A1');
 assert.equal(root.userData.primitive,'m56-one-piece-stamped-flare');
 const mesh=root.children[0],g=mesh.geometry;
 assert.equal(mesh.children.length,0);
 assert.equal(mesh.castShadow,true);
 assert.equal(mesh.receiveShadow,false);
 for(const marker of ['m56UnifiedStampedShell','m56ContinuousFlare',
  'm56VisibleRecessedInterior','m56ConsistentQuadNormals',
  'm56SkirtSwept','m56EarToNapeContour','m56SingleLowerAngularBreak',
  'm56LocalEarRelief'])
  assert.equal(g.userData[marker],true,marker);
 assert.equal(g.userData.m56ProfileRevision,'S1-A1E');
 assert.equal(g.userData.m56TriangleBudget,96);
 assert.equal(M56_PERIMETER.length,8,'only eight coarse shell corners');
 assert.equal(M56_SHELL_RINGS.length,6,'one bell and one skirt, no extra exterior ring');
 assert.equal(g.userData.m56PerimeterFacets,8);
 assert.equal(g.userData.m56ProfileStations.length,6);
 assert.equal(g.index.count/3,96);
 assert.equal(g.userData.exteriorQuads,40);
 assert.equal(g.userData.greedyCuboidUnion,undefined);
 assert.equal(g.userData.materialRegions,true);
 assert.equal(g.userData.pixelWorldSize,1);
 assert.equal(g.userData.materialAtlasPixels,64);
 assert.equal(g.userData.camoAtlasPixels,128);
 for(const name of ['uv','uv1','color','normal'])
  assert.equal(g.getAttribute(name).count,g.getAttribute('position').count,name);
 assert.equal(headwearCuboidVolumes('ddr-m56').length,13,
  'legacy cuboids are metadata, not a second visible helmet');
 assert.ok(root.userData.sourceCuboids);
});

test('S1-A1E keeps historical envelope while explicitly shaping visor, ear and neck',()=>{
 const g=createM56UnifiedShellGeometry(),b=g.boundingBox;
 assert.ok(b);
 for(const [actual,expected,label] of [
  [b.max.y,8.775,'top'],[b.min.x,-6.87,'left'],[b.max.x,6.87,'right'],
  [b.min.z,-6.80,'front'],[b.max.z,8.10,'rear'],
  [b.min.y,3.53,'deep nape']])
  near(actual,expected,label);
 const [visor,temple,ear,rear]=[0,2,3,4].map(i=>m56SurfacePoint(2,i));
 near(visor[1],5.23,'raised visor');
 near(temple[1],4.564,'temple scallop');
 near(ear[1],4.995,'ear relief');
 near(rear[1],3.53,'rear apron');
 assert.ok(visor[1]-temple[1]>.60,'forward helmet has an actual shaped face edge');
 assert.ok(ear[1]-temple[1]>.40,'shallow ear relief rises above temple');
 assert.ok(ear[1]-rear[1]>1.4,'ear flows into substantially lower nape');
 assert.ok(visor[1]-rear[1]>1.65,'long rear sweep');
 assert.ok(M56_SHELL_RINGS[2].rear>
  HEAD_SILHOUETTE_METRICS['m1-steel'].rearExtent+1.4,
  'the DDR sweep stays distinct from M1');
 const fit=HEAD_SILHOUETTE_METRICS['ddr-m56'];
 for(const [field,expected] of [
  ['top',M56_SHELL_FIT.top],
  ['frontExtent',M56_SHELL_FIT.frontExtent],
  ['rearExtent',M56_SHELL_FIT.rearExtent],
  ['foreheadEdge',M56_SHELL_FIT.frontHem],
  ['earEdge',M56_SHELL_FIT.sideHem]])
  near(fit[field],expected,'wardrobe '+field);
});

test('S1-A1E only two exterior masses and a clear lower angular skirt',()=>{
 const [crown,bell,skirt,returned,inside]=M56_SHELL_RINGS;
 near(crown.y,8.775,'top remains stable');
 assert.ok(crown.side>4.7&&crown.side<5.0,
  'large simple crown not a tiny medieval point');
 assert.ok(bell.side>crown.side);
 const bellSlope=(bell.side-crown.side)/(crown.y-bell.y);
 const skirtSlope=(skirt.side-bell.side)/(bell.y-skirt.y);
 assert.ok(skirtSlope>bellSlope*2,'one intentional change of slope');
 assert.ok(skirt.rear-bell.rear>1.6,'strong protective rear flare');
 assert.ok(skirt.front-bell.front>.9,'clear front projection');
 assert.ok(returned.side<skirt.side,'lip folds inward not outward');
 assert.ok(inside.side<skirt.side,'hollow liner not a hidden second shell');
 assert.equal(M56_SHELL_RINGS.filter(r=>r.name.includes('upper-skirt')).length,0);
 // No coloring bands within the big exterior shell: even per-quad vertex tones.
 const g=createM56UnifiedShellGeometry(),colors=g.getAttribute('color');
 const first=M56_PERIMETER.length*3;
 for(let j=0;j<2;j++)for(let i=0;i<8;i++)
  near(colors.getX(first+(j*8+i)*4),.97,'same painted steel tone');
});

test('S1-A1E ear and skirt profile is symmetric and a thin continuous shell',()=>{
 const lower=Array.from({length:8},(_,i)=>m56SurfacePoint(2,i));
 for(const [a,b]of [[0,1],[2,7],[3,6],[4,5]]){
  near(lower[a][0],-lower[b][0],'left/right X');
  near(lower[a][1],lower[b][1],'left/right Y');
  near(lower[a][2],lower[b][2],'left/right Z');
 }
 for(let i=0;i<8;i++){
  const edge=lower[i],returned=m56SurfacePoint(3,i);
  assert.ok(returned[1]-edge[1]>.05&&returned[1]-edge[1]<.16,
   'steel return stays uniformly thin at '+i);
  assert.ok(Math.abs(returned[0]-edge[0])<.43,
   'return cannot make a secondary protruding rim at '+i);
 }
 // The upper ring has no ear cutout; the scallop is localized to the hem.
 const upper=M56_SHELL_RINGS[1];
 for(const i of [2,3,6,7])
  near(m56SurfacePoint(1,i)[1],upper.y,'upper bell is not scalloped');
});

test('S1-A1E quad normals, UV atlas and indexed winding remain healthy',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal'),uv=g.getAttribute('uv'),
  uv1=g.getAttribute('uv1');
 const offset=M56_PERIMETER.length*3,quads=5*8;
 assert.equal(n.count,p.count);
 for(let i=0;i<uv.count;i++)
  assert.ok([uv.getX(i),uv.getY(i),uv1.getX(i),uv1.getY(i)]
   .every(Number.isFinite),'finite UVs');
 for(let q=0;q<quads;q++){
  const at=offset+q*4;
  const normal=new THREE.Vector3(n.getX(at),n.getY(at),n.getZ(at));
  near(normal.length(),1,'unit normal '+q,.0001);
  for(let k=1;k<4;k++)for(const axis of ['X','Y','Z'])
   near(n['get'+axis](at+k),n['get'+axis](at),
    'flat quad normal '+q+' '+axis,.0001);
  const v=i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
  const [a,b,c,d]=[v(at),v(at+1),v(at+2),v(at+3)];
  for(const [u,vv,w] of [[a,b,c],[a,c,d]]){
   const cross=new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(vv,u),
    new THREE.Vector3().subVectors(w,u));
   assert.ok(cross.length()>.00001,'no zero-area face '+q);
   assert.ok(cross.dot(normal)>0,'no inverted triangle '+q);
  }
 }
});

test('S1-A1E retains hollow bottom with shaded upper crown and inner ceiling',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');let roof=0,inside=0,filled=0;
 for(let i=0;i<p.count;i++){
  const [x,y,z]=[p.getX(i),p.getY(i),p.getZ(i)];
  assert.ok([x,y,z,n.getY(i)].every(Number.isFinite));
  if(y>8.774&&n.getY(i)>.9)roof++;
  if(y>7.74&&y<7.76&&n.getY(i)<-.9)inside++;
  if(Math.abs(x)<1&&Math.abs(z)<1&&y<6)filled++;
 }
 assert.ok(roof>=8,'top plate is visible');
 assert.ok(inside>=8,'inside roof is visible');
 assert.equal(filled,0,'no solid face-blocking underside');
});

test('S1-A1E real raycast skull-corner clearance survives skirt simplification',()=>{
 const mesh=new THREE.Mesh(createM56UnifiedShellGeometry(),
  new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 // The intentionally raised face/ear rim exposes forehead and ears below
 // Y5.23; test upper head coverage without treating that opening as a leak.
 for(const y of [7,6.8,6.5,6.2,6,5.8,5.55]){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const ray=new THREE.Raycaster(new THREE.Vector3(0,y,0),
    new THREE.Vector3(sx,0,sz).normalize(),0,25);
   const hits=ray.intersectObject(mesh,false);
   assert.ok(hits.length,'stamped shell surrounds skull at '+y+' '+sx+','+sz);
   assert.ok(hits[0].distance>Math.sqrt(32)+.10,
    'skull corner must not pierce M56 at '+y+' '+sx+','+sz);
  }
 }
});

test('S1-A1E optional early rivets, smooth late shell and net remain safe',()=>{
 const parent=new THREE.Group(),dark=new THREE.MeshStandardMaterial();
 const extras=createM56Extras(parent,dark);
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 updateM56Extras(extras,{m56Details:'early-rivets',m56Net:'coarse'});
 assert.equal(extras.rivets.visible,true);
 assert.equal(extras.net.visible,true);
 assert.ok(extras.rivets.children.length<=3,'historical three cached rivets');
 assert.ok(extras.net.children.length<=2,'net batches consolidated');
 updateM56Extras(extras,{m56Details:'late-smooth',m56Net:'none'});
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 assert.ok(headwearColorChoices('ddr-m56').length>0);
 assert.equal(headwearCamoChoices('ddr-m56').length,0);
});

test('S1-A1E retains approved helmet-family shading outside M56',()=>{
 const m56Mat=new THREE.MeshStandardMaterial({flatShading:true});
 createHeadwearSilhouette('ddr-m56',m56Mat);
 assert.equal(m56Mat.flatShading,false,'use authored quad normals');
 for(const id of ['m1-steel','soviet-steel']){
  const material=new THREE.MeshStandardMaterial({flatShading:true});
  createHeadwearSilhouette(id,material);
  assert.equal(material.flatShading,true,'untouched '+id+' shading');
 }
});
