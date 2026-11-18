/** Door hardware remains separate from the rigid leaf compiler so the
 * intact handle can disappear on the exact confirmed latch failure frame.
 * The detached cluster is a small display-only object under the fixed
 * frame root. No new collision bodies or per-frame geometry allocations.
 */
import * as THREE from 'three';

export type BrokenDoorHardwareVisual={
 intactHardware:THREE.Group;fallenHardware:THREE.Group;
};
type Box=(parent:THREE.Object3D,x:number,y:number,z:number,
 w:number,h:number,d:number,material:THREE.Material,cast?:boolean)=>THREE.Mesh;

export function buildDoorHardwareVisual(
 root:THREE.Group,leaf:THREE.Group,
 length:number,hinge:'a'|'b'|undefined,thickness:number,
 metal:THREE.Material,box:Box
):BrokenDoorHardwareVisual{
 const intactHardware=new THREE.Group();
 intactHardware.name='intact-door-handle';
 leaf.add(intactHardware);
 const sign=hinge==='b'?-1:1;
 const hx=sign*length*.70;
 for(const face of [-1,1]){
  const z=face*(thickness/2+1.05);
  box(intactHardware,hx,18,z,3,5,1.9,metal,false);
  box(intactHardware,hx-sign*2,18,z*1.12,4,1.4,1.6,metal,false);
  box(intactHardware,hx,13,z,1,1.3,1.7,metal,false);
 }
 const fallenHardware=new THREE.Group();
 fallenHardware.name='broken-door-latch-on-floor';
 fallenHardware.visible=false;
 root.add(fallenHardware);
 // Low-poly handle assembly: two levers, lock plate and loose bolt.
 box(fallenHardware,0,0,0,3.8,4.5,2.3,metal,false);
 box(fallenHardware,-3,0,0,6.8,1.5,1.5,metal,false);
 box(fallenHardware,2,-1.7,1.2,3.2,1.2,1.8,metal,false);
 return {intactHardware,fallenHardware};
}
