/** H1-D modular tactical helmet components in canonical -Z head space.
 * All groups are constructed once and visibility-only thereafter.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {bakeGearGeometryAO,enableBakedGearAO} from './operator-baked-gear-ao.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {helmetMountSockets,HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {isH1ModernHelmet,type HelmetSetupV1} from './operator-helmet-setup-policy.ts';
type ModuleGroups=Record<string,THREE.Group>;
export type HelmetHardwareLayers={
 shrouds:ModuleGroups;rails:ModuleGroups;nvg:ModuleGroups;
 rears:ModuleGroups;lights:ModuleGroups;
 retention:ModuleGroups;railEars:THREE.Group;strobe:THREE.Group;
};
const hidden=(parent:THREE.Group)=>{const g=new THREE.Group();
 g.visible=false;parent.add(g);return g;};
export function createHelmetHardware(parent:THREE.Group,shell:string):HelmetHardwareLayers{
 if(!isH1ModernHelmet(shell))throw Error('unsupported H1 hardware '+shell);
 const sockets=helmetMountSockets(shell);
 if(!sockets)throw Error('missing helmet sockets '+shell);
 const p=HELMET_MOUNT_PROFILES[shell];
 const dark=new THREE.MeshStandardMaterial({color:0x292f2d,flatShading:true,roughness:.91});
 const hardware=new THREE.MeshStandardMaterial({color:0x4e574e,flatShading:true,roughness:.86});
 const lens=new THREE.MeshStandardMaterial({color:0x314a47,flatShading:true,roughness:.49});
 for(const m of [dark,hardware,lens])enableBakedGearAO(m);
 const add=(g:THREE.Group,m:THREE.Material,
  x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
  bakeGearGeometryAO(geometry,m);
  const mesh=new THREE.Mesh(geometry,m);
  mesh.position.set(x,y,z);mesh.castShadow=true;g.add(mesh);
  return mesh;
 };
 const shrouds:ModuleGroups={},rails:ModuleGroups={},nvg:ModuleGroups={},
  rears:ModuleGroups={},lights:ModuleGroups={},retention:ModuleGroups={};
 const front=sockets.frontShroud.position,rear=sockets.rearCenter.position;
 for(const id of ['legacy','skeleton','integrated']){
  const g=hidden(parent);shrouds[id]=g;
  if(id==='skeleton'){
   add(g,hardware,front[0]-1.17,front[1],front[2]-.18,.55,1.72,.68);
   add(g,hardware,front[0]+1.17,front[1],front[2]-.18,.55,1.72,.68);
   add(g,hardware,0,front[1]+.62,front[2]-.18,2.7,.50,.68);
   add(g,dark,0,front[1]-.44,front[2]-.42,1.10,.52,.48);
  }else{
   add(g,hardware,0,front[1],front[2]-.13,id==='legacy'?2.20:2.55,
    id==='legacy'?1.36:1.62,.62);
   add(g,dark,0,front[1]-.34,front[2]-.48,1.16,.62,.37);
  }
 }
 for(const id of ['arc','powerpath']){
  const g=hidden(parent);rails[id]=g;
  for(const sign of [-1,1]){
   const x=sign*(p.side+.36),y=p.ear+.95;
   add(g,hardware,x,y,-.10,.68,.74,4.75);
   add(g,dark,x+sign*.04,y+.26,-1.22,.72,.35,1.35);
   add(g,dark,x+sign*.04,y+.26,1.18,.72,.35,1.15);
   if(id==='powerpath')add(g,dark,x+sign*.19,y-.20,.12,.44,.38,3.55);
  }
 }
 for(const id of ['mono-stowed','dual-stowed','dual-lowered']){
  const g=hidden(parent);nvg[id]=g;
  const lowered=id==='dual-lowered';
  const y=front[1]+(lowered?-1.52:1.18),z=front[2]-(lowered?2.28:1.25);
  add(g,hardware,0,front[1]+.28,front[2]-.84,.75,.64,1.72);
  add(g,dark,0,y,z,1.04,.75,.96);
  const count=id==='mono-stowed'?1:2;
  for(let i=0;i<count;i++){
   const x=count===1?0:(i===0?-1.05:1.05);
   add(g,dark,x,y-.26,z-.35,.98,1.05,1.55);
   add(g,lens,x,y-.30,z-1.16,.78,.76,.22);
  }
 }
 for(const id of ['counterweight','battery']){
  const g=hidden(parent);rears[id]=g;
  add(g,id==='counterweight'?dark:hardware,0,rear[1],rear[2]+.18,
   id==='counterweight'?3.45:3.16,id==='counterweight'?1.40:1.75,.84);
  if(id==='battery')add(g,dark,0,rear[1]+.50,rear[2]+.70,2.6,.36,.35);
 }
 for(const id of ['left','right']){
  const g=hidden(parent);lights[id]=g;
  const pos=sockets[id==='left'?'lightLeft':'lightRight'].position;
  add(g,hardware,pos[0],pos[1],pos[2],.85,.88,1.55);
  add(g,lens,pos[0],pos[1],pos[2]-1.00,.70,.66,.37);
 }
 for(const id of ['four-point','h-nape','dial']){
  const g=hidden(parent);retention[id]=g;
  for(const sign of [-1,1]){
   const x=sign*4.45;
   add(g,dark,x,3.10,2.05,.32,3.12,.48);
   add(g,hardware,x*.65,1.65,1.57,2.05,.34,.52);
  }
  add(g,dark,0,1.45,1.5,2.65,.42,.55);
  if(id==='h-nape'||id==='dial')
   add(g,hardware,0,3.55,p.rear+.16,3.0,.82,.58);
  if(id==='dial')add(g,dark,0,3.55,p.rear+.55,1.27,1.15,.4);
 }
 const railEars=hidden(parent);
 for(const sign of [-1,1]){
  const x=sign*4.70;
  add(railEars,hardware,sign*(p.side+.58),p.ear+.10,.2,.63,1.65,.60);
  add(railEars,dark,x,3.45,.55,1.35,2.75,2.55);
  add(railEars,hardware,x,3.45,.25,.48,1.78,1.74);
 }
 // Optional microphone is authored and toggled under the rail-ear assembly.
 const microphone=hidden(railEars);
 add(microphone,dark,4.75,2.50,-1.70,.38,.42,3.10);
 add(microphone,hardware,4.75,2.42,-3.40,.78,.58,.85);
 microphone.userData.helmetBoom=true;
 const strobe=hidden(parent);
 add(strobe,hardware,0,p.top+.12,p.rear-1.12,1.6,.52,1.25);
 add(strobe,lens,0,p.top+.45,p.rear-1.12,1.28,.20,.91);
 // Only static meshes inside each mutually-exclusive group are merged.
 for(const group of [
  ...Object.values(shrouds),...Object.values(rails),...Object.values(nvg),
  ...Object.values(rears),...Object.values(lights),
  ...Object.values(retention),railEars,strobe
 ])consolidateVisualGroup(group);
 return {shrouds,rails,nvg,rears,lights,retention,railEars,strobe};
}
export function updateHelmetHardware(v:HelmetHardwareLayers,
 setup:HelmetSetupV1,headset:string):void{
 for(const [id,g] of Object.entries(v.shrouds))g.visible=setup.shroud===id;
 for(const [id,g] of Object.entries(v.rails))g.visible=setup.rails===id;
 for(const [id,g] of Object.entries(v.nvg))g.visible=setup.nvg===id;
 for(const [id,g] of Object.entries(v.rears))g.visible=setup.rearModule===id;
 for(const [id,g] of Object.entries(v.lights))g.visible=setup.light===id;
 for(const [id,g] of Object.entries(v.retention))g.visible=setup.retention===id;
 v.strobe.visible=setup.rearStrobe;
 v.railEars.visible=setup.headsetMount==='rail'&&setup.rails!=='none'&&
  ['over-ear','boom-headset','helmet-ears'].includes(headset);
 const mic=v.railEars.children.find(x=>x instanceof THREE.Group&&x.userData.helmetBoom);
 if(mic)mic.visible=v.railEars.visible&&headset==='boom-headset';
}
