/** WC4: stable mesh slots; no geometry/material allocations during motion. */
import * as THREE from 'three';
import type {WindowOpening} from '../breach-site.ts';
import {normalizeWindowCovering,windowCoveringPieces,type WindowCovering,type CoveringPiece} from '../breach-window-coverings.ts';
import type {SiteOpeningsHost} from './breach-site-openings-builder.ts';
const palette={linen:0xd4cbb5,sand:0xa99a82,sage:0x879787,slate:0x737f83};
type Slot={mesh:THREE.Mesh;piece:CoveringPiece};
type Visual={slots:Slot[];opening:WindowOpening;lastOpening:number;lastTilt:number;lastSide:number;family:WindowCovering['family'];hidden:boolean};
const visuals=new WeakMap<THREE.Object3D,Visual>();
export function syncWindowCoveringVisual(root:THREE.Object3D,c:WindowCovering|undefined,motion?:{opening:number;tilt:number}|null):void{
 const visual=visuals.get(root);if(!visual)return;
 if(!c||c.integrity===0||c.family!==visual.family){
  if(!visual.hidden)for(const slot of visual.slots)slot.mesh.visible=false;
  visual.hidden=true;return;
 }
 const opening=motion?.opening??c.opening,tilt=motion?.tilt??Number(!!c.tilted);
 if(!visual.hidden&&visual.lastOpening===opening&&visual.lastTilt===tilt&&visual.lastSide===c.side)return;
 visual.hidden=false;visual.lastOpening=opening;visual.lastTilt=tilt;visual.lastSide=c.side;
 const pieces=windowCoveringPieces(visual.opening,c,opening,tilt);
 for(let i=0;i<visual.slots.length;i++){
  const {mesh,piece:base}=visual.slots[i],p=pieces[i];
  mesh.visible=!!p;if(!p)continue;
  mesh.position.set(p.x,p.y,p.z);mesh.scale.set(p.w/base.w,p.h/base.h,p.d/base.d);
  mesh.rotation.y=p.yaw??0;mesh.updateMatrix();
 }
}
export function buildWindowCovering(opening:WindowOpening,parent:THREE.Group,host:SiteOpeningsHost):THREE.Group|undefined{
 const c=normalizeWindowCovering(opening);if(!c)return;
 const pieces=windowCoveringPieces(opening,{...c,integrity:1},0,0);if(!pieces.length)return;
 const root=new THREE.Group();root.name='window-covering:'+opening.id;
 const surface=c.family==='curtain'||c.family==='roller-shade'?'fabric':c.family==='hinged-shutter'?'painted-wood':'painted-metal';
 const color=palette[c.palette];
 const materials={body:host.solid(color,.91,surface),
  fold:host.solid(new THREE.Color(color).multiplyScalar(.76).getHex(),.93,surface),
  hardware:host.solid(0x68716f,.8,'painted-metal')};
 const slots:Slot[]=[];
 for(const p of pieces){
  const mesh=host.box(root,p.x,p.y,p.z,p.w,p.h,p.d,materials[p.role],false);
  mesh.userData.fieldworkDrawFamily='window-covering';slots.push({mesh,piece:p});
 }
 visuals.set(root,{slots,opening,lastOpening:-1,lastTilt:-1,lastSide:0,family:c.family,hidden:false});
 syncWindowCoveringVisual(root,c);
 parent.add(root);return root;
}
