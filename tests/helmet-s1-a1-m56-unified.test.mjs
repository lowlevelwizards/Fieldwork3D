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
 assert.equal(g.userData.m56ProfileRevision,'S1-A1');
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
 assert.equal(headwearCuboidVolumes('ddr-m56').length,14);
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
 near(b.min.y,4.225,'rear nape');
 near(m56SurfacePoint(4,0)[1],4.65,'raised front');
 near(m56SurfacePoint(4,2)[1],4.5884,'front quarter');
 near(m56SurfacePoint(4,4)[1],4.225,'rear nape');
 near(m56SurfacePoint(4,6)[1],4.2824,'rear quarter');
 const crown=M56_SHELL_RINGS[0],shoulder=M56_SHELL_RINGS[1],
  wall=M56_SHELL_RINGS[2],edge=M56_SHELL_RINGS[4];
 assert.ok(wall.side>shoulder.side+.8,'one broad continuous bell');
 assert.ok(edge.side-wall.side>.95,'single characteristic M56 flare');
 assert.ok(edge.rear-wall.rear>1.5,'long rear protective sweep');
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

test('S1-A1 M56 shell stays hollow with correctly oriented roof and underside',()=>{
 const g=createM56UnifiedShellGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');let roof=0,innerRoof=0,filled=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  assert.ok([x,y,z,n.getY(i)].every(Number.isFinite));
  if(y>8.774&&n.getY(i)>.9)roof++;
  if(y>7.57&&y<7.59&&n.getY(i)<-.9)innerRoof++;
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
