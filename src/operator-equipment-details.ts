/** OV-08–10 / OV-12: legible miniature props mounted on the *existing*
 * equipped containers. No new gameplay inventory, collision or hand sockets. */
import * as THREE from 'three';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

type ToolType='utility-light'|'utility-breach'|'utility-pry'|'utility-cutter'|'utility-wedge';
export type OperatorEquipmentDetails={
 tools:Record<ToolType,THREE.Group>;
 medicalMark:THREE.Group;radioTrim:THREE.Group;flashHardware:THREE.Group;
};
const box=(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const obj=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;
 parent.add(obj);return obj;
};
const cylinder=(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,rad:number,length:number,sides=7)=>{
 const obj=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,length,sides),m);
 obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;
 parent.add(obj);return obj;
};
const group=(parent:THREE.Object3D)=>{
 const g=new THREE.Group();parent.add(g);return g;
};
export function createOperatorEquipmentDetails(medical:THREE.Mesh,
 radio:THREE.Mesh,flash:THREE.Mesh,tool:THREE.Mesh,
 fabric:THREE.Material,dark:THREE.Material,steel:THREE.Material):OperatorEquipmentDetails{
 const mark=new THREE.MeshStandardMaterial({color:0xc2bb9d,roughness:1,flatShading:true});
 const red=new THREE.MeshStandardMaterial({color:0x986959,roughness:1,flatShading:true});
 const medicalMark=group(medical);
 // A visible fabric first-aid patch, deliberately made of chunky pixels.
 box(medicalMark,mark,1.75,0,0,.2,2.4,2.5);
 box(medicalMark,red,1.9,0,0,.25,1.65,.46);
 box(medicalMark,red,1.9,0,0,.25,.46,1.65);
 box(medicalMark,dark,1.65,1.65,0,.45,.38,3.0);
 const radioTrim=group(radio);
 cylinder(radioTrim,dark,-.45,4.1,0,.33,6.5,6);
 box(radioTrim,mark,1.85,1.15,0,.2,1.2,1.5);
 box(radioTrim,dark,1.9,-1.25,0,.25,.8,1.8);
 const flashHardware=group(flash);
 cylinder(flashHardware,dark,0,2.8,0,1.45,.75,8);
 box(flashHardware,mark,0,3.35,0,2.5,.45,.45);
 box(flashHardware,dark,0,2.15,1.2,.65,2.1,.35);
 const tools={
  'utility-light':group(tool),
  'utility-breach':group(tool),
  'utility-pry':group(tool),
  'utility-cutter':group(tool),
  'utility-wedge':group(tool)
 } satisfies Record<ToolType,THREE.Group>;
 // A short flashlight with a readable lens.
 const light=cylinder(tools['utility-light'],dark,0,0,0,1.1,6.2);
 light.rotation.z=Math.PI/2;
 const lens=cylinder(tools['utility-light'],mark,3.25,0,0,1.15,.6);
 lens.rotation.z=Math.PI/2;
 // Ram: sturdy short steel body and two side grips.
 const ram=cylinder(tools['utility-breach'],steel,0,0,0,1.25,11,7);
 ram.rotation.z=Math.PI/2;
 for(const x of [-2.6,2.6])
  box(tools['utility-breach'],dark,x,2.1,0,.8,3.7,1.0);
 box(tools['utility-breach'],dark,5.6,0,0,.85,3.15,3.15);
 // Pry bar: long steel shaft with a distinct hooked jaw.
 box(tools['utility-pry'],steel,0,0,0,10.5,.9,.85);
 box(tools['utility-pry'],steel,5.0,.8,0,.9,2.2,1.1);
 box(tools['utility-pry'],dark,-3.0,0,0,3,.98,.98);
 // Bolt cutters: paired handles and separated angular jaws.
 for(const z of [-.9,.9]){
  const handle=box(tools['utility-cutter'],dark,-2.6,-.6,z,7,.8,.8);
  handle.rotation.y=z>0?-.10:.10;
  const jaw=box(tools['utility-cutter'],steel,2.0,.2,z*.48,4.4,.8,.8);
  jaw.rotation.y=z>0?-.24:.24;
 }
 box(tools['utility-cutter'],steel,1,0,0,1.4,1.8,1.4);
 // A pair of small wedge-shaped modules, strapped as a single package.
 for(const z of [-.9,.9]){
  const wedge=box(tools['utility-wedge'],fabric,0,0,z,4.0,1.4,1.2);
  wedge.rotation.z=-.16;
 }
 for(const g of [medicalMark,radioTrim,flashHardware,...Object.values(tools)])
  consolidateVisualGroup(g);
 for(const g of Object.values(tools))g.visible=false;
 return {tools,medicalMark,radioTrim,flashHardware};
}
export function updateOperatorEquipmentDetails(
 d:OperatorEquipmentDetails,slots:EquipmentLoadout['slots']|undefined){
 const chosen=slots?.utility??'utility-radio';
 for(const [id,obj] of Object.entries(d.tools))obj.visible=chosen===id;
 d.medicalMark.visible=slots?.medical==='medical-basic'||
  slots?.medical==='medical-trauma'||!slots;
 d.radioTrim.visible=chosen==='utility-radio';
 d.flashHardware.visible=slots?.tactical==='tactical-flash'||!slots;
}
