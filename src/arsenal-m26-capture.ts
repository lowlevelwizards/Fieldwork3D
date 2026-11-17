/** M2.6I real WebGL static proof: production mesh builders, not mockup art.
 * Four orthographic panels and actual renderer stats. No animation loop.
 */
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment,setConfiguredFamilyPart}
 from './equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette} from './breach-weapon-geometry.ts';
import {buildWeaponAccessories} from './breach-weapon-accessories.ts';
import {resolveMountedAccessoryLayout,mountedAccessorySeat}
 from './weapons/geometry/mounted-accessory-layout.ts';
import {physicalAttachmentFitOptions}
 from './weapons/geometry/weapon-physical-mount-fit.ts';
import {chooseWeaponMountPosition}
 from './weapons/geometry/weapon-mount-position-edits.ts';
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
const mountedLight=(config:ModelConfig,face:'left'|'right'):ModelConfig=>{
 const options=physicalAttachmentFitOptions(config,'light-compact').options;
 const choice=options.find(x=>x.face===face);
 if(!choice)throw Error('Missing modeled '+face+' side light contact');
 const selected=chooseWeaponMountPosition(config,'light',choice);
 if(selected.mountSelections?.light?.face!==face)
  throw Error('Cannot keep explicit '+face+' light');
 return selected;
};
const arRight=mountedLight(build('ar-m4a1','carbine',false,true,true),'right');
const arLeft=mountedLight(build('ar-m4a1','carbine',false,false,true),'left');
const arOptic=(()=>{
 let c=setWeaponAttachment(arLeft,'optic','optic-reflex');
 const options=physicalAttachmentFitOptions(c,'optic-reflex').options;
 if(!options.length)throw Error('Missing AR optic position');
 c=chooseWeaponMountPosition(c,'optic',options[options.length-1]);
 if(!c.mountSelections?.optic)throw Error('Optic position not persisted');
 return c;
})();
const mp5Left=mountedLight(build('hk-mp5a3','smg',true,false,true),'left');
const cases=[
 {name:'M4A1 · right light + foregrip',cfg:arRight,side:false},
 {name:'M4A1 · left-mounted light',cfg:arLeft,side:true},
 {name:'M4A1 · left light + saved reflex position',cfg:arOptic,side:false},
 {name:'MP5A3 · left light on actual tri-rail',cfg:mp5Left,side:true}
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
 // Review from the actual installed face; a left-mounted light should
 // not disappear behind the receiver in the acceptance screenshot.
 const fromLeft=item.cfg.mountSelections?.light?.face==='left';
 camera.position.set(item.side?2:27,item.side?5:15,
  (item.side?75:57)*(fromLeft?-1:1));
 camera.lookAt(2,0,0);camera.updateProjectionMatrix();
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(720,405);renderer.setPixelRatio(1);
 renderer.render(scene,camera);
 panel.append(renderer.domElement);sheet.append(panel);
 const mounted=resolveMountedAccessoryLayout(item.cfg);
 const light=mountedAccessorySeat(item.cfg,'light');
 const lens=extras.getObjectByName('weapon-light-lens');
 if(!light?.lens||!lens||
  Math.abs(lens.position.x-light.lens.x)>.001||
  Math.abs(lens.position.z-light.lens.z)>.001)
  throw Error('Live mesh lens differs from saved rail position: '+item.name);
 const meshes:THREE.Mesh[]=[];
 group.traverse(node=>{if(node instanceof THREE.Mesh)meshes.push(node)});
 stats.push({name:item.name,meshes:meshes.length,
  triangles:renderer.info.render.triangles,
  savedLightFace:item.cfg.mountSelections?.light?.face,
  lensMesh:{x:lens.position.x,z:lens.position.z},
  drawCalls:renderer.info.render.calls,
  mounted:mounted.mounts.map(m=>({
   id:m.attachmentId,face:m.placement.face,x:m.x,y:m.y,z:m.z,
   lensX:m.lens?.x,gripY:m.hand?.y})),
  unresolved:mounted.unresolved.map(u=>u.attachmentId)});
}
body.dataset.m26Stats=JSON.stringify(stats);
body.dataset.m26Complete='true';
