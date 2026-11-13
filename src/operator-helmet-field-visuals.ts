/** H7 field kit, prebuilt once per approved shell. No simulated payload,
 * hitbox, light, camera, weapon or gameplay capability is added.
 * Conservative PASGT models never grow modern side rails.
 */
import * as THREE from 'three';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {isFieldHelmet,resolveHelmetField,resolveHelmetFieldColor,
 type FieldHelmet} from './operator-helmet-field-policy.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {addAchMichConcealment} from './operator-helmet-field-concealment.ts';
import {createAchMichFieldNetGeometry} from './operator-helmet-field-net.ts';
import {addAchMichThreeHoleShroud} from './operator-helmet-field-shroud.ts';
import {createD2GoggleFieldPose} from './operator-d2-goggle-visuals.ts';
export type HelmetFieldLayers={
 shell:FieldHelmet;modules:Record<string,THREE.Group>;
 bandMaterial:THREE.MeshStandardMaterial;webbingMaterial:THREE.MeshStandardMaterial;
 leaves:THREE.Group;root:THREE.Group;
};
const mat=(hex:number)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide
});
const box=(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number,rz=0)=>{
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.name=name;
 o.position.set(x,y,z);o.rotation.z=rz;o.castShadow=false;o.receiveShadow=false;
 g.add(o);return o;
};
const segment=(g:THREE.Group,m:THREE.Material,name:string,
 from:readonly [number,number,number],to:readonly [number,number,number],width:number)=>{
 const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);
 const d=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
 const o=box(g,m,name,mid.x,mid.y,mid.z,width,.16,d.length());
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return o;
};
// The H8 accessories use thin surface-fitting strips instead of deep blocks.
const ribbon=(g:THREE.Group,m:THREE.Material,name:string,points:number[][],h:number)=>{
 const a:number[]=[];
 for(let i=1;i<points.length;i++){
  const [x,y,z]=points[i-1],[u,v,w]=points[i];
  a.push(x,y-h/2,z,u,v-h/2,w,u,v+h/2,w,
   x,y-h/2,z,u,v+h/2,w,x,y+h/2,z);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,m);mesh.name=name;
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const plate=(g:THREE.Group,m:THREE.Material,name:string,
 coords:number[][],x:number,y:number,z:number,ry=0)=>{
 const sh=new THREE.Shape();
 coords.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));
 sh.closePath();
 const o=new THREE.Mesh(new THREE.ShapeGeometry(sh),m);
 o.name=name;o.position.set(x,y,z);o.rotation.y=ry;
 o.castShadow=false;o.receiveShadow=false;g.add(o);return o;
};
export function createHelmetFieldLayers(parent:THREE.Group,id:string):HelmetFieldLayers{
 if(!isFieldHelmet(id))throw Error('unsupported H7 field shell: '+id);
 const p=HELMET_MOUNT_PROFILES[id],root=new THREE.Group();
 root.name=id+'-reference-field-accessories';parent.add(root);
 const modules:Record<string,THREE.Group>={};
 const addGroup=(key:string)=>{const g=new THREE.Group();g.name='helmet-field-'+key;
  g.visible=false;root.add(g);modules[key]=g;return g;};
 const olive=mat(0x586548),tan=mat(0x967e5d),dark=mat(0x292e2b),
  metal=mat(0x596158),velcro=mat(0x777860),
  glass=mat(0x26363a),reflect=mat(0xc8c4a8);
 const bandMaterial=mat(0x586548),webbingMaterial=mat(0x586548);
 const front=p.front-.09,rear=p.rear+.08,side=p.side+.15;
 const band=addGroup('band');
 // PASGT uses its approved band geometry; ACH/MICH gets a fitted ribbon.
 const x=p.side+.18,y=p.top-2.39,f=front-.12,b=rear+.12;
 ribbon(band,bandMaterial,'shell-fitted-elastic',[
  [-x,y,f+.60],[-x*.8,y,f],[0,y,f],[x*.8,y,f],
  [x,y,f+.60],[x,y,b-.60],[x*.8,y,b],[0,y,b],
  [-x*.8,y,b],[-x,y,b-.60],[-x,y,f+.60]],.52);
 const loops=addGroup('loops'),scrim=addGroup('scrim'),
  leaves=addGroup('leaves');
 // H9.2: populate from the ACTUAL fitted cloth surface. The PASGT
 // renderer continues owning its independently approved field dress.
 if(id!=='pasgt')addAchMichConcealment(id,loops,scrim,leaves,olive,tan);
 const net=addGroup('net');
 if(id!=='pasgt'){
  const mesh=new THREE.Mesh(createAchMichFieldNetGeometry(id),olive);
  mesh.name='ach-mich-h9-shell-wrapped-diamond-net';
  mesh.castShadow=false;mesh.receiveShadow=false;net.add(mesh);
  net.userData.h9NetCordCount=6;
  net.userData.h9SurfaceDraped=true;
 }
 const dangling=addGroup('unfastened');
 // The same anchored PASGT/ACH webbing is separated at its lower buckle.
 for(const sign of [-1,1]){
  if(id==='pasgt'){
   ribbon(dangling,webbingMaterial,'released-pasgt-strap',[
    [sign*4.99,3.30,-1.12],[sign*4.55,1.60,-3.04],
    [sign*4.15,.75,-3.72]],.78);
   box(dangling,dark,'chin-buckle',sign*4.15,.74,-3.74,.32,.31,.27);
  }else{
   for(const z of [-3.10,2.35])
    ribbon(dangling,webbingMaterial,'released-four-point-strap',[
     [sign*4.49,p.ear+.14,z],[sign*4.45,1.50,z-.30],
     [sign*4.32,.84,z-.61]],.78);
   box(dangling,dark,'chin-buckle',sign*4.32,.81,-3.71,.33,.30,.26);
  }
 }
 const shroud=addGroup('shroud');
 if(id==='pasgt'){
  // Retain the historical bracket instead of modernizing baseline PASGT.
  plate(shroud,metal,'pasgt-period-bracket',
   [[-1.04,.70],[1.04,.70],[1.14,.16],[.78,-.71],
    [-.78,-.71],[-1.14,.16]],0,p.top-1.79,front-.39);
  plate(shroud,dark,'pasgt-bracket-socket',
   [[-.43,.16],[.43,.16],[.39,-.32],[-.39,-.32]],
   0,p.top-1.86,front-.43);
 }else addAchMichThreeHoleShroud(id,shroud,metal,dark,reflect);
 const rails=addGroup('rails');
 for(const sign of [-1,1]){
  plate(rails,metal,'tapered-side-rail',
   [[-1.84,-.27],[-1.48,.38],[1.50,.38],[1.91,-.24],
    [1.50,-.47],[-1.48,-.47]],
   sign*(side+.15),p.top-2.33,.05,sign*Math.PI/2);
  for(const z of [-.96,0,.96])
   plate(rails,dark,'rail-receiver-slot',
    [[-.16,-.15],[.16,-.15],[.16,.14],[-.16,.14]],
    sign*(side+.18),p.top-2.25,z,sign*Math.PI/2);
 }
 const bungees=addGroup('bungees');
 for(const sign of [-1,1]){
  const route:[[number,number,number],...[number,number,number][]]=[
   [sign*.85,p.top-1.37,front-.31],
   [sign*2.40,p.top-.05,front+.44],
   [sign*(side+.1),p.top-.89,-.55]];
  for(let i=1;i<route.length;i++)
   segment(bungees,olive,'tensioned-bungee',route[i-1],route[i],.13);
 }
 const velcroGroup=addGroup('velcro');
 plate(velcroGroup,velcro,'thin-crown-velcro',
  [[-1.14,-.68],[1.14,-.68],[1.14,.68],[-1.14,.68]],
  0,p.top+.17,-.85,-Math.PI/2);
 for(const sign of [-1,1])
  plate(velcroGroup,velcro,'thin-side-velcro',
   [[-.79,-.46],[.79,-.46],[.79,.46],[-.79,.46]],
   sign*(side+.15),p.top-1.97,1.60,sign*Math.PI/2);
 plate(velcroGroup,velcro,'thin-rear-velcro',
  [[-1.24,-.46],[1.24,-.46],[1.24,.46],[-1.24,.46]],
  0,p.top-1.92,rear+.17);
 for(const key of ['goggles-front','goggles-rear','goggles-eyes']){
  const g=addGroup(key),back=key==='goggles-rear',eyes=key==='goggles-eyes';
  // The approved D2 goggle silhouette, not two independent dark cubes.
  const pose=createD2GoggleFieldPose(dark,glass,webbingMaterial);
  pose.name='approved-d2-goggle-pose';
  if(back){pose.rotation.y=Math.PI;pose.position.set(0,p.top-6.78,rear-5.74);}
  else if(eyes)pose.position.set(0,0,0);
  else pose.position.set(0,p.top-6.78,front+5.70);
  pose.traverse(o=>{if(o instanceof THREE.Mesh){
   o.castShadow=false;o.receiveShadow=false;
  }});
  g.add(pose);
  const sleeve=new THREE.Group();sleeve.name='goggle-fabric-sleeve';
  sleeve.visible=false;
  plate(sleeve,tan,'flat-goggle-cloth-sleeve',
   [[-3.45,-.66],[3.45,-.66],[3.45,.66],[-3.45,.66]],
   0,p.top-2.9,back?rear+.49:front-.66,back?Math.PI:0);
  g.add(sleeve);
 }
 const strobe=addGroup('strobe');
 box(strobe,dark,'strobe-low-mount',0,p.top+.16,rear-1.06,1.02,.24,.79);
 box(strobe,reflect,'strobe-shielded-cap',0,p.top+.32,rear-1.06,.73,.13,.55);
 const counterweight=addGroup('counterweight');
 box(counterweight,dark,'nape-counterweight-pouch',0,p.top-2.44,rear+.32,2.65,1.15,.49);
 const battery=addGroup('battery');
 box(battery,dark,'compact-battery',2.25,p.top-2.26,rear+.27,1.32,.92,.50);
 box(battery,metal,'battery-latch',2.25,p.top-1.81,rear+.53,.75,.15,.14);
 const light=addGroup('light');
 box(light,metal,'compact-task-light',side+.19,p.top-2.13,front+1.35,.67,.70,1.11);
 box(light,reflect,'task-light-lens',side+.19,p.top-2.13,front+.76,.42,.43,.12);
 const camera=addGroup('camera');
 box(camera,dark,'mini-helmet-camera',side+.18,p.top-1.82,-.65,.64,.73,1.07);
 box(camera,glass,'forward-camera-lens',side+.18,p.top-1.82,-1.25,.43,.43,.12);
 const chemlight=addGroup('chemlight');
 box(chemlight,reflect,'secured-chemlight',-2.10,p.top+.16,rear-.69,.28,.28,1.48);
 const patches=addGroup('patches');
 plate(patches,velcro,'flat-identifier-panel',
  [[-.88,-.45],[.88,-.45],[.88,.45],[-.88,.45]],
  -side-.16,p.top-2.40,1.69,-Math.PI/2);
 plate(patches,reflect,'short-identifier-mark',
  [[-.42,-.15],[.42,-.15],[.42,.15],[-.42,.15]],
  -side-.19,p.top-2.40,1.69,-Math.PI/2);
 // Pre-merge only static groups; invisible groups cost no render work.
 for(const g of Object.values(modules))consolidateVisualGroup(g);
 return {root,shell:id,modules,bandMaterial,webbingMaterial,leaves};
}
export function updateHelmetFieldLayers(v:HelmetFieldLayers,raw:unknown,
 shellHex:number,covered:boolean,headEyewear='eyes-none'):void{
 const s=resolveHelmetField(v.shell,raw),m=v.modules;
 const bandHex=resolveHelmetFieldColor(s.bandColor,shellHex,v.shell==='pasgt');
 const webHex=resolveHelmetFieldColor(s.webbingColor,shellHex,v.shell==='pasgt');
 v.bandMaterial.color.setHex(bandHex);v.webbingMaterial.color.setHex(webHex);
 m.band.visible=s.band&&v.shell!=='pasgt';
 m.loops.visible=covered&&v.shell!=='pasgt'&&s.concealment!=='none';
 m.scrim.visible=covered&&v.shell!=='pasgt'&&s.concealment==='scrim';
 m.net.visible=covered&&v.shell!=='pasgt'&&s.concealment==='net';
 m.leaves.visible=covered&&v.shell!=='pasgt'&&s.concealment.startsWith('foliage-')&&
  s.concealment!=='foliage-loops';
 const count=s.concealment==='foliage-sparse'?3:
  s.concealment==='foliage-medium'?6:10;
 let i=0;for(const leaf of v.leaves.children)leaf.visible=i++<count;
 m.unfastened.visible=!s.fastened;
 for(const key of ['shroud','rails','bungees','velcro','strobe',
  'counterweight','battery','light','camera','chemlight','patches'] as const)
  m[key].visible=s[key];
 for(const key of ['goggles-front','goggles-rear','goggles-eyes']){
  const where=key.substring('goggles-'.length);
  m[key].visible=s.goggles===where&&
   (where!=='eyes'||!headEyewear.startsWith('goggles-'));
  const sleeve=m[key].children.find(x=>x.name==='goggle-fabric-sleeve');
  if(sleeve)sleeve.visible=s.goggleSleeve&&where!=='eyes';
 }
}
