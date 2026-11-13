/** H9.7 — art-specific ACH/MICH field accessories.
 * All parts are static and mounted on real cover frames; these are
 * intentionally distinct low-poly silhouettes, not reused placeholder boxes.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type CoverRegion} from './operator-helmet-surface.ts';

export type HelmetFieldAddon='strobe'|'counterweight'|'battery'|
 'light'|'camera'|'chemlight';
export type FieldAddonPalette={
 dark:THREE.Material;metal:THREE.Material;
 cloth:THREE.Material;reflect:THREE.Material;
};
const contour=(xy:readonly (readonly number[])[]):THREE.Shape=>{
 const s=new THREE.Shape();
 xy.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 s.closePath();return s;
};
const silhouette=(g:THREE.Group,name:string,material:THREE.Material,
 xy:readonly (readonly number[])[],thickness:number,front=0)=>{
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(contour(xy),{
  depth:thickness,steps:1,bevelEnabled:false
 }),material);
 mesh.name=name;mesh.position.z=front;
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const block=(g:THREE.Group,name:string,mat:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const cylinder=(g:THREE.Group,name:string,mat:THREE.Material,
 x:number,y:number,z:number,r:number,len:number,axis:'x'|'y'|'z'='z')=>{
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),mat);
 mesh.name=name;mesh.position.set(x,y,z);
 if(axis==='z')mesh.rotation.x=Math.PI/2;
 if(axis==='x')mesh.rotation.z=Math.PI/2;
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const mount=(shell:AchMichCoverShell,g:THREE.Group,
 region:CoverRegion,u:number,v:number)=>{
 for(const uu of [u,u*.86,u*.7])
  for(const vv of [v,v+.12,v-.12,.24]){
   const f=sampleHelmetCover(shell,region,uu,vv,.19);
   if(!f)continue;
   const anchor=new THREE.Group();
   anchor.name='helmet-addon-fitted-socket';
   anchor.position.copy(f.position);
   anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4()
    .makeBasis(f.right,f.up,f.normal));
   g.add(anchor);
   anchor.userData.h9RealCoverNormal=f.normal.toArray();
   anchor.userData.h9Shell= shell;
   return anchor;
  }
 throw Error('H9.7 unable to attach '+region+' on '+shell);
};
function strobe(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'crown',0,.67);
 const base=[[-.76,-.42],[.76,-.42],[.98,-.12],
  [.89,.39],[.58,.57],[-.58,.57],[-.89,.39],[-.98,-.12]];
 silhouette(a,'manta-curved-base',p.dark,base,.19);
 silhouette(a,'low-profile-shielded-emitter',p.metal,[
  [-.61,-.20],[.61,-.20],[.76,.09],[.58,.39],
  [-.58,.39],[-.76,.09]
 ],.24,.18);
 silhouette(a,'manta-diffuser-window',p.reflect,[
  [-.42,-.10],[.42,-.10],[.55,.12],[.39,.23],
  [-.39,.23],[-.55,.12]
 ],.075,.43);
 for(const x of [-.73,.73])
  block(a,'strobe-shell-retention-tab',p.cloth,x,-.18,.21,.18,.34,.23);
 a.userData.h9Distinctive='manta-wide-emitter';
}
function counterweight(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'back',-.47,.12);
 const bag=[[-1.58,.59],[1.58,.59],[1.76,.30],
  [1.64,-.73],[1.26,-.92],[-1.26,-.92],[-1.64,-.73],[-1.76,.30]];
 silhouette(a,'rear-counterweight-textile-pouch',p.cloth,bag,.38);
 silhouette(a,'overlapping-counterweight-flap',p.dark,[
  [-1.56,.53],[1.56,.53],[1.45,.22],[-1.45,.22]
 ],.075,.40);
 for(const x of [-.89,0,.89])
  block(a,'individual-weight-compartment',p.dark,x,-.38,.42,.73,.79,.12);
 for(const x of [-1.26,1.26])
  block(a,'counterweight-strap-anchor',p.metal,x,.19,.47,.25,.54,.13);
 a.userData.h9Distinctive='segmented-weight-pouch';
}
function battery(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'back',.62,.23);
 silhouette(a,'facet-backed-helmet-battery',p.dark,[
  [-.87,.62],[.69,.62],[.94,.40],[.94,-.53],
  [.68,-.71],[-.87,-.71],[-1.03,-.45],[-1.03,.39]
 ],.57);
 silhouette(a,'raised-battery-lid',p.metal,[
  [-.72,.48],[.59,.48],[.76,.28],[.76,-.40],
  [.52,-.57],[-.72,-.57],[-.85,-.35],[-.85,.26]
 ],.12,.60);
 block(a,'battery-large-closure-latch',p.dark,0,.48,.77,.63,.25,.15);
 cylinder(a,'battery-cable-port',p.reflect,.76,-.23,.71,.20,.18);
 a.userData.h9Distinctive='rear-power-hardcase';
}
function light(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'left',-.66,.38);
 block(a,'mlps-rail-mount',p.dark,0,0,.22,.84,.57,.34);
 // Three short faceted neck links make the bend readable at small scale.
 const neck=[[-.16,.18,.52],[-.34,.36,.73],[-.58,.50,.89]];
 for(const [i,[x,y,z]] of neck.entries())
  block(a,'lamp-flex-neck-'+i,p.cloth,x,y,z,.22,.19,.45);
 const lamp=new THREE.Group();lamp.name='articulated-task-lamp';
 lamp.position.set(-.78,.53,1.02);lamp.rotation.y=-Math.PI/2;
 a.add(lamp);
 cylinder(lamp,'faceted-lamp-barrel',p.dark,0,0,.04,.37,.82,'z');
 cylinder(lamp,'forward-white-lens',p.reflect,0,0,.50,.29,.12,'z');
 cylinder(lamp,'large-lamp-retention-ring',p.metal,0,0,.39,.39,.11,'z');
 a.userData.h9Distinctive='angled-flex-neck-lamp';
}
function camera(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'right',-.35,.46);
 // Right-side bracket looks forward, not out through the operator's ear.
 const body=new THREE.Group();
 body.name='forward-facing-action-camera-mount';
 body.rotation.y=Math.PI/2;body.position.z=.18;a.add(body);
 block(body,'rail-camera-adapter',p.metal,0,0,.25,.56,.67,.46);
 block(body,'camera-off-axis-articulation',p.dark,.27,.02,.53,.58,.43,.41);
 silhouette(body,'action-camera-faceted-housing',p.dark,[
  [-.86,.52],[.79,.52],[.94,.31],[.94,-.45],
  [.63,-.64],[-.70,-.64],[-.94,-.36],[-.94,.31]
 ],.63,.67);
 cylinder(body,'camera-large-round-optic',p.metal,.33,.02,1.35,.37,.19);
 cylinder(body,'camera-dark-lens-glass',p.dark,.33,.02,1.47,.27,.11);
 block(body,'camera-large-status-window',p.reflect,-.47,.21,1.33,.35,.22,.07);
 a.userData.h9Distinctive='large-lens-action-camera';
}
function chemlight(shell:AchMichCoverShell,g:THREE.Group,p:FieldAddonPalette){
 const a=mount(shell,g,'right',.47,.47);
 cylinder(a,'round-contained-chemlight',p.reflect,0,0,.33,.24,2.55,'x');
 for(const x of [-1.05,1.05]){
  cylinder(a,'chemlight-molded-end-cap',p.dark,x,0,.34,.30,.24,'x');
  block(a,'chemlight-elastic-retainer',p.cloth,x*.70,0,.20,.22,.44,.18);
 }
 a.userData.h9Distinctive='capped-secured-lightstick';
}
export function addAchMichFieldAddon(
 shell:AchMichCoverShell,type:HelmetFieldAddon,g:THREE.Group,
 palette:FieldAddonPalette
):void{
 if(type==='strobe')strobe(shell,g,palette);
 else if(type==='counterweight')counterweight(shell,g,palette);
 else if(type==='battery')battery(shell,g,palette);
 else if(type==='light')light(shell,g,palette);
 else if(type==='camera')camera(shell,g,palette);
 else chemlight(shell,g,palette);
 // H9 close-up acceptance: at ordinary Studio zoom the original
 // reference geometry was too small to identify. Enlarge the distinct
 // silhouettes while preserving their authored attachment point and
 // outward surface orientation (never scale the helmet itself).
 const sizes:Record<HelmetFieldAddon,number>={
  strobe:1.77,counterweight:1.48,battery:1.60,
  light:1.76,camera:1.67,chemlight:1.82
 };
 const anchor=g.children.find(o=>o.name==='helmet-addon-fitted-socket');
 if(anchor)anchor.scale.setScalar(sizes[type]);
 g.userData.h9AddonGraphicScale=sizes[type];
 g.userData.h9SpecificAddon=type;
 g.userData.h9SurfaceFitted=true;
}
