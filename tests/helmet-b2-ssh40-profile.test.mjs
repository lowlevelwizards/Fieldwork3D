import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
import {createSsh40ProfileGeometry,SSH40_STEEL_LEVELS,
 SSH40_OUTLINE,SSH40_FIT_LANDMARKS,ssh40SurfacePoint}
 from '../src/operator-ssh40-helmet-profile.ts';
import {createM1ProfileGeometry} from '../src/operator-m1-helmet-profile.ts';

const near=(actual,expected,label,tol=.002)=>
 assert.ok(Math.abs(actual-expected)<tol,
  `${label}: expected ${expected}, actual ${actual}`);

test('B2-A2 Soviet steel is one faceted hollow bell, not a stacked hidden shell',()=>{
 const root=createHeadwearSilhouette('soviet-steel',new THREE.MeshStandardMaterial());
 assert.equal(root.children.length,1);
 assert.equal(root.userData.primitive,'ssh40-one-piece-faceted-bell');
 assert.equal(root.userData.stage,'B2');
 const shell=root.children[0],g=shell.geometry;
 assert.equal(shell.children.length,0);
 assert.equal(g.userData.ssh40FacetedSurface,true);
 assert.equal(g.userData.ssh40VisibleInterior,true);
 assert.equal(g.userData.ssh40IdentityRevision,4);
 assert.equal(g.userData.ssh40SkirtEdgeRevision,'B2-A3');
 assert.equal(g.userData.ssh40OutlineSegments,8);
 assert.equal(g.userData.ssh40ProfileStations.length,8,
  'removed an unnecessary exterior ring instead of only reducing its shading');
 assert.equal(g.userData.greedyCuboidUnion,undefined);
 assert.equal(shell.castShadow,true);
 assert.equal(shell.receiveShadow,false);
 assert.ok(g.index.count/3<=140,'one mesh and no ornamental tiers');
 for(const attribute of ['uv','uv1','color','normal'])
  assert.equal(g.getAttribute('position').count,g.getAttribute(attribute).count);
 assert.equal(g.userData.materialRegions,true);
 assert.equal(g.userData.camoAtlasPixels,128);
});

test('B2-A2 SSh-40 is larger, low and swept, with a restrained rolled perimeter',()=>{
 const g=createSsh40ProfileGeometry(),b=g.boundingBox;
 assert.ok(b);
 near(b.max.y,9.65,'dome top');
 near(b.min.x,-5.86,'left');
 near(b.max.x,5.86,'right');
 near(b.min.z,-5.92,'front');
 near(b.max.z,6.08,'rear');
 near(b.min.y,3.38,'low rear hem');
 assert.equal(SSH40_OUTLINE.length,8);
 assert.equal(SSH40_STEEL_LEVELS.length,8);
 const m=HEAD_SILHOUETTE_METRICS['soviet-steel'];
 near(SSH40_FIT_LANDMARKS.top,m.top,'top fit');
 near(SSH40_FIT_LANDMARKS.frontExtent,m.frontExtent,'front fit');
 near(SSH40_FIT_LANDMARKS.rearExtent,m.rearExtent,'rear fit');
 near(SSH40_FIT_LANDMARKS.sideHem,m.earEdge,'side fit');
 near(SSH40_FIT_LANDMARKS.frontHem,m.foreheadEdge,'front hem fit');
 near(ssh40SurfacePoint(4,0)[1],3.98,'front hem');
 near(ssh40SurfacePoint(4,4)[1],3.38,'rear hem');
 near(ssh40SurfacePoint(4,2)[1],3.92,'front quarter of swept hem');
 const top=SSH40_STEEL_LEVELS[0],shoulder=SSH40_STEEL_LEVELS[1],
  bell=SSH40_STEEL_LEVELS[2],roll=SSH40_STEEL_LEVELS[3];
 assert.ok(bell.side-top.side>2.2,'big bell above a modest upper dome');
 assert.ok(bell.side-shoulder.side>1.0,'one broad wall rather than stacked bands');
 assert.ok(roll.side-bell.side<.18,'rim must not project like an M1 shelf');
 assert.ok(roll.front-bell.front<.10,'forward rim roll is integrated');
 for(let i=0;i<8;i++){
  const low=ssh40SurfacePoint(4,i),returnEdge=ssh40SurfacePoint(5,i);
  assert.ok(Math.abs(low[0])>=Math.abs(returnEdge[0]),
   'interior rolls back inwards at the bottom');
 }
});

test('B2-A3 preserves the boxy crown and large unrounded shoulder',()=>{
 const [top,shoulder]=SSH40_STEEL_LEVELS;
 assert.deepEqual(
  [top.y,top.side,top.front,top.rear],
  [9.65,3.45,3.70,3.82],'approved top dimensions must not be rounded');
 assert.deepEqual(
  [shoulder.y,shoulder.side,shoulder.front,shoulder.rear],
  [8.80,4.56,4.67,4.79],'approved broad shoulder stays untouched');
 assert.equal(SSH40_OUTLINE.length,8,'no extra facets');
 assert.equal(SSH40_STEEL_LEVELS.length,8,'no extra circumferential bands');
});

