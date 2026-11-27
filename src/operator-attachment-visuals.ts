/** BT3R2: large readable holder masses; surface marks are metric pixels.
 * +Z outward, +Y up. Sample contents are independent Lab-only objects.
 */
import * as THREE from 'three';
import {attachmentFootprint,attachmentVariant,attachmentContentSlots,
 type AttachmentId,type AttachmentVariant,type AttachmentMaterial} from './operator-attachment-catalog.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {gearMarkedMaterial,gearBoxMarkUV,type GearMark} from './operator-gear-pixel-art.ts';
import {carriedMagazineGeometry} from './operator-carried-magazines.ts';
import {buildGlockAppearance,glockArtSockets} from './weapons/geometry/glock-family-silhouettes.ts';
export type AttachmentPalette=Record<AttachmentMaterial,THREE.Material>;
export type AttachmentVisual={
 root:THREE.Group;holder:THREE.Group;contents:THREE.Group[];
 contentSockets:THREE.Group[];interactionSocket:THREE.Object3D;
 footprint:ReturnType<typeof attachmentFootprint>;
};
type Part=(channel:AttachmentMaterial,x:number,y:number,z:number,w:number,h:number,d:number,name?:string,mark?:GearMark)=>void;
export function createAttachmentVisual(id:AttachmentId,palette:AttachmentPalette,
 requested:AttachmentVariant='standard',sampleContents=false):AttachmentVisual{
 const variant=attachmentVariant(id,requested),footprint=attachmentFootprint(id,variant);
 const {width:W,height:H,depth:D}=footprint;
 const root=new THREE.Group();root.name='attachment-'+id;
 root.userData.attachmentId=id;root.userData.attachmentVariant=variant;
 const holder=new THREE.Group();holder.name='holder';root.add(holder);
 const contents:THREE.Group[]=[],contentSockets:THREE.Group[]=[];
 const parts=(g:THREE.Group,dx=0,dy=0,dz=0):Part=>(channel,x,y,z,w,h,d,name='panel',mark)=>{
  const source=palette[channel],m=mark?gearMarkedMaterial(source,mark,w*W,h*H):source;
  const geometry=garmentBoxUV(new THREE.BoxGeometry(w*W,h*H,d*D),w*W,h*H,d*D,m,x*W,y*H,z*D);
  if(mark)gearBoxMarkUV(geometry,w*W,h*H);
  const mesh=new THREE.Mesh(geometry,m);mesh.name=name;
  mesh.position.set((x-dx)*W,(y-dy)*H,(z-dz)*D);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 };
 const b=parts(holder);
 // Real mounting bridge, broad enough to clear the trouser seam, not a
 // floating tab. All other surface details stay on the underlying mesh.
 b('fabric',0,-.16,.10,.68,.32,.20,'mount-bridge');
 const open=(cx:number,cw:number,bottom:number,top:number,mark?:GearMark,channel:AttachmentMaterial='fabric')=>{
  const h=top-bottom,cy=(top+bottom)*.5;
  // Four separate walls plus a floor, meeting at edges, not overlapping
  // coplanar face strips. Interior aperture remains real.
  b(channel,cx,cy,.25,cw,h,.18,'back-wall');
  b(channel,cx,cy,.89,cw,h,.20,'front-wall',mark);
  for(const s of [-1,1])b(channel,cx+s*cw*.45,cy,.565,cw*.10,h,.45,'side-wall');
  b('dark',cx,bottom+.07,.565,cw*.80,.14,.45,'floor');
 };
 const closed=(cw:number,bottom:number,top:number,mark:GearMark='flap')=>{
  b('fabric',0,(top+bottom)*.5,.60,cw,top-bottom,.76,'body',mark);
 };
 const cell=(x:number,y:number,z:number,draw?:(p:Part,g:THREE.Group)=>void)=>{
  const socket=new THREE.Group();socket.name='content-socket-'+contentSockets.length;
  socket.position.set(x*W,y*H,z*D);root.add(socket);contentSockets.push(socket);
  const g=new THREE.Group();g.name='sample-content-'+contents.length;socket.add(g);
  contents.push(g);g.visible=false;
  if(sampleContents&&draw){draw(parts(g,x,y,z),g);consolidateVisualGroup(g);}
 };
 switch(id){
 case 'pistol-mag-pouch':{
  const n=attachmentContentSlots(id,variant),w=n===2?.44:.90;
  for(let i=0;i<n;i++){
   const x=(i-(n-1)/2)*.50;
   open(x,w,-.96,-.24,'band');
   cell(x,-.15,.56,p=>{
    p('contents',x,-.44,.56,w*.66,.75,.42,'sample-magazine');
    p('hardware',x,-.065,.56,w*.78,.12,.57,'baseplate');
   });
  }break;
 }
 case 'primary-mag-pouch':
  open(0,.98,-.96,-.28,'band');
  cell(0,-.15,.56,(_p,g)=>{
   // Actual existing carried AR art profile, no arbitrary scaled proxy.
   const geo=carriedMagazineGeometry(variant==='compact'?'ar-mag20':'ar-mag30');
   if(!geo)return;geo.rotateY(Math.PI/2);geo.computeBoundingBox();
   const bounds=geo.boundingBox!,center=bounds.getCenter(new THREE.Vector3());
   geo.translate(-center.x,-bounds.max.y,-center.z);
   const mag=new THREE.Mesh(geo,palette.contents);mag.name='authored-carried-magazine';
   mag.position.y=H*.08;mag.castShadow=true;mag.receiveShadow=true;g.add(mag);
  });break;
 case 'shell-holder':
  b('fabric',0,-.48,.24,.96,.75,.35,'backing');
  // Four separately readable chunky shells, generous gaps and exposed brass.
  for(let i=0;i<4;i++){
   const x=(i-1.5)*.25;
   b('dark',x,-.53,.69,.19,.30,.60,'elastic-cell');
   cell(x,-.16,.64,p=>{
    p('accent',x,-.39,.64,.17,.63,.46,'shell-body');
    p('hardware',x,-.79,.64,.17,.16,.46,'shell-base');
   });
  }break;
 case 'rigid-holster':
  open(0,.96,-.98,-.29,undefined,'dark');
  cell(0,-.22,.55,(_p,g)=>{
   const gun=buildGlockAppearance('glock-g19-gen3',{details:false});
   const pivot=glockArtSockets('glock-g19-gen3').holsterPivot;
   gun.position.set(-pivot.x,-pivot.y,-pivot.z);
   const cradle=new THREE.Group();cradle.scale.setScalar(.37);cradle.rotation.z=-Math.PI/2;
   cradle.position.set(-1.45,.95,0);cradle.add(gun);g.add(cradle);
   // Borrow authored geometry; the preview owns no shared weapon materials.
   gun.traverse(o=>{if(o instanceof THREE.Mesh)o.material=palette.contents;});
  });break;
 case 'flap-holster':
  closed(.91,-.98,-.30);
  b('fabric',0,-.19,.62,.97,.36,.76,'broad-flap','flap');
  cell(0,-.20,.56);break;
 case 'medical-pouch':
  closed(.98,-.95,-.10,'medical');
  b('fabric',0,-.09,.54,.90,.16,.60,'grab-handle');
  cell(0,-.20,.56);break;
 case 'radio-holder':
  open(0,.91,-.96,-.44);
  cell(0,-.32,.56,p=>{
   p('contents',0,-.47,.56,.72,.68,.42,'radio-body','band');
   p('dark',.29,-.13,.56,.19,.26,.19,'antenna');
  });break;
 case 'flashlight-holder':
  open(0,.90,-.82,-.43);
  cell(0,-.24,.56,p=>{
   p('contents',0,-.46,.56,.48,.72,.45,'body');
   p('dark',0,-.13,.56,.78,.25,.74,'head');
  });break;
 case 'restraint-pouch':
  closed(.92,-.95,-.32);
  b('fabric',0,-.18,.60,.96,.31,.76,'case-flap','flap');break;
 case 'wedge-holder':
  open(0,.96,-.95,-.38);
  for(let i=0;i<2;i++){
   const x=(i-.5)*.43;
   cell(x,-.16,.56,(_p,g)=>{
    const shape=new THREE.Shape();
    shape.moveTo(-.17*W,-.64*H);shape.lineTo(.17*W,-.64*H);
    shape.lineTo(.17*W,.10*H);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:D*.38,bevelEnabled:false,steps:1,curveSegments:1});
    geo.translate(0,0,-D*.19);
    const mesh=new THREE.Mesh(geo,palette.accent);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
   });
  }break;
 case 'grenade-pouch':
  open(0,.96,-.96,-.40,'flap');
  cell(0,-.27,.56,p=>{
   p('contents',0,-.47,.56,.66,.68,.43,'sample-canister');
   p('hardware',0,-.12,.56,.57,.15,.50,'canister-cap');
  });break;
 case 'utility-pouch':
  closed(.97,-.96,-.12,'utility');break;
 case 'dump-pouch':
  if(variant==='rolled')closed(.98,-.93,-.12,'band');
  else open(0,.98,-.96,-.16,'band');
  break;
 }
 const interactionSocket=new THREE.Object3D();interactionSocket.name='interaction-socket';
 interactionSocket.position.set(0,-H*.10,D*.60);root.add(interactionSocket);
 consolidateVisualGroup(holder);
 return {root,holder,contents,contentSockets,interactionSocket,footprint};
}
export function setAttachmentSampleCount(visual:AttachmentVisual,count:number){
 const n=Number.isFinite(count)?Math.max(0,Math.floor(count)):0;
 visual.contents.forEach((content,index)=>{content.visible=index<n;});
}
export function placeAttachmentVisual(visual:AttachmentVisual,socket:{x:number;y:number;z:number;yaw:number}){
 visual.root.position.set(socket.x,socket.y,socket.z);visual.root.rotation.y=socket.yaw;
}
