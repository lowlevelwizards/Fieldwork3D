/** L1.5 distinctive compact monocular NVG: mount, hinge, objective and eyepiece.
 * Models are built once per helmet shell, never per animation frame.
 * -Z is forward in the canonical helmet attachment system.
 */
import * as THREE from 'three';
import type {FieldHelmet} from './operator-helmet-field-policy.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
const block=(g:THREE.Group,name:string,mat:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);
};
export function buildMountedNvg(g:THREE.Group,shell:FieldHelmet,
 deployed:boolean,dark:THREE.Material,metal:THREE.Material,
 glass:THREE.Material):void{
 const profile=HELMET_MOUNT_PROFILES[shell];
 const a=new THREE.Group();
 a.name=deployed?'nvg-optic-deployed':'nvg-optic-raised';
 // The central articulated arm is placed in front of the actual shroud,
 // rather than levitating over an arbitrary eyebrow/bone offset.
 a.position.set(0,profile.top-2.65,profile.front-.55);
 g.add(a);
 block(a,'helmet-nvg-socket',metal,0,0,-.35,1.75,1.05,.95);
 block(a,'nvg-hinge',dark,0,-.60,-1.08,1.15,1.55,.8);
 const optical=new THREE.Group();
 optical.name='nvg-flip-arm';a.add(optical);
 if(deployed)optical.position.set(0,-2.7,-1.55);
 else{
  optical.position.set(0,.65,-1.2);
  optical.rotation.x=-1.03;
 }
 block(optical,'nvg-offset-bridge',metal,0,0,-1.1,1.45,.65,2.25);
 block(optical,'nvg-monocular-housing',dark,-.75,-.15,-2.15,1.55,1.65,2.65);
 block(optical,'nvg-focus-ring',metal,-.75,-.15,-3.47,1.70,1.72,.33);
 block(optical,'nvg-front-objective',glass,-.75,-.15,-3.68,1.17,1.13,.12);
 block(optical,'nvg-eyepiece',glass,-.75,-.15,-.78,1.05,1.05,.12);
 a.userData.l15FunctionalNvg=true;
}
