/** Arsenal G2: authentic geometry-only Glock appearance showcase.
 * Read-only references deliberately bypass the primary-only factory recipe
 * and inventory systems until a real secondary weapon class exists.
 */
import * as THREE from 'three';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {workbenchFitDistance} from '../weapons/geometry/weapon-workbench-camera-fit.ts';
import {GLOCK_APPEARANCE_REFERENCES,buildGlockAppearance,clearGlockAppearance,
 type GlockAppearanceId} from '../weapons/geometry/glock-family-silhouettes.ts';

type View='side'|'quarter'|'opposite'|'clay';
class GlockGallerySnapshots{
 private renderer:THREE.WebGLRenderer|null=null;
 private readonly scene=new THREE.Scene();
 private readonly camera=new THREE.PerspectiveCamera(37,2.4,.1,300);
 private readonly cached=new Map<string,string>();
 private unavailable=false;
 constructor(){addArsenalInspectionLighting(this.scene);}
 render(id:GlockAppearanceId,view:View,size:'card'|'hero'):string|undefined{
  const key=[id,view,size].join('/');
  if(this.cached.has(key))return this.cached.get(key);
  if(this.unavailable)return undefined;
  let model:THREE.Group|null=null;
  try{
   if(!this.renderer){
    this.renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
    configureGraphicRendererOutput(this.renderer);
    this.renderer.setPixelRatio(1);
   }
   const width=size==='hero'?900:400,height=size==='hero'?360:175;
   this.renderer.setSize(width,height,false);
   this.camera.aspect=width/height;
   this.camera.updateProjectionMatrix();
   model=buildGlockAppearance(id,{monochrome:view==='clay'});
   this.scene.add(model);
   model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model);
   const center=bounds.getCenter(new THREE.Vector3());
   const distance=workbenchFitDistance(bounds,width,height,37,
    size==='hero'?.78:.68,false);
   const offset=view==='quarter'?.48:0;
   this.camera.position.set(center.x+distance*offset,
    center.y+distance*(view==='quarter'?.10:0),
    center.z+(view==='opposite'?-distance:distance));
   this.camera.lookAt(center);
   this.camera.updateProjectionMatrix();
   this.renderer.render(this.scene,this.camera);
   const encoded=this.renderer.domElement.toDataURL('image/webp',.82);
   if(this.cached.size>30)this.cached.clear();
   this.cached.set(key,encoded);
   return encoded;
  }catch{
   this.unavailable=true;
   return undefined;
  }finally{
   if(model){this.scene.remove(model);clearGlockAppearance(model);}
  }
 }
 dispose(){
  this.renderer?.dispose();this.renderer?.forceContextLoss();
  this.renderer=null;this.cached.clear();
 }
}

export function mountGlockArsenalGallery():HTMLElement{
 const section=document.createElement('section');
 section.className='arsenal-glock-gallery';
 section.setAttribute('aria-label','Glock family 3D appearance references');
 section.innerHTML=
  '<div class="arsenal-glock-header">'+
    '<div><span class="arsenal-overline">SIDEARMS / ART REFERENCE</span>'+
    '<h2>GLOCK FAMILY</h2></div>'+
    '<span class="arsenal-glock-notice">VISUAL PREVIEW · NOT YET EQUIPPABLE</span>'+
  '</div>'+
  '<div class="arsenal-glock-feature">'+
    '<div class="arsenal-glock-hero-visual" aria-live="polite"></div>'+
    '<div class="arsenal-glock-feature-copy">'+
      '<span class="arsenal-overline">GLOCK / FIELDWORK MASTER FORMS</span>'+
      '<h3 class="arsenal-glock-model"></h3>'+
      '<p class="arsenal-glock-description"></p>'+
      '<div class="arsenal-glock-view-controls" role="group" aria-label="3D model view"></div>'+
      '<p class="arsenal-glock-subnote">Real low-poly model geometry · Same shared Arsenal lighting. This is an art reference, not an issued secondary weapon.</p>'+
    '</div>'+
  '</div>'+
  '<div class="arsenal-glock-cards" role="group" aria-label="Glock family variants"></div>';
 const feature=section.querySelector<HTMLElement>('.arsenal-glock-hero-visual')!;
 const modelLabel=section.querySelector<HTMLElement>('.arsenal-glock-model')!;
 const desc=section.querySelector<HTMLElement>('.arsenal-glock-description')!;
 const controls=section.querySelector<HTMLElement>('.arsenal-glock-view-controls')!;
 const cards=section.querySelector<HTMLElement>('.arsenal-glock-cards')!;
 const renderer=new GlockGallerySnapshots();
 const images=new Map<GlockAppearanceId,HTMLElement>();
 const buttons=new Map<GlockAppearanceId,HTMLButtonElement>();
 let selected:GlockAppearanceId='glock-g19-gen3';
 let view:View='quarter';
 const views:readonly [View,string][]= [
  ['side','SIDE'],['quarter','THREE-QUARTER'],
  ['opposite','OPPOSITE'],['clay','CLAY']];
 const display=(host:HTMLElement,id:GlockAppearanceId,angle:View,size:'card'|'hero')=>{
  const source=renderer.render(id,angle,size);
  if(!source){host.textContent='3D preview unavailable';return;}
  const image=document.createElement('img');
  image.src=source;image.alt='';
  image.decoding='async';host.replaceChildren(image);
 };
 const refresh=()=>{
  const reference=GLOCK_APPEARANCE_REFERENCES.find(r=>r.id===selected)!;
  modelLabel.textContent=reference.name;
  desc.textContent=reference.description;
  display(feature,selected,view,'hero');
  for(const [id,button] of buttons)
   button.setAttribute('aria-pressed',String(id===selected));
  for(const button of controls.querySelectorAll<HTMLButtonElement>('button'))
   button.setAttribute('aria-pressed',String(button.dataset.view===view));
 };
 for(const [id,name] of views){
  const button=document.createElement('button');
  button.type='button';button.textContent=name;
  button.dataset.view=id;button.className='arsenal-glock-view';
  button.addEventListener('click',()=>{view=id;refresh();});
  controls.append(button);
 }
 for(const ref of GLOCK_APPEARANCE_REFERENCES){
  const button=document.createElement('button');button.type='button';
  button.className='arsenal-glock-card';
  button.setAttribute('aria-label','Inspect '+ref.name);
  const image=document.createElement('span');image.className='arsenal-glock-card-preview';
  const name=document.createElement('strong');name.textContent=ref.name;
  const note=document.createElement('small');note.textContent=ref.description;
  button.append(image,name,note);
  button.addEventListener('click',()=>{selected=ref.id;refresh();});
  cards.append(button);buttons.set(ref.id,button);images.set(ref.id,image);
 }
 // One shared context, rendered on demand only. Start after attachment.
 requestAnimationFrame(()=>{
  if(!section.isConnected)return;
  refresh();
  const sequence=[...GLOCK_APPEARANCE_REFERENCES];
  const pump=(index:number)=>{
   if(index>=sequence.length||!section.isConnected)return;
   const ref=sequence[index];
   const host=images.get(ref.id);
   if(host)display(host,ref.id,'quarter','card');
   if(index+1<sequence.length)requestAnimationFrame(()=>pump(index+1));
  };
  requestAnimationFrame(()=>pump(0));
 });
 window.addEventListener('pagehide',()=>renderer.dispose(),{once:true});
 return section;
}
