/** BT3.1–BT3.6: shared graphic gear artwork, local +Z outward, +Y up.
 * Holder and content cells are distinct ownership groups. Sample contents
 * are opt-in for the Lab ONLY; real objects are mounted by later integration.
 * Geometry/material lifetime belongs to the owning operator or preview.
 */
import * as THREE from 'three';
import {attachmentFootprint,attachmentVariant,attachmentContentSlots,
 type AttachmentId,type AttachmentVariant,type AttachmentMaterial} from './operator-attachment-catalog.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type AttachmentPalette=Record<AttachmentMaterial,THREE.Material>;
export type AttachmentVisual={
 root:THREE.Group;holder:THREE.Group;contents:THREE.Group[];
 contentSockets:THREE.Group[];interactionSocket:THREE.Object3D;
 footprint:ReturnType<typeof attachmentFootprint>;
};
type Part=(channel:AttachmentMaterial,x:number,y:number,z:number,w:number,h:number,d:number,name?:string)=>void;
export function createAttachmentVisual(id:AttachmentId,palette:AttachmentPalette,
 requested:AttachmentVariant='standard',sampleContents=false):AttachmentVisual{
 const variant=attachmentVariant(id,requested),footprint=attachmentFootprint(id,variant);
 const {width:W,height:H,depth:D}=footprint;
 const root=new THREE.Group();root.name='attachment-'+id;
 root.userData.attachmentId=id;root.userData.attachmentVariant=variant;
 const holder=new THREE.Group();holder.name='holder';root.add(holder);
 const contents:THREE.Group[]=[],contentSockets:THREE.Group[]=[];
 // Normalized dimensions: all artwork stays in x[-.5,.5], y[-1,0],
 // z[0,1]. A single interface fits every authored size and content cell.
 const parts=(g:THREE.Group,dx=0,dy=0,dz=0):Part=>(channel,x,y,z,w,h,d,name='panel')=>{
  const m=palette[channel],geometry=garmentBoxUV(new THREE.BoxGeometry(w*W,h*H,d*D),w*W,h*H,d*D,m,x*W,y*H,z*D);
  const mesh=new THREE.Mesh(geometry,m);mesh.name=name;
  mesh.position.set((x-dx)*W,(y-dy)*H,(z-dz)*D);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 };
 const b=parts(holder);
 // A wide, shallow attachment tab is common. Do not create micro stitching.
 b('dark',0,-.13,.08,.62,.26,.16,'mount-tab');
 const open=(cx:number,cw:number,bottom:number,top:number,depth=.90)=>{
  const h=top-bottom,cy=(top+bottom)*.5;
  b('fabric',cx,cy,.16,cw,h,.14,'back-panel');
  b('fabric',cx,cy,depth-.08,cw,h,.16,'front-panel');
  for(const s of [-1,1])b('fabric',cx+s*cw*.43,cy,(depth+.18)*.5,cw*.14,h,depth-.18,'side-panel');
  b('dark',cx,bottom+.065,(depth+.18)*.5,cw*.84,.13,depth-.18,'floor');
  b('dark',cx,top-.035,depth-.035,cw,.07,.07,'opening-lip');
 };
 const closed=(cx:number,cw:number,bottom:number,top:number,depth=.9)=>{
  b('fabric',cx,(top+bottom)*.5,(depth+.12)*.5,cw,top-bottom,depth-.12,'body');
  b('dark',cx,top-.07,depth-.04,cw*.93,.10,.08,'seam');
 };
 const flap=(cx:number,w:number,y:number,h=.22)=>{
  b('fabric',cx,y,.91,w,h,.16,'flap');
  b('dark',cx,y-h*.32,.98,w*.82,.045,.04,'flap-edge');
  b('hardware',cx,y-h*.22,.99,.10,.08,.02,'closure');
 };
 const cell=(x:number,y:number,z:number,draw?:(p:Part)=>void)=>{
  const socket=new THREE.Group();socket.name='content-socket-'+contentSockets.length;
  socket.position.set(x*W,y*H,z*D);root.add(socket);contentSockets.push(socket);
  const g=new THREE.Group();g.name='sample-content-'+contents.length;socket.add(g);
  contents.push(g);g.visible=false;
  if(sampleContents&&draw){draw(parts(g,x,y,z));consolidateVisualGroup(g);}
 };
 switch(id){
 case 'pistol-mag-pouch':{
  const n=attachmentContentSlots(id,variant),w=n===2?.44:.86;
  for(let i=0;i<n;i++){
   const x=(i-(n-1)/2)*.49;
   open(x,w,-.94,-.22,.92);
   b('dark',x,-.45,.94,w*.78,.10,.10,'retention-band');
   cell(x,-.18,.52,p=>{
    p('contents',x,-.43,.52,w*.62,.72,.50,'sample-magazine');
    p('hardware',x,-.075,.52,w*.75,.10,.58,'floorplate');
   });
  }break;
 }
 case 'primary-mag-pouch':
  open(0,.92,-.94,-.22);
  b('dark',0,-.46,.94,.84,.12,.12,'retention-band');
  b('fabric',0,-.84,.96,.72,.10,.08,'lower-reinforcement');
  cell(0,-.18,.52,p=>{
   p('contents',0,-.42,.52,.70,.76,.59,'sample-magazine');
   p('hardware',0,-.075,.52,.76,.11,.64,'floorplate');
  });break;
 case 'shell-holder':
  b('fabric',0,-.49,.18,.96,.67,.29,'backing');
  for(let i=0;i<4;i++){
   const x=(i-1.5)*.23;
   b('dark',x,-.52,.64,.21,.33,.62,'elastic-loop');
   cell(x,-.25,.62,p=>{
    p('accent',x,-.44,.62,.17,.73,.52,'sample-shell');
    p('hardware',x,-.85,.62,.18,.14,.55,'brass-base');
   });
  }break;
 case 'rigid-holster':
  // Stepped angular shell, open mouth and distinct inner channel.
  open(0,.84,-.90,-.30,.90);
  b('dark',-.22,-.70,.92,.37,.42,.12,'molded-rib');
  b('dark',.22,-.45,.92,.32,.30,.12,'retention-shroud');
  b('hardware',.34,-.30,.91,.12,.14,.12,'release-block');
  cell(0,-.25,.50,p=>{
   // Neutral fitting surrogate, not a functional weapon or issued item.
   p('contents',0,-.45,.50,.45,.68,.42,'fit-surrogate');
   p('contents',-.10,-.11,.50,.70,.17,.45,'fit-surrogate-top');
  });break;
 case 'flap-holster':
  closed(0,.84,-.91,-.24,.86);
  b('fabric',0,-.15,.53,.94,.24,.82,'protective-flap-top');
  flap(0,.89,-.31,.36);
  b('dark',0,-.60,.93,.16,.33,.10,'closure-strap');
  cell(0,-.23,.49);break;
 case 'medical-pouch':
  closed(0,.94,-.90,-.15,.89);
  b('dark',0,-.28,.93,.87,.075,.12,'zipper-band');
  b('fabric',0,-.56,.94,.86,.42,.12,'front-pocket');
  b('accent',0,-.54,.995,.28,.10,.01,'mark-horizontal');
  b('accent',0,-.54,.995,.08,.30,.01,'mark-vertical');
  b('hardware',.38,-.25,.95,.10,.12,.10,'pull-tab');
  cell(0,-.20,.52);break;
 case 'radio-holder':
  open(0,.90,-.96,-.43,.91);
  b('dark',0,-.61,.95,.81,.12,.08,'retention');
  cell(0,-.39,.56,p=>{
   p('contents',0,-.53,.55,.70,.69,.56,'radio-body');
   p('dark',.30,-.13,.50,.12,.25,.13,'antenna');
   p('hardware',0,-.34,.86,.53,.11,.08,'display');
   p('dark',-.12,-.45,.86,.33,.06,.08,'controls');
  });break;
 case 'flashlight-holder':
  b('fabric',0,-.49,.14,.79,.55,.22,'backing');
  // The hollow loop is four blocks, not a solid bar through the content.
  for(const s of [-1,1])b('dark',s*.37,-.47,.54,.22,.23,.70,'loop-side');
  b('dark',0,-.47,.87,.84,.23,.16,'loop-front');
  b('dark',0,-.82,.54,.79,.12,.70,'base');
  cell(0,-.21,.54,p=>{
   p('contents',0,-.48,.54,.48,.72,.46,'light-body');
   p('dark',0,-.12,.54,.76,.23,.70,'oversized-head');
   p('hardware',0,-.015,.54,.52,.03,.50,'lens');
  });break;
 case 'restraint-pouch':
  closed(0,.90,-.92,-.19,.81);
  b('fabric',0,-.22,.52,.96,.29,.78,'rounded-case-cap');
  flap(0,.85,-.38,.31);
  break;
 case 'wedge-holder':
  open(0,.91,-.91,-.35,.83);
  for(let i=0;i<2;i++){
   const x=(i-.5)*.40;
   cell(x,-.25,.51,p=>{
    p('accent',x,-.46,.50,.33,.73,.52,'wedge-base');
    p('dark',x,-.18,.50,.24,.17,.36,'wedge-tip');
   });
  }break;
 case 'grenade-pouch':
  open(0,.92,-.94,-.32,.90);
  b('fabric',0,-.47,.94,.88,.22,.12,'retaining-flap');
  b('hardware',0,-.49,.995,.13,.09,.01,'closure');
  cell(0,-.26,.51,p=>{
   p('contents',0,-.48,.51,.62,.70,.59,'sample-canister');
   p('hardware',0,-.12,.51,.47,.15,.49,'cap');
  });break;
 case 'utility-pouch':
  closed(0,.93,-.94,-.17,.89);
  flap(0,.92,-.30,.27);
  b('dark',0,-.69,.94,.72,.12,.09,'compression-band');
  break;
 case 'dump-pouch':
  if(variant==='rolled'){
   closed(0,.94,-.91,-.15,.89);
   for(const x of [-.27,.27])b('dark',x,-.50,.94,.12,.75,.11,'roll-retainer');
  }else{
   open(0,.94,-.94,-.19,.94);
   b('fabric',0,-.75,.97,.74,.25,.06,'folded-front');
   b('dark',0,-.23,.97,.87,.09,.06,'rim');
   for(const x of [-.32,.32])b('fabric',x,-.56,.97,.11,.50,.06,'fabric-fold');
  }break;
 }
 // Sample-less live artwork still exposes all attachment/socket contracts.
 const interactionSocket=new THREE.Object3D();interactionSocket.name='interaction-socket';
 interactionSocket.position.set(0,-H*.10,D*.60);root.add(interactionSocket);
 consolidateVisualGroup(holder);
 return {root,holder,contents,contentSockets,interactionSocket,footprint};
}
export function setAttachmentSampleCount(visual:AttachmentVisual,count:number){
 const n=Number.isFinite(count)?Math.max(0,Math.floor(count)):0;
 visual.contents.forEach((content,index)=>{content.visible=index<n;});
}
/** Reposition a visual without replacing holder or owned content nodes. */
export function placeAttachmentVisual(visual:AttachmentVisual,socket:{x:number;y:number;z:number;yaw:number}){
 visual.root.position.set(socket.x,socket.y,socket.z);visual.root.rotation.y=socket.yaw;
}
