/** WC1: reuse site geometry/material lifecycle, one group per covering. */
import * as THREE from 'three';
import type {WindowOpening} from '../breach-site.ts';
import {normalizeWindowCovering,windowCoveringPieces} from '../breach-window-coverings.ts';
import type {SiteOpeningsHost} from './breach-site-openings-builder.ts';
const palette={linen:0xd4cbb5,sand:0xa99a82,sage:0x879787,slate:0x737f83};
export function buildWindowCovering(opening:WindowOpening,parent:THREE.Group,host:SiteOpeningsHost):THREE.Group|undefined{
 const c=normalizeWindowCovering(opening);if(!c)return;
 const pieces=windowCoveringPieces(opening,c);if(!pieces.length)return;
 const root=new THREE.Group();root.name='window-covering:'+opening.id;
 const surface=c.family==='curtain'||c.family==='roller-shade'?'fabric':'painted-metal';
 const color=palette[c.palette];
 const materials={body:host.solid(color,.91,surface),
  fold:host.solid(new THREE.Color(color).multiplyScalar(.76).getHex(),.93,surface),
  hardware:host.solid(0x68716f,.8,'painted-metal')};
 for(const p of pieces){
  const mesh=host.box(root,p.x,p.y,p.z,p.w,p.h,p.d,materials[p.role],false);
  if(p.yaw!==undefined)mesh.rotation.y=p.yaw;
  mesh.userData.fieldworkDrawFamily='window-covering';
 }
 parent.add(root);return root;
}
