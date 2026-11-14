/** H9.4b — ACH-ARC inspired full-length curved two-screw rail.
 * Fitted to real ACH/MICH cover panels at construction, never animation time.
 * One continuous low-profile track follows the hard shell and sweeps DOWN
 * behind the ear region; visible bolts stay above the protective edge.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetShell,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {achMichHemY,achMichProfile} from './operator-ach-mich-details.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {helmetHexFastenerGeometry} from './operator-helmet-fasteners.ts';

type Side='left'|'right';
type RailStation={u:number;rise:number};
const stations:readonly RailStation[]=[
 // Move the entire connector toward the rear and emphasize the ARC.
 {u:-.54,rise:.34},{u:-.29,rise:.39},
 {u:-.04,rise:.37},{u:.22,rise:.28},
 {u:.48,rise:.08},{u:.72,rise:-.32},{u:.96,rise:-.81}
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
 const baseY=Math.max(p.top-2.38,highestCut+.54);
 const y=clamp(baseY+rise,low+.52,p.top-.68);
 const v=clamp(2*(y-low-.38)/(p.top-low-.45)-1,-.58,.69);
 let selected:HelmetSurfaceFrame|null=null,score=Infinity;
 for(const uu of [u,u*.94,u*.84])
  for(const vv of [v,v+.11,v-.10,v+.23,v-.20,.25,.40]){
   const f=sampleHelmetShell(shell,side,uu,clamp(vv,-.64,.79),.12);
   if(!f||((side==='left'&&f.position.x>=0)||
    (side==='right'&&f.position.x<=0)))continue;
   const distance=Math.abs(f.position.y-y)+Math.abs(uu-u)*.25;
   if(distance<score){score=distance;selected=f;}
  }
 if(selected){
  // Smooth the manufactured centerline across cutout jumps, retaining
  // the nearest genuine shell-facing normal rather than a cloth chord.
  selected.position.y=y;
  return selected;
 }
 throw Error('H5.2 no '+shell+' '+side+' shell rail frame at u='+u);
};
/** Front ARC accessory socket shared by the light and camera models.
 * Attaches to the real manufactured connector, not a second shell-mounted
 * bracket that can drift away from the rail at different shell cuts.
 */
export function arcFrontAccessoryFrame(shell:AchMichCoverShell,side:Side):
 HelmetSurfaceFrame{
 const frame=railFrame(shell,side,-.39,.38);
 frame.position.addScaledVector(frame.normal,.42);
 return frame;
}
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
  const hA=i===1?.73:.84,hB=i===frames.length-1?1.01:.84;
  const aTop=at(a,hA,.35),aBot=at(a,-hA,.35),
   bTop=at(b,hB,.35),bBot=at(b,-hB,.35);
  quad(aTop,aBot,bBot,bTop,data);
  quad(at(a,hA,.12),aTop,bTop,at(b,hB,.12),data);
  quad(aBot,at(a,-hA,.12),at(b,-hB,.12),bBot,data);
  if(i===1)quad(at(a,hA,.12),at(a,-hA,.12),aBot,aTop,data);
  if(i===frames.length-1)
   quad(bTop,bBot,at(b,-hB,.12),at(b,hB,.12),data);
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
 _dark:THREE.Material,light:THREE.Material)=>{
 const mount=new THREE.Group();
 mount.name='arc-rail-chinstrap-sharing-bolt';
 mount.position.copy(frame.position).addScaledVector(frame.normal,.44);
 mount.quaternion.setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(frame.right,frame.up,frame.normal));
 parent.add(mount);
 // Match the NVG shroud: one large flat hex per bolt, no tiny rings.
 const head=new THREE.Mesh(
  helmetHexFastenerGeometry([[0,0]],.24,.13),light);
 head.name='arc-visible-bolt-head';
 head.castShadow=false;head.receiveShadow=false;
 mount.add(head);
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
  for(const u of [-.32,-.11,.13,.36,.59,.79]){
   const f=railFrame(shell,side,u,u>.40?-(u-.40)*1.4:.32);
   // H6.0: tall vertical grip/accessory slots read perpendicular to rail.
   const slot=new THREE.Mesh(new THREE.PlaneGeometry(.28,.67),dark);
   slot.name='large-arc-accessory-slot';
   attach(g,f,slot,0,.41);
  }
  for(const s of [stations[0],stations[stations.length-1]])
   bolt(g,railFrame(shell,side,s.u,s.rise),dark,fastener);
  g.userData.h12TallRearArc=true;
  g.userData.h12ExaggeratedStationCount=stations.length;
  g.userData.h9ArcFamily='ACH-ARC';
  g.userData.h60SlotsVertical=true;
  g.userData.h60RailsRearward=true;
  g.userData.h5RearContour='descending-ear-clearance';
  g.userData.h5HardMount=true;
  g.userData.h9ArcScrews=2;
  g.userData.h9ArcSlots=6;
  g.userData.h9SurfaceFitted=true;
  g.userData.h9ArcStationPositions=frames.map(f=>f.position.toArray());
  // Each side merges into the minimum number of static material batches.
  // Nested bolt groups are tiny but do not animate.
  consolidateVisualGroup(g);
 }
}
