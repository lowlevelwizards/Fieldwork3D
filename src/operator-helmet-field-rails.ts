/** H9.4b — ACH-ARC inspired full-length curved two-screw rail.
 * Fitted to real ACH/MICH cover panels at construction, never animation time.
 * One continuous shallow raised track follows the shell and kicks upward at
 * the rear; large slots and shared retention bolts remain gameplay-readable.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {achMichHemY,achMichProfile} from './operator-ach-mich-details.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

type Side='left'|'right';
type RailStation={u:number;rise:number};
const stations:readonly RailStation[]=[
 {u:-.78,rise:-.14},{u:-.51,rise:-.11},
 {u:-.24,rise:-.07},{u:.02,rise:0},
 {u:.29,rise:.12},{u:.54,rise:.31},{u:.78,rise:.72}
];
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const railFrame=(shell:AchMichCoverShell,side:Side,u:number,rise=0):
 HelmetSurfaceFrame=>{
 const p=HELMET_MOUNT_PROFILES[shell];
 const z=u*(p.rear-p.front)*.40+(p.front+p.rear)*.50;
 const low=achMichHemY(shell,z);
 // A rail is one manufactured connector spanning the ear cut. It cannot
 // dip into an open MICH-2002 ear window at each changing hem station.
 const highestCut=Math.max(...achMichProfile(shell).hem.map(v=>v[1]));
 const baseY=Math.max(p.top-2.43,highestCut+.51);
 const y=clamp(baseY+rise,low+.52,p.top-.68);
 const v=clamp(2*(y-low-.38)/(p.top-low-.45)-1,-.58,.69);
 for(const uu of [u,u*.94,u*.84])
  for(const vv of [v,v+.11,v-.10,v+.23,v-.20,.25,.40]){
   const f=sampleHelmetCover(shell,side,uu,clamp(vv,-.64,.79),.18);
   if(f&&((side==='left'&&f.position.x<0)||
          (side==='right'&&f.position.x>0))){
    // A molded ARC rail has a single continuous centerline even where
    // MICH-2002 cloth is interrupted by the high ear cut. The sampled
    // X/Z surface and normal still determine contact and orientation.
    f.position.y=y;
    return f;
   }
  }
 throw Error('H9.4b no '+shell+' '+side+' rail frame at u='+u);
};
const quad=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,
 d:THREE.Vector3,out:number[])=>{
 for(const v of [a,b,c,a,c,d])out.push(v.x,v.y,v.z);
};
const at=(f:HelmetSurfaceFrame,up:number,out:number)=>f.position.clone()
 .addScaledVector(f.up,up).addScaledVector(f.normal,out);
/** One continuous faceted formed track. Edge caps create real shallow
 * material thickness, rather than H8's flat rectangle-on-shell.
 */
const railBody=(frames:HelmetSurfaceFrame[]):THREE.BufferGeometry=>{
 const data:number[]=[];
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i];
  const hA=i===1?.55:.61,hB=i===frames.length-1?.77:.61;
  const aTop=at(a,hA,.43),aBot=at(a,-hA,.43),
   bTop=at(b,hB,.43),bBot=at(b,-hB,.43);
  quad(aTop,aBot,bBot,bTop,data);
  quad(at(a,hA,.13),aTop,bTop,at(b,hB,.13),data);
  quad(aBot,at(a,-hA,.13),at(b,-hB,.13),bBot,data);
  if(i===1)quad(at(a,hA,.13),at(a,-hA,.13),aBot,aTop,data);
  if(i===frames.length-1)
   quad(bTop,bBot,at(b,-hB,.13),at(b,hB,.13),data);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.h9ArcContinuousCurved=true;
 geometry.userData.h9ArcStationCount=frames.length;
 return geometry;
};
const attach=(parent:THREE.Group,frame:HelmetSurfaceFrame,mesh:THREE.Mesh,
 height=0,offset=.35)=>{
 mesh.position.copy(frame.position).addScaledVector(frame.up,height)
  .addScaledVector(frame.normal,offset);
 mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(frame.right,frame.up,frame.normal));
 mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);
};
const bolt=(parent:THREE.Group,frame:HelmetSurfaceFrame,
 dark:THREE.Material,light:THREE.Material)=>{
 const mount=new THREE.Group();
 mount.name='arc-rail-chinstrap-sharing-bolt';
 mount.position.copy(frame.position).addScaledVector(frame.normal,.49);
 mount.quaternion.setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(frame.right,frame.up,frame.normal));
 parent.add(mount);
 for(const [name,radius,depth,material,z] of [
  ['arc-recessed-washer',.33,.055,dark,.025],
  ['arc-visible-bolt-head',.23,.070,light,.075]
 ] as const){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,8),
   material);
  m.name=name;m.position.z=z;m.rotation.x=Math.PI/2;
  m.castShadow=false;m.receiveShadow=false;mount.add(m);
 }
};
export function addAchMichArcRails(
 shell:AchMichCoverShell,root:THREE.Group,
 metal:THREE.Material,dark:THREE.Material,fastener:THREE.Material
):void{
 for(const side of ['left','right'] as const){
  const g=new THREE.Group();g.name='h9-ach-arc-'+side;root.add(g);
  const frames=stations.map(s=>railFrame(shell,side,s.u,s.rise));
  const m=new THREE.Mesh(railBody(frames),metal);
  m.name='curved-full-length-ach-arc-track';
  m.castShadow=false;m.receiveShadow=false;g.add(m);
  for(const u of [-.56,-.35,-.14,.08,.30,.51]){
   const f=railFrame(shell,side,u,u>.25?(u-.25)*.75:0);
   // ACH-ARC retention slots run along the rail, not vertically.
   const slot=new THREE.Mesh(new THREE.PlaneGeometry(.53,.23),dark);
   slot.name='large-arc-accessory-slot';
   attach(g,f,slot,0,.46);
  }
  for(const s of [stations[0],stations[stations.length-1]])
   bolt(g,railFrame(shell,side,s.u,s.rise),dark,fastener);
  g.userData.h9ArcFamily='ACH-ARC';
  g.userData.h9ArcScrews=2;
  g.userData.h9ArcSlots=6;
  g.userData.h9SurfaceFitted=true;
  g.userData.h9ArcStationPositions=frames.map(f=>f.position.toArray());
  // Each side merges into the minimum number of static material batches.
  // Nested bolt groups are tiny but do not animate.
  consolidateVisualGroup(g);
 }
}
