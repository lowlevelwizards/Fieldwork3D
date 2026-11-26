/** Dev-only calibration: same meshes, same maps, owned temporary materials.
 * No source finish mutations; no production renderer changes. */
import * as THREE from 'three';
import {refs,construct,bounds} from './wa-art-models.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput,GRAPHIC_LIGHT_PROFILE} from '../rendering/graphic-lighting-profile.ts';
import {WEAPON_FINISH_SPECS,weaponFinish,type WeaponFinishId} from '../weapons/geometry/weapon-material-registry.ts';
import {weaponFinishSubstrate,weaponArtStudyColor,WA3_DARK_STUDY} from '../weapons/geometry/weapon-art-material-vocabulary.ts';
const ids=['fal-5000-classic','fnc-service','g36-service','ar-m4a1','ak-akm','hk-g3a4','hk-mp5a3','r870-police-wood','glock-g19x','beretta-m9a3'];
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);configureGraphicRendererOutput(renderer);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,500);
const sheet=document.getElementById('sheet')!,status=document.getElementById('status')!;
const records:object[]=[];
type Lighting='studio'|'mirror'|'key';
function light(mode:Lighting){
 for(const n of [...scene.children])if(n instanceof THREE.Light)scene.remove(n);
 addArsenalInspectionLighting(scene);
 if(mode==='mirror')for(const n of scene.children)if(n instanceof THREE.DirectionalLight)n.position.z*=-1;
 if(mode==='key'){
  for(const n of [...scene.children])if(n instanceof THREE.Light)scene.remove(n);
  const key=new THREE.DirectionalLight(0xfff2d6,2.35);
  key.position.set(...GRAPHIC_LIGHT_PROFILE.keyDirection).normalize().multiplyScalar(300);
  scene.add(key,new THREE.HemisphereLight(0xffffff,0x798a7f,1.2));
 }
}
function shot(root:THREE.Group,box:THREE.Box3,mode:Lighting,reverse:boolean,width:number,height:number,study:boolean){
 light(mode);
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 camera.position.copy(center).add(new THREE.Vector3(0,0,reverse?-100:100));camera.up.set(0,1,0);camera.lookAt(center);
 const span=Math.max(size.x,size.y*width/height)*1.16;
 camera.left=-span/2;camera.right=span/2;camera.top=span*height/width/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();
 const clones=new Map<THREE.Material,THREE.Material>(),restore:{mesh:THREE.Mesh;source:THREE.Material|THREE.Material[]}[]=[];
 try{
  if(study)root.traverseVisible(n=>{
   if(!(n instanceof THREE.Mesh))return;
   const source=n.material,replace=(m:THREE.Material)=>{
    const color=weaponArtStudyColor(m);if(color===undefined)return m;
    let clone=clones.get(m);
    if(!clone){clone=m.clone();(clone as THREE.MeshStandardMaterial).color.setHex(color);clones.set(m,clone);}
    return clone;
   };
   restore.push({mesh:n,source});n.material=Array.isArray(source)?source.map(replace):replace(source);
  });
  scene.add(root);renderer.setSize(width,height,false);renderer.render(scene,camera);
  const pixels=new Uint8Array(width*height*4),gl=renderer.getContext();
  gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let visible=0;
  for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>12)visible++;
  if(visible<5)throw Error('Blank calibration image');
  return {src:renderer.domElement.toDataURL('image/png'),width,height,span,visible,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,changedMaterials:clones.size};
 }finally{scene.remove(root);for(const r of restore)r.mesh.material=r.source;for(const m of clones.values())m.dispose();}
}
function append(parent:HTMLElement,name:string,p:ReturnType<typeof shot>){
 const fig=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');
 img.src=p.src;img.width=p.width;img.height=p.height;cap.textContent=name;fig.append(img,cap);parent.append(fig);
}
function row(parent:HTMLElement){const r=document.createElement('div');r.className='row';parent.append(r);return r;}
function section(title:string){const s=document.createElement('section'),h=document.createElement('h2');h.textContent=title;s.append(h);sheet.append(s);return s;}
async function run(){
 const swatches=section('Registered finish swatches · actual materials under shared studio');
 for(const id of Object.keys(WEAPON_FINISH_SPECS) as WeaponFinishId[]){
  const root=new THREE.Group(),geometry=new THREE.BoxGeometry(4,2,1);const mesh=new THREE.Mesh(geometry,weaponFinish(id));mesh.rotation.set(.2,.32,0);root.add(mesh);
  const box=bounds(root),r=row(swatches),original=shot(root,box,'studio',false,160,80,false),candidate=shot(root,box,'studio',false,160,80,true);
  append(r,id+' · '+weaponFinishSubstrate(id),original);append(r,WA3_DARK_STUDY[id]===undefined?'Retained':'Study candidate',candidate);
  geometry.dispose();
  records.push({id,kind:'swatch',substrate:weaponFinishSubstrate(id),current:WEAPON_FINISH_SPECS[id],candidate:WA3_DARK_STUDY[id]??null});
 }
 for(const id of ids){
  const e=refs.find(r=>r.id===id);if(!e)throw Error('Missing benchmark '+id);
  const m=construct(e),box=bounds(m.model),s=section(e.name+' · '+e.status);
  const panels:object[]=[];
  try{
   for(const mode of ['studio','mirror','key'] as const){
    const r=row(s),reverse=mode==='mirror';
    for(const [w,h] of [[480,240],[128,64]] as const)for(const study of [false,true]){
     const result=shot(m.model,box,mode,reverse,w,h,study),{src,...metrics}=result;
     append(r,mode+' · '+w+'px · '+(study?'study':'current'),result);
     panels.push({mode,reverse,study,...metrics});
    }
   }
  }finally{m.cleanup();}
  records.push({id,kind:'reference',panels});status.textContent='Captured '+id;
  await new Promise<void>(r=>requestAnimationFrame(()=>r()));
 }
 await Promise.all([...sheet.querySelectorAll('img')].map(i=>i.decode()));
 const manifest=document.createElement('script');manifest.type='application/json';manifest.id='study-report';
 manifest.textContent=JSON.stringify({schema:'wa3-material-study-v1',records,limitations:['Candidate colors are isolated diagnostic studies; no palette change.','Key lighting uses shared direction/output, not live mission shader.','Native 128px is fitted readability, not actual gameplay distance.']});
 document.body.append(manifest);
 renderer.dispose();renderer.forceContextLoss();status.textContent='Calibration captured';document.body.dataset.complete='true';
}
run().catch(e=>{status.textContent=String(e);document.body.dataset.failed=String(e);console.error(e);});
