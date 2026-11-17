/** M2.5I real WebGL static proof: production mesh builders, not mockup art.
 * Four orthographic panels and actual renderer stats. No animation loop.
 */
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,setConfiguredFamilyPart}
 from './equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {resolveMountedAccessoryLayout}
 from './weapons/geometry/mounted-accessory-layout.ts';
const body=document.body,sheet=document.querySelector('#sheet');
if(!(sheet instanceof HTMLElement))throw Error('Missing sheet');
const materials=[new THREE.MeshStandardMaterial({color:0x58645d,roughness:.86}),
 new THREE.MeshStandardMaterial({color:0x202928,roughness:.94})];
type ModelConfig=ReturnType<typeof initialWeaponConfiguration>;
const build=(id:string,weapon:'carbine'|'smg'|'rifle',
 tri=false,grip=false,light=false):ModelConfig=>{
 let c=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),id);
 if(tri)c=setConfiguredFamilyPart(c,'handguard','hk-mp5-trirail');
 if(grip)c=setWeaponAttachment(c,'foregrip','foregrip-vertical');
 if(light)c=setWeaponAttachment(c,'light','light-compact');
 return c;
};
const cases=[
 {name:'M4A1 • right side • light + grip',cfg:build('ar-m4a1','carbine',false,true,true),side:true},
 {name:'M4A1 • three-quarter • light + grip',cfg:build('ar-m4a1','carbine',false,true,true),side:false},
 {name:'MP5A3 tri-rail • side • light + grip',cfg:build('hk-mp5a3','smg',true,true,true),side:true},
 {name:'MP5A3 tri-rail • three-quarter',cfg:build('hk-mp5a3','smg',true,true,true),side:false}
];
const stats:unknown[]=[];
for(const item of cases){
 const panel=document.createElement('section');panel.className='panel';
 const title=document.createElement('h2');title.textContent=item.name;panel.append(title);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#2c3536');
 scene.add(new THREE.AmbientLight(0xffffff,2.0));
 const sun=new THREE.DirectionalLight(0xffffff,2.7);
 sun.position.set(-12,22,27);scene.add(sun);
 const group=new THREE.Group();
 const weapon=buildWeaponSilhouette(item.cfg.weapon,materials[0],materials[1],item.cfg);
 const extras=buildWeaponAccessories(item.cfg,materials[0],materials[1]);
 group.add(weapon,extras);
 scene.add(group);
 const camera=new THREE.OrthographicCamera(-24,24,13.5,-13.5,.1,200);
 camera.position.set(item.side?2:27,item.side?5:15,item.side?75:57);
 camera.lookAt(2,0,0);camera.updateProjectionMatrix();
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(720,405);renderer.setPixelRatio(1);
 renderer.render(scene,camera);
 panel.append(renderer.domElement);sheet.append(panel);
 const mounted=resolveMountedAccessoryLayout(item.cfg);
 const meshes:THREE.Mesh[]=[];
 group.traverse(node=>{if(node instanceof THREE.Mesh)meshes.push(node)});
 stats.push({name:item.name,meshes:meshes.length,
  triangles:renderer.info.render.triangles,
  drawCalls:renderer.info.render.calls,
  mounted:mounted.mounts.map(m=>({
   id:m.attachmentId,face:m.placement.face,x:m.x,y:m.y,z:m.z,
   lensX:m.lens?.x,gripY:m.hand?.y})),
  unresolved:mounted.unresolved.map(u=>u.attachmentId)});
}
body.dataset.m25Stats=JSON.stringify(stats);
body.dataset.m25Complete='true';
