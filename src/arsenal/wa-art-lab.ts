/** WA1 isolated demand-rendered artwork workbench. One GL renderer, two copied
 * canvases, bounded thumbnail queue. No production state or shared material edits. */
import * as THREE from 'three';
import {refs,equipped,customEntries,construct,bounds,type Entry} from './wa-art-models.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput,GRAPHIC_LIGHT_PROFILE} from '../rendering/graphic-lighting-profile.ts';
import {visualMaterialRole} from '../rendering/material-identity.ts';
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const select=(id:string)=>get<HTMLSelectElement>(id);
const entries=[...refs,...equipped,...customEntries];
const category=(e:Entry)=>e.sidearm?'Sidearm':e.custom?'Custom part':e.equipped?'Equipped sample':e.primary?.legacy.weapon??'shotgun';
const family=(e:Entry)=>e.platform.replace(/^custom-/,'');
const disposition=(e:Entry)=>{const f=family(e);return ['ar15','g3','hk33','mp5','legacy'].includes(f)?'High priority': ['ak','beretta'].includes(f)?'Medium priority':['fal','fnc','g36','remington870','glock'].includes(f)?'Benchmark / refine':'Supplementary';};
const opts=(id:string,values:string[])=>{const s=select(id);s.append(new Option('All',''));for(const v of [...new Set(values)].sort())s.append(new Option(v,v));};
opts('family',entries.map(family));opts('category',entries.map(category));opts('status-filter',entries.map(e=>e.status));opts('disposition',entries.map(disposition));
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
configureGraphicRendererOutput(renderer);renderer.setPixelRatio(1);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
const silhouette=new THREE.MeshBasicMaterial({color:0x242a25,side:THREE.DoubleSide});
const wire=new THREE.MeshBasicMaterial({color:0x303f35,wireframe:true});
const roleColors:Record<string,number>={steel:0x78919c,polymer:0x66764c,wood:0xb58a59,paint:0xa8a0bd,fabric:0xa58f7c,neutral:0xa5a9a2};
const roleMats=new Map<string,THREE.MeshBasicMaterial>();
const views:Record<string,[number[],number[]]>={side:[[0,0,1],[0,1,0]],reverse:[[0,0,-1],[0,1,0]],'three-quarter':[[.42,.29,1],[0,1,0]],top:[[0,1,0],[0,0,-1]],front:[[1,0,0],[0,1,0]],rear:[[-1,0,0],[0,1,0]]};
const vec=(v:number[])=>new THREE.Vector3(...v as [number,number,number]);
let view='side',yaw=0,pitch=0,zoom=1,target:'a'|'b'='a',frame=0,draws=0,disposed=false;
let a=entries.find(e=>e.id==='fal-5000')??entries[0],b=entries.find(e=>e.id==='ar-m4a1')??entries[1];
type Model=ReturnType<typeof construct>;
const active=new Map<string,{entry:Entry;model:Model;box:THREE.Box3;buildMs:number}>();
const spans={primary:0,sidearm:0};
for(const e of refs){const m=construct(e);try{const size=bounds(m.model).getSize(new THREE.Vector3()),c=e.sidearm?'sidearm':'primary';spans[c]=Math.max(spans[c],size.length()*2*1.16);}finally{m.cleanup();}}
const metrics=new Map<string,object>();
const baselineFiles=new Map<string,File>();let baseline: any=null;let urlA='',contextUrl='';let importVersion=0;
const currentMode=()=>select('compare').value;
function light(mode:string){
 for(const n of [...scene.children])if(n instanceof THREE.Light)scene.remove(n);
 addArsenalInspectionLighting(scene);
 if(mode==='mirror')for(const n of scene.children)if(n instanceof THREE.DirectionalLight)n.position.z*=-1;
 if(mode==='neutral'){for(const n of [...scene.children])if(n instanceof THREE.Light)scene.remove(n);scene.add(new THREE.HemisphereLight(0xffffff,0xb8b8b8,2),new THREE.AmbientLight(0xffffff,1));}
 if(mode==='game'){for(const n of [...scene.children])if(n instanceof THREE.Light)scene.remove(n);const key=new THREE.DirectionalLight(0xfff2d6,2.35);key.position.copy(vec([...GRAPHIC_LIGHT_PROFILE.keyDirection])).multiplyScalar(300);scene.add(key,new THREE.HemisphereLight(0xffffff,0x798a7f,1.2));}
}
function getModel(slot:string,e:Entry){
 const prior=active.get(slot);if(prior?.entry.id===e.id)return prior;
 if(prior){prior.model.cleanup();active.delete(slot);}
 const t=performance.now(),model=construct(e),box=bounds(model.model),buildMs=performance.now()-t;
 const result={entry:e,model,box,buildMs};active.set(slot,result);return result;
}
function meshStats(root:THREE.Group){
 let meshes=0,triangles=0,marked=0;const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),geometries=new Set<THREE.BufferGeometry>();
 const roles:Record<string,number>={};
 root.traverseVisible(n=>{if(!(n instanceof THREE.Mesh))return;meshes++;const p=n.geometry.getAttribute('position');if(p)triangles+=(n.geometry.index?.count??p.count)/3*(n instanceof THREE.InstancedMesh?n.count:1);geometries.add(n.geometry);if(isMark(n))marked++;
 for(const m of Array.isArray(n.material)?n.material:[n.material]){if(!materials.has(m)){materials.add(m);const role=visualMaterialRole(m);roles[role]=(roles[role]??0)+1;}for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);}});
 return {meshes,triangles,geometries:geometries.size,materials:materials.size,textures:textures.size,marked,roles};
}
const isMark=(n:THREE.Mesh)=>Boolean(n.userData.weaponPixelArt||n.name.startsWith('family-art-'));
function render(e:Entry,m:Model,box:THREE.Box3,canvas:HTMLCanvasElement,opts:{view:string;mode:string;lighting:string;scale:string;zoom:number;yaw:number;pitch:number;marks:boolean;span?:number;width?:number;height?:number}){
 const w=opts.width??(opts.scale==='native64'?64:opts.scale==='native128'?128:480),h=opts.height??w/2;
 canvas.width=w;canvas.height=h;light(opts.lighting);
 const def=views[opts.view]??views.side,center=box.getCenter(new THREE.Vector3()),dir=vec(def[0]).normalize();
 if(opts.yaw||opts.pitch){const spherical=new THREE.Spherical().setFromVector3(dir);spherical.theta+=opts.yaw;spherical.phi=THREE.MathUtils.clamp(spherical.phi+opts.pitch,.01,Math.PI-.01);dir.setFromSpherical(spherical);}
 camera.position.copy(center).addScaledVector(dir,150);camera.up.copy(opts.yaw||opts.pitch?new THREE.Vector3(0,1,0):vec(def[1]));camera.lookAt(center);camera.updateMatrixWorld(true);
 const projected=new THREE.Box3();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const size=projected.getSize(new THREE.Vector3()),aspect=w/h;
 const cohort=e.sidearm?'sidearm':'primary';
 const span=(opts.span??(opts.scale==='shared'?spans[cohort]:Math.max(size.x,size.y*aspect)*1.16))/opts.zoom;
 camera.left=-span/2;camera.right=span/2;camera.top=span/aspect/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();
 scene.add(m.model);
 const stats=meshStats(m.model),hidden:THREE.Mesh[]=[],restore:{mesh:THREE.Mesh;material:THREE.Material|THREE.Material[]}[]=[],owned=new Map<THREE.Material,THREE.Material>();
 try{
 m.model.traverseVisible(n=>{if(!(n instanceof THREE.Mesh))return;if((!opts.marks||opts.mode==='silhouette')&&isMark(n)){hidden.push(n);n.visible=false;return;}
 if(opts.mode==='roles'||opts.mode==='no-texture'){const original=n.material;restore.push({mesh:n,material:original});const replace=(mat:THREE.Material)=>{
 if(opts.mode==='roles'){const role=visualMaterialRole(mat);let x=roleMats.get(role);if(!x){x=new THREE.MeshBasicMaterial({color:roleColors[role]??0xc9ae88,side:THREE.DoubleSide});roleMats.set(role,x);}return x;}
 let clone=owned.get(mat);if(!clone){clone=mat.clone();for(const key of Object.keys(clone)){const obj=clone as unknown as Record<string,unknown>;if(obj[key] instanceof THREE.Texture)obj[key]=null;}clone.needsUpdate=true;owned.set(mat,clone);}return clone;};n.material=Array.isArray(original)?original.map(replace):replace(original);}
 });
 scene.overrideMaterial=opts.mode==='silhouette'?silhouette:opts.mode==='wire'?wire:null;
 renderer.setSize(w,h,false);renderer.render(scene,camera);draws++;
 canvas.getContext('2d')!.drawImage(renderer.domElement,0,0);
 return {...stats,calls:renderer.info.render.calls,renderedTriangles:renderer.info.render.triangles,span,width:w,height:h,cohort,mode:opts.mode,lighting:opts.lighting,view:opts.view};
 }finally{scene.overrideMaterial=null;for(const n of hidden)n.visible=true;for(const r of restore)r.mesh.material=r.material;for(const mat of owned.values())mat.dispose();scene.remove(m.model);}
}
function fileFor(path:string){return baselineFiles.get(path);}
function baselineRecord(e:Entry){return baseline?.reports?.flatMap((r:any)=>r.records).find((r:any)=>r.id===e.id);}
function baselinePanel(e:Entry){const record=baselineRecord(e);const scale=select('scale').value,mode=select('display').value;const key=mode==='silhouette'?(scale==='fit'&&view==='side'?'silhouette-fit':null):scale==='fit'?(view==='rear'?null:view+'-fit'):view!=='side'?null:scale==='shared'?'side-shared':scale==='native64'?'native-64':'native-128';return {record,panel:record?.panels?.find((p:any)=>p.name===key)};}
function showArchived(e:Entry){
 const img=get<HTMLImageElement>('image-a'),canvas=get<HTMLCanvasElement>('canvas-a'),{record,panel}=baselinePanel(e);
 if(urlA){URL.revokeObjectURL(urlA);urlA='';}
 const file=record&&panel?fileFor(record.platform+'/'+record.id+'/'+panel.name+'.png'):undefined;
 img.hidden=!file;canvas.hidden=true;img.removeAttribute('src');
 if(file){urlA=URL.createObjectURL(file);img.src=urlA;}
 get('title-a').textContent='A · Archived '+e.name;
 get('metrics-a').textContent=file?'WA0 '+String(baseline.revision).slice(0,12)+' · '+panel.name:'No matching archived image for this setting.';
 return file?panel.metrics:undefined;
}
function context(e:Entry){
 const host=get('context');host.replaceChildren();if(contextUrl){URL.revokeObjectURL(contextUrl);contextUrl='';}
 const file=fileFor('operator-context/'+e.id+'-game.png');if(!file){host.textContent='No archived operator frame for this reference. Use Operator Lab for live context.';return;}
 const img=document.createElement('img');contextUrl=URL.createObjectURL(file);img.src=contextUrl;img.alt=e.name+' in actual archived Operator Lab';host.append(img);
}
function draw(){
 frame=0;if(disposed)return;
 const historical=currentMode()==='baseline',scale=select('scale').value,mode=select('display').value,lighting=select('lighting').value;
 const baseOpts={view,mode,lighting,scale,zoom,yaw,pitch,marks:get<HTMLInputElement>('marks').checked};
 const chosen=historical?[['b',b] as const]:[['a',a] as const,['b',b] as const];
 let matched:any=null;
 if(historical){matched=showArchived(b);if(active.has('a')){active.get('a')!.model.cleanup();active.delete('a');}metrics.delete('a');}else{get<HTMLCanvasElement>('canvas-a').hidden=false;get<HTMLImageElement>('image-a').hidden=true;}
 for(const [slot,e] of chosen){
 const m=getModel(slot,e);
 let options=baseOpts;
 if(historical&&matched){options={...baseOpts,lighting:'baseline',mode:mode==='silhouette'?'silhouette':'material',marks:true,zoom:1,yaw:0,pitch:0,view:scale==='fit'?(mode==='silhouette'?'side':view):'side',span:matched.horizontalSpan,width:matched.width,height:matched.height} as typeof baseOpts;}
 const result=render(e,m.model,m.box,get<HTMLCanvasElement>('canvas-'+slot),options);
 metrics.set(slot,{id:e.id,...result,buildMs:m.buildMs,accepted:m.model.accepted});
 get('title-'+slot).textContent=slot.toUpperCase()+' · '+e.name+' · '+e.status;
 get('metrics-'+slot).textContent=result.meshes+' meshes · '+result.triangles+' triangles · '+result.calls+' isolated calls\n'+result.materials+' materials · '+result.textures+' textures · '+result.marked+' tagged marks\n'+Object.entries(result.roles).map(([k,v])=>k+': '+v).join(' · ');
 }
 context(b);
 get('message').textContent=historical?(matched?'Matched historical camera, scale and WA0 lighting. Live candidate shown at exact archived span.':'Historical image unavailable — candidate only.'):(scale==='shared'&&Boolean(a.sidearm)!==Boolean(b.sidearm)?'Separate native scale cohorts; not a direct size comparison.':'Live references · synchronized orientation and zoom.');
 document.body.dataset.draws=String(draws);document.body.dataset.ready='true';document.body.dataset.activeModels=String(active.size);document.body.dataset.geometryResources=String(renderer.info.memory.geometries);document.body.dataset.textureResources=String(renderer.info.memory.textures);
}
function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(()=>{try{draw();}catch(e){get('message').textContent=String(e);document.body.dataset.failed=String(e);console.error(e);}});}
const settings=['compare','scale','display','lighting','marks'];
function lockHistorical(){const h=currentMode()==='baseline';for(const id of ['lighting','marks'])get<HTMLInputElement>(id).disabled=h;select('display').querySelectorAll('option').forEach(o=>o.disabled=h&&!['material','silhouette'].includes(o.value));if(h){select('lighting').value='baseline';get<HTMLInputElement>('marks').checked=true;if(!['material','silhouette'].includes(select('display').value))select('display').value='material';target='b';updateTarget();zoom=1;yaw=pitch=0;}for(const id of ['zoom-in','zoom-out'])get<HTMLButtonElement>(id).disabled=h;}
for(const id of settings)get(id).addEventListener('change',()=>{lockHistorical();schedule();});
const updateTarget=()=>{for(const slot of ['a','b'])get('target-'+slot).setAttribute('aria-pressed',String(target===slot));};
for(const slot of ['a','b'] as const)get('target-'+slot).addEventListener('click',()=>{target=currentMode()==='baseline'?'b':slot;updateTarget();});
for(const key of Object.keys(views)){const btn=document.createElement('button');btn.textContent=key;btn.dataset.view=key;btn.addEventListener('click',()=>{view=key;yaw=pitch=0;for(const n of get('views').querySelectorAll('button'))n.setAttribute('aria-pressed',String(n===btn));schedule();});get('views').append(btn);}
get('reset').addEventListener('click',()=>{view='side';yaw=pitch=0;zoom=1;get('views').querySelector<HTMLButtonElement>('[data-view=side]')?.click();schedule();});
const changeZoom=(f:number)=>{if(currentMode()!=='baseline'){zoom=THREE.MathUtils.clamp(zoom*f,.4,4);schedule();}};
get('zoom-in').addEventListener('click',()=>changeZoom(1.15));get('zoom-out').addEventListener('click',()=>changeZoom(1/1.15));
for(const slot of ['a','b']){const stage=get('stage-'+slot);let pointer:number|null=null,x=0,y=0;stage.addEventListener('pointerdown',e=>{if(currentMode()==='baseline')return;pointer=e.pointerId;x=e.clientX;y=e.clientY;stage.setPointerCapture(pointer);});stage.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;yaw+=(e.clientX-x)*.012;pitch+=(e.clientY-y)*.012;x=e.clientX;y=e.clientY;schedule();});for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,()=>{pointer=null;});stage.addEventListener('wheel',e=>{e.preventDefault();changeZoom(Math.exp(-e.deltaY*.001));},{passive:false});}
const catalog=get('catalog');let observer:IntersectionObserver|null=null;let catalogGeneration=0;let thumbs=0;
function rebuild(){
 observer?.disconnect();catalog.replaceChildren();const gen=++catalogGeneration;
 const query=get<HTMLInputElement>('search').value.toLowerCase().trim();
 const filtered=entries.filter(e=>(e.name+' '+e.id).toLowerCase().includes(query)&&(!select('family').value||family(e)===select('family').value)&&(!select('category').value||category(e)===select('category').value)&&(!select('status-filter').value||e.status===select('status-filter').value)&&(!select('disposition').value||disposition(e)===select('disposition').value));
 get('count').textContent=filtered.length+' / '+entries.length+' references';document.body.dataset.catalogCount=String(filtered.length);
 const lookup=new Map(filtered.map(e=>[e.id,e]));
 observer=new IntersectionObserver(items=>{for(const item of items){if(!item.isIntersecting||gen!==catalogGeneration||disposed)continue;observer?.unobserve(item.target);const button=item.target as HTMLButtonElement,e=lookup.get(button.dataset.id!)!,canvas=button.querySelector('canvas')!;const m=construct(e);try{render(e,m,bounds(m.model),canvas,{view:'side',mode:'material',lighting:'baseline',scale:'fit',zoom:1,yaw:0,pitch:0,marks:true,width:160,height:80});thumbs++;document.body.dataset.thumbnails=String(thumbs);}finally{m.cleanup();}}},{root:catalog});
 for(const e of filtered){const button=document.createElement('button');button.className='entry';button.dataset.id=e.id;const canvas=document.createElement('canvas');canvas.width=160;canvas.height=80;const label=document.createElement('span');label.textContent=e.name+' · '+e.status;button.append(canvas,label);button.addEventListener('click',()=>{if(target==='a'&&currentMode()!=='baseline')a=e;else b=e;schedule();});catalog.append(button);observer.observe(button);}
}
for(const id of ['family','category','status-filter','disposition'])select(id).addEventListener('change',rebuild);get('search').addEventListener('input',rebuild);
get<HTMLInputElement>('baseline-input').addEventListener('change',async e=>{
 const gen=++importVersion,files=[...(e.target as HTMLInputElement).files??[]];const manifest=files.find(f=>f.name==='manifest.json'&&!f.webkitRelativePath.includes('operator-context/'));
 if(!manifest){get('baseline-status').textContent='Missing WA0 manifest.json';return;}
 try{const data=JSON.parse(await manifest.text());if(gen!==importVersion)return;if(!/^[0-9a-f]{40}$/.test(data.revision)||!Array.isArray(data.reports)||!data.reports.every((r:any)=>r.schema==='fieldwork-wa0-webgl-baseline'))throw Error('Unrecognized baseline');baselineFiles.clear();const prefix=manifest.webkitRelativePath.slice(0,-'manifest.json'.length);for(const f of files)if(f.webkitRelativePath.startsWith(prefix))baselineFiles.set(f.webkitRelativePath.slice(prefix.length),f);baseline=data;get('baseline-status').textContent='Loaded archive '+data.revision+' · '+baselineFiles.size+' files';schedule();}catch(err){get('baseline-status').textContent=String(err);}
});
function download(name:string,blob:Blob){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
get('export').addEventListener('click',()=>download('weapon-art-lab.json',new Blob([JSON.stringify({schema:'fieldwork-wa1-review',baselineRevision:baseline?.revision??null,comparison:currentMode(),settings:{view,zoom,yaw,pitch,scale:select('scale').value,lighting:select('lighting').value,mode:select('display').value},metrics:Object.fromEntries(metrics)},null,2)],{type:'application/json'})));
get('save').addEventListener('click',async()=>{const out=document.createElement('canvas');out.width=960;out.height=280;const c=out.getContext('2d')!;c.fillStyle='#252a27';c.fillRect(0,0,960,280);for(const [i,slot] of ['a','b'].entries()){const source=slot==='a'&&currentMode()==='baseline'?get<HTMLImageElement>('image-a'):get<HTMLCanvasElement>('canvas-'+slot);if(source instanceof HTMLImageElement){if(!source.hidden)await source.decode();else continue;}c.imageSmoothingEnabled=false;c.drawImage(source,i*480,0,480,240);c.fillStyle='#eeeeee';c.font='14px sans-serif';c.fillText(get('title-'+slot).textContent??'',i*480+8,260,464);}out.toBlob(blob=>{if(blob)download('weapon-art-comparison.png',blob);});});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();for(const m of active.values())m.model.cleanup();active.clear();silhouette.dispose();wire.dispose();for(const m of roleMats.values())m.dispose();renderer.dispose();renderer.forceContextLoss();if(urlA)URL.revokeObjectURL(urlA);if(contextUrl)URL.revokeObjectURL(contextUrl);},{once:true});
rebuild();schedule();
