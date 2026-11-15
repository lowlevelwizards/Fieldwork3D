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

test('S1-A1 one M56 stamped steel surface replaces every visible cuboid tier',()=>{
 const root=createHeadwearSilhouette('ddr-m56',new THREE.MeshStandardMaterial());
 assert.equal(root.children.length,1);
 assert.equal(root.userData.stage,'S1-A1');
 assert.equal(root.userData.primitive,'m56-one-piece-stamped-flare');
 const mesh=root.children[0],g=mesh.geometry;
 assert.equal(mesh.children.length,0);
 assert.equal(mesh.castShadow,true);
 assert.equal(mesh.receiveShadow,false);
 assert.equal(g.userData.m56UnifiedStampedShell,true);
 assert.equal(g.userData.m56ContinuousFlare,true);
 assert.equal(g.userData.m56VisibleRecessedInterior,true);
 assert.equal(g.userData.m56ProfileRevision,'S1-A1B');
 assert.equal(g.userData.m56ConsistentQuadNormals,true);
 assert.equal(g.userData.m56SkirtSwept,true);
 assert.equal(g.userData.greedyCuboidUnion,undefined);
 assert.equal(g.userData.m56PerimeterFacets,8);
 assert.equal(M56_SHELL_RINGS.length,8);
 assert.equal(g.userData.m56ProfileStations.length,8);
 assert.ok(g.index.count/3<=140,'no decorative tiers/hidden meshes');
 assert.equal(g.userData.materialRegions,true);
 assert.equal(g.userData.pixelWorldSize,1);
 assert.equal(g.userData.materialAtlasPixels,64);
 assert.equal(g.userData.camoAtlasPixels,128);
 for(const n of ['uv','uv1','color','normal'])
  assert.equal(g.getAttribute(n).count,g.getAttribute('position').count,n);
 // Old envelopes are compatibility FIT DATA ONLY, never a second shell.
 assert.equal(headwearCuboidVolumes('ddr-m56').length,13);
 assert.ok(root.userData.sourceCuboids);
});

test('S1-A1 iconic DDR wide rear flare without additional concentric tiers',()=>{
 const g=createM56UnifiedShellGeometry(),b=g.boundingBox;
 assert.ok(b);
 near(b.max.y,8.775,'crown');
 near(b.min.x,-6.87,'left flare');
 near(b.max.x,6.87,'right flare');
 near(b.min.z,-6.80,'front');
 near(b.max.z,8.10,'long rear');
 near(b.min.y,3.97,'rear nape');
 near(m56SurfacePoint(4,0)[1],4.74,'raised front');
 near(m56SurfacePoint(4,2)[1],4.6532,'front quarter');
 near(m56SurfacePoint(4,4)[1],3.97,'rear nape');
 near(m56SurfacePoint(4,6)[1],4.0988,'rear quarter');
 const crown=M56_SHELL_RINGS[0],shoulder=M56_SHELL_RINGS[1],
  wall=M56_SHELL_RINGS[2],edge=M56_SHELL_RINGS[4];
 assert.ok(wall.side>shoulder.side+.25&&wall.side<shoulder.side+.65,
  'continuous wall gently widens from shoulder rather than a hard intermediate tier');
 assert.ok(edge.side-wall.side>.75,'single characteristic M56 flare');
 assert.ok(edge.rear-wall.rear>.85,'long rear protective sweep');
 assert.ok(edge.rear-edge.front>1.2,'profile is unmistakably asymmetrical');
 assert.ok(M56_PERIMETER.length===8,'retain boxy faceting');
 const m=HEAD_SILHOUETTE_METRICS['ddr-m56'];
 near(m.top,M56_SHELL_FIT.top,'fit top');
 near(m.frontExtent,M56_SHELL_FIT.frontExtent,'fit front');
 near(m.rearExtent,M56_SHELL_FIT.rearExtent,'fit rear');
 near(m.foreheadEdge,M56_SHELL_FIT.frontHem,'fit brow');
 near(m.earEdge,M56_SHELL_FIT.sideHem,'fit ear');
 assert.ok(edge.rear>HEAD_SILHOUETTE_METRICS['m1-steel'].rearExtent+1.4);
 assert.ok(edge.front>HEAD_SILHOUETTE_METRICS['soviet-steel'].rearExtent);
});