test('B2-A3 lower skirt is calmer, rim short and gentle, but swept nape remains',()=>{
 const bell=SSH40_STEEL_LEVELS[2],rimTop=SSH40_STEEL_LEVELS[3],
  rimBottom=SSH40_STEEL_LEVELS[4];
 near(bell.y,4.62,'broad wall continues below old break');
 near(bell.side,5.76,'subtle transition into lower skirt');
 near(rimTop.y-rimBottom.y,.27,'short readable rolled band');
 assert.ok(rimTop.side-bell.side>0&&rimTop.side-bell.side<.09,
  'lower skirt only widens slightly at outer roll');
 assert.ok(rimTop.front-bell.front>0&&rimTop.front-bell.front<.05,
  'no protruding front shelf');
 assert.ok(rimTop.rear-bell.rear>0&&rimTop.rear-bell.rear<.05,
  'no overhanging rear shelf');
 assert.ok(rimBottom.side>=rimTop.side&&rimBottom.side-rimTop.side<=.03,
  'the roll itself has almost no lateral projection');
 near(ssh40SurfacePoint(4,0)[1],3.98,'front hem is unchanged');
 near(ssh40SurfacePoint(4,2)[1],3.92,'front quarter is unchanged');
 near(ssh40SurfacePoint(4,4)[1],3.38,'rear nape drop is unchanged');
 const b=createSsh40ProfileGeometry().boundingBox;
 near(b.max.y,9.65,'top remains unchanged');
 near(b.min.x,-5.86,'overall width remains unchanged');
 near(b.max.x,5.86,'overall width remains unchanged');
 near(b.min.z,-5.92,'front extent remains unchanged');
 near(b.max.z,6.08,'rear extent remains unchanged');
 near(b.min.y,3.38,'lowest hem remains unchanged');
});

test('B2-A3 shades skirt as steel shell, not an artificial wide dark band',()=>{
 const g=createSsh40ProfileGeometry(),uv=g.getAttribute('uv');
 // 8 roof triangles × 3 vertices + 8 segments × 4 vertices per band.
 const start=8*3,band=8*4;
 for(let i=start+2*band;i<start+3*band;i++)
  assert.ok(uv.getY(i)<.5,'lower wall uses primary-shell tile');
 for(let i=start+3*band;i<start+4*band;i++)
  assert.ok(uv.getY(i)>.5,'only the short actual roll uses lip tile');
});

test('B2-A2 M1 remains a distinctive taller pot with a more projecting brim',()=>{
 const m1=createM1ProfileGeometry('steel').boundingBox,
  ssh=createSsh40ProfileGeometry().boundingBox;
 assert.ok(m1.max.y-ssh.max.y>.5,'M1 top remains higher');
 assert.ok(ssh.max.y>9.5,'SSh is no longer conspicuously undersized');
 assert.ok(-m1.min.z-(-ssh.min.z)>.8,'M1 brim extends farther forward');
 const sshRoll=SSH40_STEEL_LEVELS[3].front-
  SSH40_STEEL_LEVELS[2].front;
 assert.ok(sshRoll<.1,'Soviet lower lip is a roll, not a brim');
});

test('B2-A2 fully encloses all square skull corners around the upper bell',()=>{
 // Screenshot B2-A1 showed tiny skin-colored triangles at the upper
 // sidewall corners. The old small octagonal shoulder intersected the
 // 8x8 cube head near local y=7, revealing the skull through the helmet.
 // Test REAL triangle ray intersections from inside the skull, not only
 // symbolic fit envelopes; sample upper skull and lower temple elevations.
 const geometry=createSsh40ProfileGeometry();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
  side:THREE.DoubleSide
 }));
 const cornerDistance=Math.hypot(4,4),margin=.10;
 for(const y of [7,6.9,6.6,6.0,5.5,5.0]){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const ray=new THREE.Raycaster(
    new THREE.Vector3(0,y,0),
    new THREE.Vector3(sx,0,sz).normalize(),0,25);
   const hits=ray.intersectObject(mesh,false);
   assert.ok(hits.length>0,`steel must close upper corner: y=${y} ${sx} ${sz}`);
   assert.ok(hits[0].distance>cornerDistance+margin,
    `no exposed skin through shell: y=${y} corner=${sx},${sz}; clearance=${hits[0].distance-cornerDistance}`);
  }
 }
});

test('B2-A2 outward dome and recessed underside retain correctly directed normals',()=>{
 const g=createSsh40ProfileGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');
 let roof=0,underside=0,lowerCavity=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ny=n.getY(i);
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
  assert.ok(Number.isFinite(ny));
  if(y>9.64&&ny>.9)roof++;
  if(y>8.70&&y<8.78&&ny<-.9)underside++;
  if(Math.abs(x)<1&&Math.abs(z)<1&&y<6)lowerCavity++;
 }
 assert.ok(roof>=8,'top visible from above');
 assert.ok(underside>=8,'steel recessed ceiling visible from below');
 assert.equal(lowerCavity,0,'the lower head cavity remains open');
});
