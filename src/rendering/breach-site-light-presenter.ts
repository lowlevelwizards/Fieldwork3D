/** L1.3: one pooled site-light draw and one instanced fixture-head draw.
 * Only power/geometry/disclosure changes rewrite GPU buffers. The actual
 * illumination and fog algorithms remain in the simulation and fog owners.
 */
import * as THREE from 'three';
import type {Session} from '../breach-game.ts';
import {WALL_VISUAL_HEIGHT} from '../breach-door-proportions.ts';
import {presentDecor} from './breach-3d-disclosure-presenter.ts';
import {fixtureLightingVisuals,fixtureVisualColor,
 FIXTURE_POOL_RAYS,FIXTURE_VISUAL_CAP,type FixtureVisual}
 from '../equipment-lighting-visuals.ts';

const VERTICES_PER_FIXTURE=FIXTURE_POOL_RAYS*9; // three triangles per sector
const MAX_VERTICES=FIXTURE_VISUAL_CAP*VERTICES_PER_FIXTURE;
type DisplayHead={position:{x:number;y:number};microKey:string;fineKey:string};
const detailAt=(f:FixtureVisual):DisplayHead=>({
 position:f.p,
 microKey:'micro:'+Math.floor(f.p.x/10)+','+Math.floor(f.p.y/10),
 fineKey:'fine:'+Math.floor(f.p.x/20)+','+Math.floor(f.p.y/20)
});

