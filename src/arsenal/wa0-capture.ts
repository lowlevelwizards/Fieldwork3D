/** WA0.3 isolated WebGL reference capture; no gameplay or persistence writes. */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from './catalog.ts';
import {collectCustomArtCases,type CustomArtCase} from './wa0-custom-reference-cases.ts';
import {SIDEARM_PREVIEW_REFERENCES,buildSidearmPreview,clearSidearmPreview} from '../weapons/geometry/sidearm-preview.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment} from '../equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {WEAPON_ACCESSORY_STEEL as steel,WEAPON_ACCESSORY_POLYMER as dark} from '../weapons/geometry/weapon-visual-palette.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';

type Primary=(typeof ARSENAL_REFERENCES)[number];
type Sidearm=(typeof SIDEARM_PREVIEW_REFERENCES)[number];
type Entry={id:string;name:string;platform:string;status:string;primary?:Primary;sidearm?:Sidearm;equipped?:boolean;custom?:CustomArtCase};
const refs:Entry[]=[
 ...ARSENAL_REFERENCES.map(primary=>({id:primary.id,name:primary.name,platform:primary.platformId,status:'primary-reference',primary})),
 ...SIDEARM_PREVIEW_REFERENCES.map(sidearm=>({id:sidearm.id,name:sidearm.name,platform:sidearm.family,status:sidearm.family==='beretta'?'preview-only':'issued-sidearm-appearance',sidearm})),
 {id:'legacy-shotgun',name:'Legacy shotgun fallback',platform:'legacy',status:'fallback'}
];
// Representative accepted accessory choices; no claim of exhaustive coverage.
const equippedIds=new Set(['ar-m4a1','ak-ak74m','hk-g3a3','hk-mp5a3','g36-ka4','fal-5000','fnc-service']);
const equipped=refs.filter(r=>equippedIds.has(r.id)).map(r=>({...r,id:r.id+'-equipped',platform:'accessory-samples',equipped:true}));
const customCoverage=collectCustomArtCases();
const customEntries:Entry[]=customCoverage.cases.map(custom=>({id:custom.id,name:custom.name,platform:custom.platform,status:'custom-part-sample',custom}));
const q=new URLSearchParams(location.search),platform=q.get('platform');
const selected=(platform==='accessory-samples'?equipped:platform?.startsWith('custom-')?customEntries.filter(r=>r.platform===platform):refs.filter(r=>!platform||r.platform===platform));
const holder=document.getElementById('sheet')!,status=document.getElementById('status')!;
const scene=new THREE.Scene();addArsenalInspectionLighting(scene);
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});
configureGraphicRendererOutput(renderer);renderer.setPixelRatio(1);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
const silhouette=new THREE.MeshBasicMaterial({color:0x242a25,side:THREE.DoubleSide});
const viewDefs=[
 ['side',[0,0,1],[0,1,0]],['reverse',[0,0,-1],[0,1,0]],
 ['three-quarter',[.42,.29,1],[0,1,0]],['top',[0,1,0],[0,0,-1]],
 ['front',[1,0,0],[0,1,0]],['silhouette',[0,0,1],[0,1,0]]
] as const;
const vector=(v:readonly number[])=>new THREE.Vector3(v[0],v[1],v[2]);
function construct(entry:Entry){
 if(entry.sidearm){
  const model=buildSidearmPreview(entry.sidearm.id);
  const id=entry.sidearm.id;
  return {model,accepted:[] as string[],cleanup:()=>clearSidearmPreview(id,model)};
 }
 let config=entry.custom?entry.custom.config:entry.primary?selectWeaponFamilyPreset(initialWeaponConfiguration(entry.primary.legacy.weapon),entry.primary.id):initialWeaponConfiguration('shotgun');
 const accepted:string[]=[];
 if(entry.equipped){
  if(config.build?.family==='hk')config=setWeaponAttachment(config,'opticMount','optic-hk-claw');
  for(const [slot,id] of [['optic','optic-reflex'],['light','light-compact'],['muzzle','muzzle-suppressor'],['foregrip','foregrip-vertical']] as const){
   const next=setWeaponAttachment(config,slot,id);
   if(next.slots[slot]===id){accepted.push(id);config=next;}
  }
 }
 const body=buildWeaponSilhouette(config.weapon,steel,dark,config);
 const accessories=buildWeaponAccessories(config,steel,dark);
 const model=new THREE.Group();model.add(body,accessories);
 model.scale.x=weaponVisualLayout(config).longitudinalScale;
 return {model,accepted,cleanup:()=>{clearWeaponSilhouette(body);accessories.traverse(n=>{if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh)n.geometry.dispose();});accessories.clear();}};
}
function bounds(model:THREE.Group){
 model.updateMatrixWorld(true);const b=new THREE.Box3();
 model.traverseVisible(n=>{
  if(!(n instanceof THREE.Mesh))return;
  if(n instanceof THREE.InstancedMesh){n.computeBoundingBox();if(n.boundingBox)b.union(n.boundingBox.clone().applyMatrix4(n.matrixWorld));}
  else{if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();if(n.geometry.boundingBox)b.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));}
 });
 if(b.isEmpty())throw Error('Empty artwork bounds');return b;
}
function orient(b:THREE.Box3,def:typeof viewDefs[number]){
 const center=b.getCenter(new THREE.Vector3());
 camera.position.copy(center).addScaledVector(vector(def[1]).normalize(),150);
 camera.up.copy(vector(def[2]));camera.lookAt(center);camera.updateMatrixWorld(true);
 const p=new THREE.Box3();
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])
  p.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 return p.getSize(new THREE.Vector3());
}
function shot(b:THREE.Box3,def:typeof viewDefs[number],width:number,height:number,span?:number){
 const projected=orient(b,def),aspect=width/height;
 const horizontal=span??Math.max(projected.x,projected.y*aspect)*1.16;
 camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/aspect/2;camera.bottom=-camera.top;
 camera.updateProjectionMatrix();renderer.setSize(width,height,false);
 const hidden:THREE.Object3D[]=[];
 if(def[0]==='silhouette')scene.traverseVisible(n=>{if(n instanceof THREE.Mesh&&(n.userData.weaponPixelArt||n.name.startsWith('family-art-'))){hidden.push(n);n.visible=false;}});
 scene.overrideMaterial=def[0]==='silhouette'?silhouette:null;
 try{renderer.render(scene,camera);}finally{for(const n of hidden)n.visible=true;scene.overrideMaterial=null;}
 const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
 const gl=renderer.getContext(),pixels=new Uint8Array(width*height*4);
 gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let foreground=0,edge=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>12){
   foreground++;if(x===0||y===0||x===width-1||y===height-1)edge++;
  }
 }
 if(foreground<5||edge>0)throw Error('Blank or clipped capture '+def[0]+' '+width+'x'+height+' foreground='+foreground+' edge='+edge);
 const src=renderer.domElement.toDataURL('image/png');
 scene.overrideMaterial=null;
 return {src,width,height,horizontalSpan:horizontal,calls,triangles,foreground,edge};
}
const records:object[]=[];
async function generate(){
 if(!selected.length)throw Error('Unknown or empty cohort: '+platform);
 // Compute one fixed span across each scale cohort, independent of selected platform.
 const spans={primary:0,sidearm:0};
 for(const entry of refs){
  const m=construct(entry);try{
   const size=bounds(m.model).getSize(new THREE.Vector3());
   const cohort=entry.sidearm?'sidearm':'primary';
   spans[cohort]=Math.max(spans[cohort],Math.max(size.x,size.y*2)*1.16);
  }finally{m.cleanup();}
 }
 for(const entry of selected){
  const m=construct(entry);scene.add(m.model);
  try{
   const b=bounds(m.model),cohort=entry.sidearm?'sidearm':'primary';
   const row=document.createElement('section');row.className='preset';row.dataset.id=entry.id;
   const heading=document.createElement('h2');heading.textContent=entry.name+' — '+entry.id+' · '+entry.status;
   const views=document.createElement('div');views.className='views';row.append(heading,views);
   const panels:{name:string;metrics:Omit<ReturnType<typeof shot>,'src'>}[]=[];
   const add=(name:string,result:ReturnType<typeof shot>)=>{
    const {src,...metrics}=result;panels.push({name,metrics});
    const fig=document.createElement('figure');fig.dataset.view=name;
    const img=document.createElement('img');img.src=src;img.width=metrics.width;img.height=metrics.height;img.alt=entry.name+' '+name;
    const cap=document.createElement('figcaption');cap.textContent=name;
    fig.append(img,cap);views.append(fig);
   };
   if(entry.custom){
    for(const v of viewDefs.filter(v=>['side','reverse','three-quarter'].includes(v[0])))add(v[0]+'-fit',shot(b,v,480,240));
   }else{
    for(const v of viewDefs)add(v[0]+'-fit',shot(b,v,480,240));
    if(!entry.equipped)add('side-shared',shot(b,viewDefs[0],480,240,spans[cohort]));
    add('native-128',shot(b,viewDefs[0],128,64));
    add('native-64',shot(b,viewDefs[0],64,32));
   }
   holder.append(row);
   records.push({id:entry.id,platform:entry.platform,status:entry.status,cohort,accepted:m.accepted,custom:entry.custom?{partId:entry.custom.partId,hostId:entry.custom.hostId,parts:entry.custom.config.build?.parts}:null,panels});
  }finally{scene.remove(m.model);m.cleanup();}
  status.textContent='Captured '+records.length+' / '+selected.length;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 }
 await Promise.all([...holder.querySelectorAll('img')].map(img=>img.decode()));
 const report=document.createElement('script');report.id='wa0-report';report.type='application/json';
 report.textContent=JSON.stringify({schema:'fieldwork-wa0-webgl-baseline',version:1,spans,lighting:'shared Arsenal inspection',renderer:{antialias:false,pixelRatio:1,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace},views:viewDefs,records});
 document.body.append(report);
 renderer.dispose();silhouette.dispose();renderer.forceContextLoss();
 document.body.dataset.wa0Complete='true';
}
generate().catch(error=>{status.textContent=String(error);document.body.dataset.wa0Failed=String(error);console.error(error);});
