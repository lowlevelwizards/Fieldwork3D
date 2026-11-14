/** H7 field kit, prebuilt once per approved shell. No simulated payload,
 * hitbox, light, camera, weapon or gameplay capability is added.
 * Conservative PASGT models never grow modern side rails.
 */
import * as THREE from 'three';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {achMichHemY} from './operator-ach-mich-details.ts';
import {isFieldHelmet,resolveHelmetField,resolveHelmetFieldColor,
 type FieldHelmet} from './operator-helmet-field-policy.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {addAchMichConcealment} from './operator-helmet-field-concealment.ts';
import {createAchMichSurfaceBandGeometry} from './operator-helmet-field-fit.ts';
import {createAchMichFieldNetGeometry} from './operator-helmet-field-net.ts';
import {addAchMichThreeHoleShroud} from './operator-helmet-field-shroud.ts';
import {addAchMichArcRails} from './operator-helmet-field-rails.ts';
import {addAchMichRetainingBungees} from './operator-helmet-field-bungees.ts';
import {createD2GoggleFieldPose} from './operator-d2-goggle-visuals.ts';
import {createHelmetFieldGoggleModule,createFittedGoggleSleeve} from './operator-helmet-field-goggles.ts';
import {addAchMichVelcro,addAchMichIdentifierPatch} from './operator-helmet-field-velcro.ts';
import {addAchMichFieldAddon} from './operator-helmet-field-addons.ts';
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
// The H8 accessories use thin surface-fitting strips instead of deep blocks.
const ribbon=(g:THREE.Group,m:THREE.Material,name:string,points:number[][],width:number)=>{
 const a:number[]=[];
 const outward=new THREE.Vector3(Math.sign(points[0][0])||1,.02,-.27).normalize();
 for(let i=1;i<points.length;i++){
  const p=new THREE.Vector3(...points[i-1]);
  const q=new THREE.Vector3(...points[i]);
  // H5.1: perpendicular to the strap's direction! The previous
  // y-axis width became almost zero on a vertically hanging strap.
  const side=q.clone().sub(p).normalize().cross(outward).normalize()
   .multiplyScalar(width*.5);
  const v=[p.clone().sub(side),p.clone().add(side),
   q.clone().add(side),q.clone().sub(side)];
  for(const t of [v[0],v[1],v[2],v[0],v[2],v[3]])
   a.push(t.x,t.y,t.z);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
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
 // H10.0: fit an actual closed, outward-offset band to the cloth.
 // Never use straight front/side chords through a covered shell.
 if(id!=='pasgt'){
  const mesh=new THREE.Mesh(createAchMichSurfaceBandGeometry(id),bandMaterial);
  mesh.name='surface-wrapped-elastic-band';
  mesh.castShadow=false;mesh.receiveShadow=false;band.add(mesh);
  band.userData.h10RealCoverRing=true;
  band.userData.h5CoverAdaptive=true;
 }
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
  net.userData.h5CoverAdaptiveNet=true;
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
   // A true four-point suspension: both shell anchors converge into
   // one sewn junction, with one broad free strap and a dangling buckle.
   const frontAnchor:[number,number,number]=[
    sign*4.49,achMichHemY(id,-3.10)-.16,-3.10];
   const rearAnchor:[number,number,number]=[
    sign*4.49,achMichHemY(id,2.35)-.16,2.35];
   // Two entirely independent released suspensions sit OUTBOARD of the
   // head, rather than joining beneath the jaw when the buckle is undone.
   const junction=[sign*5.06,1.43,-1.58];
   // One quad per suspension leg plus one free-hanging side panel.
   // No duplicate corner faces, bridging triangles or neck-crossing tails.
   ribbon(dangling,webbingMaterial,'released-four-point-front-leg',
    [frontAnchor,junction],.83);
   ribbon(dangling,webbingMaterial,'released-four-point-rear-leg',
    [rearAnchor,junction],.83);
   ribbon(dangling,webbingMaterial,'released-four-point-hanging-tail',[
    junction,[sign*5.26,-1.17,-1.82]
   ],.88);
   box(dangling,dark,'chin-buckle',sign*5.26,-1.19,-1.83,
    .56,.46,.34);
   
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
 if(id!=='pasgt')addAchMichArcRails(id,rails,metal,dark,reflect);
 const bungees=addGroup('bungees');
 if(id!=='pasgt')addAchMichRetainingBungees(id,bungees,olive,metal,dark);
 const velcroGroup=addGroup('velcro');
 if(id!=='pasgt')addAchMichVelcro(id,velcroGroup,velcro,dark);
 for(const key of ['goggles-front','goggles-rear','goggles-eyes']){
  const g=addGroup(key),back=key==='goggles-rear',eyes=key==='goggles-eyes';
  if(id!=='pasgt'){
   // H9.5 D2 housing is preserved. Retention is now a separate,
   // cover-fitting band and sleeve is sculpted to the housing itself.
   createHelmetFieldGoggleModule(id,eyes?'eyes':back?'rear':'front',
    g,dark,glass,webbingMaterial,tan);
   continue;
  }
  // Period PASGT keeps the existing approved legacy housing until
  // a separate historical goggle fit is authored and inspected.
  const pose=createD2GoggleFieldPose(dark,glass,webbingMaterial);
  pose.name='approved-d2-goggle-pose';
  if(back){pose.rotation.y=Math.PI;pose.position.set(0,p.top-6.78,rear-5.74);}
  else if(eyes)pose.position.set(0,0,0);
  else pose.position.set(0,p.top-6.78,front+5.70);
  pose.traverse(o=>{if(o instanceof THREE.Mesh){
   o.castShadow=false;o.receiveShadow=false;
  }});
  g.add(pose);
  // The original D2/PASGT retention remains period appropriate, but its
  // fabric sleeve now follows the actual goggle housing as well.
  g.add(createFittedGoggleSleeve(pose,tan,dark));
 }
 // H9.7: every modern helmet add-on now has its own designed silhouette.
 // PASGT keeps a conservative reference-limited kit.
 for(const key of ['strobe','counterweight','battery','light','camera',
  'chemlight'] as const){
  const g=addGroup(key);
  if(id!=='pasgt')
   addAchMichFieldAddon(id,key,g,{dark,metal,cloth:tan,reflect});
  else if(key==='strobe'){
   box(g,dark,'pasgt-low-profile-marker-base',0,p.top+.16,rear-1.06,
    1.02,.24,.79);
   box(g,reflect,'pasgt-marker-lens',0,p.top+.32,rear-1.06,.73,.13,.55);
  }else if(key==='chemlight')
   box(g,reflect,'period-secured-chemlight',-2.10,p.top+.16,rear-.69,
    .28,.28,1.48);
 }
 const patches=addGroup('patches');
 if(id!=='pasgt')addAchMichIdentifierPatch(id,patches,velcro,dark,reflect);
 else{
  plate(patches,velcro,'pasgt-period-identifier',
   [[-.88,-.45],[.88,-.45],[.88,.45],[-.88,.45]],
   -side-.16,p.top-2.40,1.69,-Math.PI/2);
 }
 // Pre-merge only static groups; invisible groups cost no render work.
 for(const g of Object.values(modules))consolidateVisualGroup(g);
 return {root,shell:id,modules,bandMaterial,webbingMaterial,leaves};
}
export function updateHelmetFieldLayers(v:HelmetFieldLayers,raw:unknown,
 shellHex:number,covered:boolean,headEyewear='eyes-none'):void{
 const s=resolveHelmetField(v.shell,raw,{covered}),m=v.modules;
 // Swap between cached, pre-authored cloth and shell ring profiles only
 // when the cover state changes; never raycast every animation frame.
 if(v.shell!=='pasgt'){
  const band=v.modules.band.getObjectByName('surface-wrapped-elastic-band');
  if(band instanceof THREE.Mesh&&band.userData.h5Covered!==covered){
   band.geometry=createAchMichSurfaceBandGeometry(v.shell,covered);
   band.userData.h5Covered=covered;
  }
 }
 if(v.shell!=='pasgt'){
  const net=v.modules.net.getObjectByName('ach-mich-h9-shell-wrapped-diamond-net');
  if(net instanceof THREE.Mesh&&net.userData.h5Covered!==covered){
   net.geometry=createAchMichFieldNetGeometry(v.shell,covered);
   net.userData.h5Covered=covered;
  }
 }
 // Both NVG attachment frames are pre-authored; no raycast or geometry
 // rebuilding during cover toggles. Keep the shroud actually seated.
 if(v.shell!=='pasgt'){
  const cloth=m.shroud.getObjectByName('shroud-covered-mount');
  const shell=m.shroud.getObjectByName('shroud-bare-mount');
  if(cloth)cloth.visible=covered;
  if(shell)shell.visible=!covered;
 }
 const bandHex=resolveHelmetFieldColor(s.bandColor,shellHex,v.shell==='pasgt');
 const webHex=resolveHelmetFieldColor(s.webbingColor,shellHex,v.shell==='pasgt');
 v.bandMaterial.color.setHex(bandHex);v.webbingMaterial.color.setHex(webHex);
 // The net cannot be tied off if its retaining elastic is absent.
 m.band.visible=(s.band||s.concealment==='net')&&v.shell!=='pasgt';
 m.loops.visible=covered&&v.shell!=='pasgt'&&
  (s.concealment==='scrim'||s.concealment==='foliage');
 m.scrim.visible=covered&&v.shell!=='pasgt'&&s.concealment==='scrim';
 m.net.visible=v.shell!=='pasgt'&&s.concealment==='net';
 m.leaves.visible=covered&&v.shell!=='pasgt'&&s.concealment==='foliage';
 const count=10;
 let i=0;for(const leaf of v.leaves.children)leaf.visible=i++<count;
 m.unfastened.visible=!s.fastened;
 const coveredBungees=m.bungees.getObjectByName('bungee-cover-route');
 const bareBungees=m.bungees.getObjectByName('bungee-bare-route');
 if(coveredBungees)coveredBungees.visible=covered;
 if(bareBungees)bareBungees.visible=!covered;
 for(const key of ['shroud','rails','bungees','velcro','strobe',
  'counterweight','battery','light','camera','chemlight','patches'] as const)
  m[key].visible=s[key];
 // Mirror complete prebuilt surface-mounted models rather than rebuilding
 // meshes, evaluating rays, or adding per-frame visual work.
 // Side rails are rigid fittings: on a bare shell tuck the whole rail
 // and its directly clamped accessories in together. No geometry rebuild.
 if(v.shell!=='pasgt'){
  const bareOffset=covered?0:.16;
  for(const rail of m.rails.children)
   rail.position.x=rail.name.endsWith('-left')?bareOffset:-bareOffset;
  m.light.position.x=s.lightSide==='left'?bareOffset:-bareOffset;
  m.camera.position.x=s.cameraSide==='left'?bareOffset:-bareOffset;
 }
 m.camera.scale.x=s.cameraSide==='right'?1:-1;
 m.light.scale.x=s.lightSide==='left'?1:-1;
 // Legacy chemlightSide is retained in saves but no longer changes
 // the centered crown-rear attachment position.
 m.chemlight.scale.x=1;
 for(const key of ['goggles-front','goggles-rear','goggles-eyes']){
  const where=key.substring('goggles-'.length);
  m[key].visible=s.goggles===where&&
   (where!=='eyes'||!headEyewear.startsWith('goggles-'));
  // The tilted front housing needs clearance from the NVG receiver;
  // move ONLY the housing and matched sleeve, never the perimeter strap.
  if(key==='goggles-front'&&v.shell!=='pasgt'){
   const pose=m[key].getObjectByName('approved-d2-goggle-pose');
   const sleeve=m[key].getObjectByName('goggle-fabric-sleeve');
   const shift=s.shroud?-.58:0;
   const lift=s.shroud?.16:0;
   const baseZ=HELMET_MOUNT_PROFILES[v.shell].front+3.72;
   const baseY=HELMET_MOUNT_PROFILES[v.shell].top-5.95;
   if(pose){pose.position.z=baseZ+shift;pose.position.y=baseY+lift;}
   if(sleeve){sleeve.position.z=baseZ+shift;sleeve.position.y=baseY+lift;}
   m[key].position.y=0;m[key].position.z=0;
  }
  const coverStrap=m[key].getObjectByName('goggle-retention-covered');
  const bareStrap=m[key].getObjectByName('goggle-retention-bare');
  if(coverStrap)coverStrap.visible=covered;
  if(bareStrap)bareStrap.visible=!covered;
  const sleeve=m[key].getObjectByName('goggle-fabric-sleeve');
  if(sleeve)sleeve.visible=s.goggleSleeve&&where!=='eyes';
 }
}