export class SiteFixtureLightingPresenter{
 private readonly mesh:THREE.Mesh;
 private readonly geometry:THREE.BufferGeometry;
 private readonly head:THREE.InstancedMesh;
 private readonly scratch=new THREE.Object3D();
 private readonly tint=new THREE.Color();
 private lastVisuals:ReturnType<typeof fixtureLightingVisuals>|null=null;
 private lastSession:Session|null=null;
 private lastSeenRevision=-1;
 private lastIntelMode='';
 private lastOmniscient=false;
 private lastPersonal=false;
 private lastEvidence:ReadonlySet<string>|null=null;
 private readonly descriptors:DisplayHead[]=[];
 constructor(scene:THREE.Scene){
  this.geometry=new THREE.BufferGeometry();
  this.geometry.setAttribute('position',
   new THREE.BufferAttribute(new Float32Array(MAX_VERTICES*3),3)
    .setUsage(THREE.DynamicDrawUsage));
  this.geometry.setAttribute('color',
   new THREE.BufferAttribute(new Float32Array(MAX_VERTICES*3),3)
    .setUsage(THREE.DynamicDrawUsage));
  this.geometry.setDrawRange(0,0);
  const poolMaterial=new THREE.MeshBasicMaterial({
   vertexColors:true,transparent:true,opacity:.36,depthWrite:false,
   depthTest:true,blending:THREE.AdditiveBlending,
   side:THREE.DoubleSide,toneMapped:false
  });
  this.mesh=new THREE.Mesh(this.geometry,poolMaterial);
  this.mesh.frustumCulled=false;this.mesh.renderOrder=2;
  // A single stylized physical ceiling head for every potential fixture,
  // including dark and failed units. Instance colors convey supply state.
  const headGeometry=new THREE.BoxGeometry(1,1,1);
  const headMaterial=new THREE.MeshBasicMaterial({
   color:0xffffff,depthTest:true,toneMapped:false
  });
  this.head=new THREE.InstancedMesh(headGeometry,headMaterial,FIXTURE_VISUAL_CAP);
  this.head.count=0;this.head.frustumCulled=false;
  this.head.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(this.mesh,this.head);
 }
 reset():void{
  this.lastVisuals=null;this.lastSession=null;this.descriptors.length=0;
  this.lastSeenRevision=-1;this.lastEvidence=null;
  this.geometry.setDrawRange(0,0);this.head.count=0;
 }
 /** Render-only. Historical personal footage uses recorded fine ground
  * evidence, never a newly calculated current-time LOS result.
  */
 update(s:Session,omniscient:boolean,personal:boolean,
  evidence:ReadonlySet<string>|null):void{
  const visuals=fixtureLightingVisuals(s);
  const visualsChanged=visuals!==this.lastVisuals;
  if(!visualsChanged&&this.lastSession===s&&
   this.lastSeenRevision===s.seenGroundRevision&&
   this.lastIntelMode===s.intel.mode&&
   this.lastOmniscient===omniscient&&this.lastPersonal===personal&&
   this.lastEvidence===evidence)return;
  this.lastVisuals=visuals;this.lastSession=s;
  this.lastSeenRevision=s.seenGroundRevision;
  this.lastIntelMode=s.intel.mode;this.lastOmniscient=omniscient;
  this.lastPersonal=personal;this.lastEvidence=evidence;
  if(visualsChanged){
   this.descriptors.length=0;
   for(const f of visuals.fixtures)this.descriptors.push(detailAt(f));
  }
  const positions=this.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors=this.geometry.getAttribute('color') as THREE.BufferAttribute;
  let vertex=0;
  this.head.count=visuals.fixtures.length;
  for(let i=0;i<visuals.fixtures.length;i++){
   const f=visuals.fixtures[i],detail=this.descriptors[i];
   const known=presentDecor(s,detail,omniscient,personal,evidence,
    ()=>false);
   const size=f.kind==='fluorescent'?[16,2.0,5]:
    f.kind==='worklight'?[10,3.2,9]:
    f.kind==='emergency'?[8,2.6,5]:f.kind==='street'?[10.5,1.05,6.6]:[10,2.2,10];
   this.scratch.position.set(f.p.x,f.height??WALL_VISUAL_HEIGHT-5,f.p.y);
   this.scratch.scale.set(known?size[0]:0,known?size[1]:0,
    known?size[2]:0);
   this.scratch.rotation.set(0,0,0);this.scratch.updateMatrix();
   this.head.setMatrixAt(i,this.scratch.matrix);
   this.head.setColorAt(i,this.tint.setHex(fixtureVisualColor(f)));
   if(!known||!f.intensity||f.footprint.length!==FIXTURE_POOL_RAYS+1)
    continue;
   // The center/ring/outer falloff represents the same quadratic drop as
   // illuminationAt(). A real opaque blocker truncates each outer ray.
   const r=this.tint.setHex(fixtureVisualColor(f));
   const color=[r.r*f.intensity,r.g*f.intensity,r.b*f.intensity];
   const center=f.p;
   const write=(p:{x:number;y:number},gain:number)=>{
    positions.setXYZ(vertex,p.x,.19,p.y);
    colors.setXYZ(vertex,color[0]*gain,color[1]*gain,color[2]*gain);
    vertex++;
   };
   for(let j=0;j<FIXTURE_POOL_RAYS;j++){
    const a=f.footprint[j+1],b=f.footprint[(j+1)%FIXTURE_POOL_RAYS+1];
    const nearA={x:center.x+(a.x-center.x)*.38,
     y:center.y+(a.y-center.y)*.38};
    const nearB={x:center.x+(b.x-center.x)*.38,
     y:center.y+(b.y-center.y)*.38};
    write(center,.92);write(nearA,.38);write(nearB,.38);
    write(nearA,.38);write(a,0);write(b,0);
    write(nearA,.38);write(b,0);write(nearB,.38);
   }
  }
  this.head.instanceMatrix.needsUpdate=true;
  if(this.head.instanceColor)this.head.instanceColor.needsUpdate=true;
  this.geometry.setDrawRange(0,vertex);
  if(vertex){positions.needsUpdate=true;colors.needsUpdate=true;}
 }
 dispose(scene:THREE.Scene):void{
  scene.remove(this.mesh,this.head);
  this.geometry.dispose();
  (this.mesh.material as THREE.Material).dispose();
  this.head.geometry.dispose();
  (this.head.material as THREE.Material).dispose();
 }
}