test('S1-A1B crown is narrower but remains square and eight-faceted',()=>{
 const top=M56_SHELL_RINGS[0],shoulder=M56_SHELL_RINGS[1];
 near(top.side,3.08,'reduced flat crown half-width');
 near(top.front,3.48,'reduced flat crown forward reach');
 near(top.rear,3.72,'reduced flat crown rear reach');
 near(top.y,8.775,'helmet fit height preserved');
 near(shoulder.side,5.60,'proven skull-covering shoulder stays broad');
 assert.ok(top.side/shoulder.side<.58,'crown is visibly subordinate to shell');
 assert.equal(M56_PERIMETER.length,8,'no extra smoothing facets');
 assert.equal(M56_SHELL_RINGS.length,8,'no extra decorative profile bands');
});
test('S1-A1B flare grows through bell and sweeps farther down at rear',()=>{
 const shoulder=M56_SHELL_RINGS[1],skirt=M56_SHELL_RINGS[2],
  flare=M56_SHELL_RINGS[3],lip=M56_SHELL_RINGS[4];
 assert.ok(skirt.y>6.3&&skirt.y<6.5,
  'flare begins above old abrupt horizontal shelf');
 assert.ok(skirt.side>shoulder.side+.3&&skirt.side<shoulder.side+.6);
 assert.ok(flare.side-skirt.side<.75,
  'wide flare is introduced through the wall instead of a separate shelf');
 assert.ok(flare.rear-skirt.rear<1.1,
  'rear taper grows gradually into the integral flare');
 assert.ok(lip.frontRise>.29&&lip.rearDrop>.44,
  'raised front and lower rear are both intentionally emphasized');
 assert.ok(lip.y+lip.frontRise-(lip.y-lip.rearDrop)>.70,
  'distinctive fore-and-aft slope, not a level boonie brim');
 assert.ok(lip.side-flare.side<.15,
  'thin steel termination stays subordinate to main shell');
 near(M56_SHELL_FIT.frontHem,lip.y+lip.frontRise,'front fit');
 near(M56_SHELL_FIT.rearHem,lip.y-lip.rearDrop,'rear fit');
});

test('S1-A1B every quad has consistent broad-plane normals and no inverted triangles',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  normals=g.getAttribute('normal');
 const offset=M56_PERIMETER.length*3,quads=(M56_SHELL_RINGS.length-1)*8;
 assert.equal(normals.count,p.count);
 assert.equal(g.userData.exteriorQuads,quads);
 for(let q=0;q<quads;q++){
  const at=offset+q*4,
   n=new THREE.Vector3(normals.getX(at),normals.getY(at),normals.getZ(at));
  near(n.length(),1,'unit normal for quad '+q,.0001);
  for(let k=1;k<4;k++)for(const component of ['X','Y','Z'])
   near(normals['get'+component](at+k),normals['get'+component](at),
    'flat quad '+q+' normal '+component,.0001);
  const v=i=>new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
  const [a,b,c,d]=[v(at),v(at+1),v(at+2),v(at+3)];
  for(const [u,vv,w] of [[a,b,c],[a,c,d]]){
   const cross=new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(vv,u),
    new THREE.Vector3().subVectors(w,u));
   assert.ok(cross.length()>.00001,'no degenerate facets in quad '+q);
   assert.ok(cross.dot(n)>0,'both triangles face the same authored direction: '+q);
  }
 }
});

test('S1-A1 M56 shell stays hollow with correctly oriented roof and underside',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');let roof=0,innerRoof=0,filled=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  assert.ok([x,y,z,n.getY(i)].every(Number.isFinite));
  if(y>8.774&&n.getY(i)>.9)roof++;
  if(y>7.74&&y<7.76&&n.getY(i)<-.9)innerRoof++;
  if(Math.abs(x)<1&&Math.abs(z)<1&&y<6)filled++;
 }
 assert.ok(roof>=8,'crown top visibly shaded');
 assert.ok(innerRoof>=8,'inside cap visible from FIT underside');
 assert.equal(filled,0,'no face-covering bottom polygon');
});

test('S1-A1 geometry encloses square-head corners through entire upper rim',()=>{
 const g=createM56UnifiedShellGeometry();
 const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 for(const y of [7,6.8,6.5,6,5.6,5.1]){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const ray=new THREE.Raycaster(new THREE.Vector3(0,y,0),
    new THREE.Vector3(sx,0,sz).normalize(),0,25);
   const hits=ray.intersectObject(mesh,false);
   assert.ok(hits.length,'no split shell at '+y+' '+sx+','+sz);
   assert.ok(hits[0].distance>Math.sqrt(32)+.10,
    'square head may not poke through shell: y '+y+' '+sx+','+sz+
     ' clearance '+(hits[0].distance-Math.sqrt(32)));
  }
 }
});

test('S1-A1 authentic period details remain optional, sparse and aligned',()=>{
 const parent=new THREE.Group(),dark=new THREE.MeshStandardMaterial();
 const extras=createM56Extras(parent,dark);
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 updateM56Extras(extras,{m56Details:'early-rivets',m56Net:'coarse'});
 assert.equal(extras.rivets.visible,true);
 assert.equal(extras.net.visible,true);
 assert.ok(extras.rivets.children.length<=3,
  'historical two side and one rear fastener after consolidation');
 assert.ok(extras.net.children.length<=2,
  'mesh-consolidated optional net, no dense ornamental loops');
 updateM56Extras(extras,{m56Details:'late-smooth',m56Net:'none'});
 assert.equal(extras.rivets.visible,false);
 assert.equal(extras.net.visible,false);
 assert.ok(headwearColorChoices('ddr-m56').length>0);
 assert.equal(headwearCamoChoices('ddr-m56').length,0,
  'the painted shell is not accidentally made a cloth camo material');
});
