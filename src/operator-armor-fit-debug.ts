/** Lab-only visualization of real uniform fit envelopes and armor mounts.
 * Shares the same authoring frame and pure calculations as the game.
 * Never adds colliders, armor stats, render cost in battle or serialized data.
 */
import * as THREE from 'three';
import {uniformFitEnvelope,fittedArmorSurfaces,ARMOR_PANEL_DEPTHS}
 from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame} from './operator-armor-attachment-frame.ts';

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
 const env=uniformFitEnvelope(top);
 const nominal=ARMOR_PROFILES[style]??ARMOR_PROFILES['armor-bare'];
 const fit=fittedArmorSurfaces(style,top,nominal);
 const frame=armorAttachmentFrame(style,top);
 const depth=ARMOR_PANEL_DEPTHS[style]??0;
 const sampleY=[-3,0,3.6];
 const outer=sampleY.map(y=>env.outer(y));
 const front=Math.max(...outer.map(x=>x.front));
 const back=Math.min(...outer.map(x=>x.back));
 const side=Math.max(...outer.map(x=>x.side));
 const concealed=style==='soft-slick'||style==='soft-paca';
 const clearance={
  front:concealed?0:fit.front-depth-(front+env.frontOverhang),
  back:concealed?0:-fit.back-depth+back,
  side:concealed?0:fit.side-side,
  shoulder:fit.shoulderY-env.shoulderCrown
 };
 const warnings:string[]=[];
 if(!concealed){
  if(clearance.front<.12)warnings.push('front bag intersects uniform');
  if(clearance.back<.12)warnings.push('rear bag intersects uniform');
  if(clearance.side<.12)warnings.push('side closure intersects uniform');
  if(clearance.shoulder<.30)warnings.push('straps fall below shoulder crown');
 }
 const wirePoints:THREE.Vector3[]=[];
 for(const r of env.rings){
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
 return {group,status,warnings,clearance};
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
