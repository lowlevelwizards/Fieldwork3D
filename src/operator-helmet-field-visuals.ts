/** H7 field kit, prebuilt once per approved shell. No simulated payload,
 * hitbox, light, camera, weapon or gameplay capability is added.
 * Conservative PASGT models never grow modern side rails.
 */
import * as THREE from 'three';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {isFieldHelmet,resolveHelmetField,resolveHelmetFieldColor,
 type FieldHelmet} from './operator-helmet-field-policy.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {PASGT_LEAF_CLUSTERS,createPasgtScrimRibbonGeometry} from './operator-pasgt-field-dress.ts';
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
 const cy=p.top-2.48,front=p.front-.09,rear=p.rear+.08,side=p.side+.15;
 const band=addGroup('band');
 // PASGT uses its approved band geometry; ACH/MICH gets a fitted ribbon.
 const x=p.side+.18,y=p.top-2.39,f=front-.12,b=rear+.12;
 ribbon(band,bandMaterial,'shell-fitted-elastic',[
  [-x,y,f+.60],[-x*.8,y,f],[0,y,f],[x*.8,y,f],
  [x,y,f+.60],[x,y,b-.60],[x*.8,y,b],[0,y,b],
  [-x*.8,y,b],[-x,y,b-.60],[-x,y,f+.60]],.52);
 const loops=addGroup('loops');
 for(const sign of [-1,1])for(const z of [-3.0,0,2.6])
  plate(loops,olive,'cloth-foliage-loop',
   [[-.65,-.13],[.65,-.13],[.65,.13],[-.65,.13]],
   sign*(side+.12),p.top-1.55,z,sign*Math.PI/2);
 const scrim=addGroup('scrim'),leaves=addGroup('leaves');
 for(let i=0;i<10;i++){
  const sign=i%2?1:-1,z=-3.3+(i%5)*1.65;
  const px=sign*(side+.18),py=p.top-1.42+(i%3)*.2;
  // Identical PASGT authored silhouette, only attachment transform differs.
  const leaf=new THREE.Mesh(PASGT_LEAF_CLUSTERS[i%3],i%3?olive:tan);
  leaf.name='pasgt-derived-foliage';leaf.position.set(px,py,z);
  leaf.rotation.y=sign*Math.PI/2;leaf.rotation.z=(i%3-1)*.14;
  leaf.scale.setScalar(.87);leaf.castShadow=false;leaf.receiveShadow=false;
  leaf.userData.keepSeparate=true;leaves.add(leaf);
  const cloth=new THREE.Mesh(createPasgtScrimRibbonGeometry(i),i%3?olive:tan);
  cloth.name='pasgt-derived-folded-scrim';cloth.position.set(px,py,z);
  cloth.rotation.y=sign*Math.PI/2;cloth.rotation.z=(i%3-1)*.12;
  cloth.scale.setScalar(.78);cloth.castShadow=false;cloth.receiveShadow=false;
  scrim.add(cloth);
 }
 const net=addGroup('net');
 for(const sign of [-1,1])for(let i=0;i<3;i++){
  const z=-2.4+2.4*i;
  const route:[[number,number,number],...[number,number,number][]]=[
   [-x,y,z-sign],[-x,p.top-.78,z-sign],
   [-x*.55,p.top+.14,z-sign*.52],[0,p.top+.16,z],
   [x*.55,p.top+.14,z+sign*.52],
   [x,p.top-.78,z+sign],[x,y,z+sign]];
  for(let j=1;j<route.length;j++)
   segment(net,olive,'crown-draped-net',route[j-1],route[j],.13);
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
 box(shroud,metal,id==='pasgt'?'period-nvg-plate':'front-nvg-shroud',
  0,p.top-1.62,front-.42,2.25,1.62,.56);
 box(shroud,dark,'shroud-lower-slot',0,p.top-2.0,front-.77,1.14,.40,.32);
 const rails=addGroup('rails');
 for(const sign of [-1,1]){
  box(rails,metal,'side-rail',sign*(side+.38),p.top-2.45,0,.65,.63,4.1);
  for(const z of [-1.2,0,1.2])
   box(rails,dark,'rail-slot',sign*(side+.71),p.top-2.18,z,.16,.25,.65);
 }
 const bungees=addGroup('bungees');
 for(const sign of [-1,1]){
  segment(bungees,olive,'bungee-retainer',
   [sign*2.3,p.top+.06,front+.58],
   [sign*(side+.12),p.top-1.2,.75],.15);
 }
 const velcroGroup=addGroup('velcro');
 box(velcroGroup,velcro,'velcro-top',0,p.top+.10,-.8,3.25,.12,2.5);
 for(const sign of [-1,1])box(velcroGroup,velcro,'velcro-side',
  sign*(side+.30),p.top-2.40,1.75,.12,1.25,1.95);
 box(velcroGroup,velcro,'velcro-back',0,p.top-2.2,rear+.22,3.3,1.2,.12);
 for(const key of ['goggles-front','goggles-rear','goggles-eyes']){
  const g=addGroup(key),eyes=key==='goggles-eyes';
  const back=key==='goggles-rear';
  const y=eyes?2.18:p.top-1.9,z=eyes?-4.98:back?rear+.48:front-.55;
  for(const sign of [-1,1]){
   box(g,dark,'goggle-rubber-frame',sign*1.12,y,z,2.02,1.34,.78);
   box(g,glass,'goggle-lens',sign*1.12,y,z+(back?.43:-.43),1.51,.83,.15);
  }
  box(g,dark,'goggle-bridge',0,y,z,.46,.53,.72);
  const sleeve=new THREE.Group();sleeve.name='goggle-fabric-sleeve';
  box(sleeve,tan,'goggle-sleeve-wrap',0,y,z+(back?.70:-.70),
   4.52,1.56,.27);
  g.add(sleeve);
 }
 const strobe=addGroup('strobe');
 box(strobe,dark,'ir-strobe-base',0,p.top+.26,rear-1.05,1.35,.45,1.07);
 box(strobe,reflect,'ir-strobe-cap',0,p.top+.53,rear-1.05,1.0,.18,.76);
 const counterweight=addGroup('counterweight');
 box(counterweight,dark,'counterweight-pouch',0,p.top-2.35,rear+.59,3.2,1.6,.8);
 const battery=addGroup('battery');
 box(battery,dark,'battery-pack',2.6,p.top-2.1,rear+.48,1.7,1.5,.80);
 box(battery,metal,'battery-latch',2.6,p.top-1.5,rear+.85,1.0,.26,.20);
 const light=addGroup('light');
 box(light,metal,'side-task-light',side+.67,p.top-2.18,front+1.7,1.1,.88,1.5);
 box(light,reflect,'task-light-lens',side+.67,p.top-2.18,front+.83,.68,.58,.25);
 const camera=addGroup('camera');
 box(camera,dark,'helmet-camera',side+.59,p.top-1.85,-.80,.94,1.04,1.62);
 box(camera,glass,'camera-lens',side+.59,p.top-1.85,-1.70,.65,.66,.21);
 const chemlight=addGroup('chemlight');
 box(chemlight,reflect,'field-chemlight',-2.3,p.top+.24,rear-.72,.46,.44,2.0);
 const patches=addGroup('patches');
 box(patches,velcro,'identifier-panel',-side-.38,p.top-2.48,1.68,.15,1.18,2.18);
 box(patches,reflect,'identifier-mark',-side-.51,p.top-2.48,1.68,.10,.47,1.02);
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
