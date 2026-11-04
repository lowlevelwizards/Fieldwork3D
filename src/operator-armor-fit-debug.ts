/** Lab-only visualization of real uniform fit envelopes and armor mounts.
 * Shares the same authoring frame and pure calculations as the game.
 * Never adds colliders, armor stats, render cost in battle or serialized data.
 */
import * as THREE from 'three';
import {armorContactSurface,fittedArmorSurfaces,armorContactSpan,ARMOR_PANEL_DEPTHS}
 from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame} from './operator-armor-attachment-frame.ts';
import {ARMOR_ANATOMY,ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';
import {garmentContactAnchor} from './operator-garment-contact-surface.ts';

export type ArmorFitDebug={
 group:THREE.Group;status:string;warnings:string[];
 clearance:{front:number;back:number;side:number;shoulder:number};
};
const marker=(g:THREE.Group,x:number,y:number,z:number,color:number,size=.58)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),
  new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true,
   opacity:.96}));
 mesh.position.set(x,y,z);mesh.renderOrder=1000;g.add(mesh);
};
export function createArmorFitDebug(style:string,top:string):ArmorFitDebug{
 const group=new THREE.Group();
 group.name='lab-armor-fit-debug';
 const shoulderContact=garmentContactAnchor(top,5.2);
 const nominal=ARMOR_PROFILES[style]??ARMOR_PROFILES['armor-bare'];
 const fit=fittedArmorSurfaces(style,top,nominal);
 const frame=armorAttachmentFrame(style,top);
 const depth=ARMOR_PANEL_DEPTHS[style]??0;
 const surface=armorContactSpan(top,-3.8,4);
 const spec=ARMOR_PROPORTIONS[style];
 const side=spec?armorSideLayout(fit,spec):null;
 const concealed=style==='soft-slick'||style==='soft-paca';
 const clearance={
  front:concealed?0:fit.front-depth-surface.front,
  back:concealed?0:surface.back-(fit.back+depth),
  side:concealed?0:side?
   side.centerZ-side.sideHalfThickness-side.garmentSide:0,
  shoulder:fit.shoulderY-shoulderContact.topY-
   (spec?.strapThickness??.6)*.5
 };
 const warnings:string[]=[];
 if(!concealed){
  if(clearance.front<.075)warnings.push('front bag intersects uniform');
  if(clearance.back<.075)warnings.push('rear bag intersects uniform');
  if(clearance.side<.075)warnings.push('side closure intersects uniform');
  if(clearance.shoulder<-.16||clearance.shoulder>.35)
   warnings.push('shoulder contact gap outside acceptable overlap');
 }
 const wirePoints:THREE.Vector3[]=[];
 for(const y of [-5,-2,1,4,5.2]){
  const r=armorContactSurface(top,y);
  const rect=[
   new THREE.Vector3(r.front,r.y,-r.side),
   new THREE.Vector3(r.front,r.y,r.side),
   new THREE.Vector3(r.back,r.y,r.side),
   new THREE.Vector3(r.back,r.y,-r.side)
  ];
  for(let i=0;i<rect.length;i++){
   wirePoints.push(rect[i],rect[(i+1)%rect.length]);
  }
 }
 const wire=new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(wirePoints),
  new THREE.LineBasicMaterial({color:0xa8d2b9,depthTest:false,
   transparent:true,opacity:.86}));
 wire.renderOrder=999;group.add(wire);
 // Three anatomical rails make vest placement auditable against the
 // mannequin instead of relying on an all-green clearance status.
 const landmarkPts:THREE.Vector3[]=[];
 for(const y of [ARMOR_ANATOMY.upperSternum,
  ARMOR_ANATOMY.lowerRibs,ARMOR_ANATOMY.waist]){
  landmarkPts.push(
   new THREE.Vector3(fit.front+.75,y,-3.8),
   new THREE.Vector3(fit.front+.75,y,3.8));
 }
 const anatomyRails=new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(landmarkPts),
  new THREE.LineBasicMaterial({color:0xe4c08c,depthTest:false,
   transparent:true,opacity:.82}));
 anatomyRails.name='r4-anatomical-reference-rails';
 anatomyRails.renderOrder=999;group.add(anatomyRails);
 // Actual matching contact pairs: cyan = SHIRT SURFACE, yellow =
 // inner armor face. These points derive from the rendered garment model,
 // not the old aspirational blouse fit envelope. A connector shows the gap.
 if(!concealed&&spec){
  const contacts:readonly (readonly [THREE.Vector3,THREE.Vector3])[]=[
   ...[-2.75,2.75].flatMap(z=>[
    [new THREE.Vector3(surface.front,0,z),
     new THREE.Vector3(fit.front-depth,0,z)],
    [new THREE.Vector3(surface.back,0,z),
     new THREE.Vector3(fit.back+depth,0,z)]
   ] as [THREE.Vector3,THREE.Vector3][]),
   ...[-1,1].flatMap(sign=>[
    [new THREE.Vector3(0,spec.sideY,sign*(side?.garmentSide??0)),
     new THREE.Vector3(0,spec.sideY,sign*
      ((side?.centerZ??0)-(side?.sideHalfThickness??0)))],
    [new THREE.Vector3(0,shoulderContact.topY,sign*fit.shoulderZ),
     new THREE.Vector3(0,fit.shoulderY-spec.strapThickness*.5,
      sign*fit.shoulderZ)]
   ] as [THREE.Vector3,THREE.Vector3][])
  ];
  const segments:THREE.Vector3[]=[];
  for(const [garment,armor] of contacts){
   marker(group,garment.x,garment.y,garment.z,0x6eddd0,.24);
   marker(group,armor.x,armor.y,armor.z,0xebc68b,.24);
   segments.push(garment,armor);
  }
  const matching=new THREE.LineSegments(
   new THREE.BufferGeometry().setFromPoints(segments),
   new THREE.LineBasicMaterial({color:warnings.length?0xe78c6e:
    0xb2da9c,depthTest:false}));
  matching.name='r7-real-garment-to-armor-contact-pairs';
  matching.renderOrder=1001;group.add(matching);
 }
 const markerColor=warnings.length?0xe78c6e:0xe6c88a;
 for(const z of [-3.15,3.15]){
  marker(group,frame.front.x,1.4,z,markerColor);
  marker(group,frame.back.x,1.4,z,markerColor);
 }
 for(const sign of [-1,1]){
  marker(group,0,-1.25,sign*fit.side,markerColor);
  marker(group,0,fit.shoulderY,sign*fit.shoulderZ,0x83e1d9,.70);
 }
 const status=concealed?'CONCEALED: beneath uniform shell':
  warnings.length?'FIT WARNINGS: '+warnings.join(' · '):
   'FIT OK · front '+clearance.front.toFixed(2)+
   ' · side '+clearance.side.toFixed(2)+
   ' · shoulder '+clearance.shoulder.toFixed(2);
 const target=ARMOR_PROPORTIONS[style];
 return {group,status:status+(target?
  ' · authored width '+target.width.toFixed(1):''),warnings,clearance};
}
export function disposeArmorFitDebug(group:THREE.Group):void{
 group.traverse(obj=>{
  if(obj instanceof THREE.LineSegments||obj instanceof THREE.Mesh){
   obj.geometry.dispose();
   if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());
   else obj.material.dispose();
  }
 });
 group.parent?.remove(group);
 group.clear();
}
