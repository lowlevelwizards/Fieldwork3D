import {WALL_EFFECTS,WALL_FINISHES,WALL_WITNESSES,wallSample,samplePixels,selectWallEvents} from './wall-material-lab-samples.ts';
import {PIXEL_SURFACES,pixelPattern} from './rendering/pixel-recipes.ts';
import {FLOOR_WITNESSES,FIXTURE_WITNESSES,floorWitness,fixtureWitness} from './wall-material-lab-context.ts';
import {wallDensity} from './rendering/material-art-scale.ts';
import {createMaterialSpecimen} from './wall-material-lab-specimen.ts';
import {maWallPixels} from './wall-material-lab-ma-reference.ts';
import {referenceWallPixels} from './wall-material-lab-reference.ts';
import {SRGB_BYTE_TO_LINEAR,linearToSRGBByte} from './rendering/surface-color-space.ts';
import {wearPixels,type WearTextureKind} from './rendering/pixel-decals.ts';
import {bakedWallSurfacePixels,type WallSurfaceRecipe,type WallEffect} from './worldgen/wall-surface-recipe.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const condition=el<HTMLInputElement>('condition'),comparison=el<HTMLSelectElement>('comparison'),seed=el<HTMLInputElement>('seed');
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function paint(canvas:HTMLCanvasElement,bytes:Uint8Array,width:number,height:number,physicalW=width,physicalH=height){
 canvas.style.setProperty('--metric-width',physicalW*2+'px');canvas.parentElement?.style.setProperty('--metric-width',physicalW*2+'px');
 canvas.parentElement?.style.setProperty('--grid-x',100*8/physicalW+'%');canvas.parentElement?.style.setProperty('--grid-y',100*8/physicalH+'%');
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const image=ctx.createImageData(width,height);image.data.set(bytes);ctx.putImageData(image,0,0);
}
function figure(label:string){const root=node('figure'),canvas=node('canvas'),caption=node('figcaption',label);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);const wrap=node('div');wrap.className='grid-canvas';wrap.append(canvas);root.append(wrap,caption);return {root,canvas,caption};}
type Card={recipe:WallSurfaceRecipe;after:ReturnType<typeof figure>;before:ReturnType<typeof figure>;pair:HTMLDivElement;status:HTMLParagraphElement};
const cards:Card[]=[];
const finishCards:{recipe:WallSurfaceRecipe;canvas:HTMLCanvasElement}[]=[];
function audition(recipe:WallSurfaceRecipe,level:number){
 const palette=el<HTMLSelectElement>('wall-palette').value,scale=Number(el<HTMLInputElement>('mark-scale').value)/100;
 recipe={...recipe,artSeed:Number(el<HTMLSelectElement>('variant').value),color:palette==='light'?0xd4d4c5:palette==='dark'?0x565f59:recipe.color,events:recipe.events.map(e=>({...e,width:Math.min(recipe.length,e.width*scale),height:Math.min(recipe.height,e.height*scale)}))};
 const p=samplePixels(recipe,level);
 const result=el<HTMLSelectElement>('density').value==='56'?{width:96,height:56,bytes:bakedWallSurfacePixels(recipe,level,96,56)}:p;
 const strength=Number(el<HTMLInputElement>('mark-strength').value)/100;
 if(strength<1&&level>0){const clean=bakedWallSurfacePixels(recipe,0,result.width,result.height);for(let i=0;i<clean.length;i++)if(i%4!==3)result.bytes[i]=linearToSRGBByte(SRGB_BYTE_TO_LINEAR[clean[i]]*(1-strength)+SRGB_BYTE_TO_LINEAR[result.bytes[i]]*strength);}
 return result;
}
function wallCard(parent:HTMLElement,title:string,context:string,recipe:WallSurfaceRecipe,compare=true){
 const card=node('article');card.className='card';card.append(node('h3',title),node('p',context));
 const pair=node('div');pair.className=compare?'pair':'single';
 const before=figure(title+' · clean'),after=figure(title+' · current');
 if(compare){pair.append(before.root);const p=samplePixels(recipe,0);paint(before.canvas,p.bytes,p.width,p.height);}
 pair.append(after.root);const status=node('p');status.className='threshold';card.append(pair,status);parent.append(card);
 if(compare)cards.push({recipe,before,after,pair,status});
 else{finishCards.push({recipe,canvas:after.canvas});const p=audition(recipe,0);paint(after.canvas,p.bytes,p.width,p.height);after.caption.textContent='Base finish';}
}
for(const kind of WALL_EFFECTS){
 const w=WALL_WITNESSES[kind];wallCard(el('effects'),w.label,w.context+' · '+WALL_FINISHES[w.finish].name+' · starts at '+w.event.threshold,wallSample(w.finish,[kind]));
}
wallCard(el('combined'),'Exterior masonry','Damp foundation, moss and sill runoff',wallSample(2,['damp','moss','runoff','crack']));
wallCard(el('combined'),'Industrial cladding','Sun fading and seam corrosion',wallSample(6,['fade','rust']));
wallCard(el('combined'),'Painted corridor','Door traffic, jamb chips and repair',wallSample(1,['contact','chip','repair']));
wallCard(el('combined'),'Kitchen wall','Cooking residue and sink splashes at separate anchors',(()=>{const r=wallSample(5,['grease','splash']);return {...r,events:r.events.map(e=>({...e,x:e.kind==='grease'?29:67}))};})());
for(const [i,w] of WALL_FINISHES.entries())wallCard(el('finishes'),w.name,'96 × '+wallSample(i).height+' world units',wallSample(i),false);
const materials=PIXEL_SURFACES.map(kind=>{const f=figure(kind.replaceAll('-',' '));el('materials').append(f.root);return {kind,canvas:f.canvas};});
const kinds=['dust','stain','scrape','scuff','oil','grease','rust','chip','crack','scratch','drip','mud','footprint','mineral','fade','soot','moss','paint-peel','fray','abrade'] as const satisfies readonly WearTextureKind[];
const masks=kinds.map(kind=>{const root=node('article');root.append(node('h3',kind.replaceAll('-',' ')));const variants=node('div');variants.className='mask-variants';const canvases=Array.from({length:4},(_,i)=>{const f=figure(String.fromCharCode(65+i));variants.append(f.root);return f.canvas;});root.append(variants);el('masks').append(root);return {kind,canvases};});
const swatchColor=(kind:string):number=>/wood/.test(kind)?0xa37a50:/grass|foliage/.test(kind)?0x73925c:/asphalt/.test(kind)?0x62686c:/earth|gravel/.test(kind)?0x9a8166:/rubber/.test(kind)?0x454b4b:/brick/.test(kind)?0xab654e:/metal|steel|panel/.test(kind)?0x788e91:/fabric|carpet/.test(kind)?0x827e68:/tile|porcelain/.test(kind)?0xd5d8d0:/plastic/.test(kind)?0x758e80:/paper/.test(kind)?0xd6c8ad:0xb7b5a9;
function drawPatterns(){
 const n=Math.max(0,Math.min(99999,Math.round(Number(seed.value)||0)));
 if(!el('materials').closest<HTMLElement>('[data-panel]')?.hidden)for(const {kind,canvas} of materials){
  const bytes=pixelPattern(kind,n),color=swatchColor(kind);
  if(el<HTMLSelectElement>('material-view').value==='tinted')for(let i=0;i<bytes.length;i+=4)for(let j=0;j<3;j++)bytes[i+j]=linearToSRGBByte(SRGB_BYTE_TO_LINEAR[bytes[i+j]]*SRGB_BYTE_TO_LINEAR[(color>>((2-j)*8))&255]);
  paint(canvas,bytes,32,32);
 }
 if(!el('masks').closest<HTMLElement>('[data-panel]')?.hidden)for(const {kind,canvases} of masks)for(const [variant,canvas] of canvases.entries()){
  const bytes=wearPixels(kind,variant);
  // Neutral swatch for alpha visibility; preserve the exact mask coverage.
  for(let i=0;i<bytes.length;i+=4){const a=bytes[i+3]/255;for(let j=0;j<3;j++)bytes[i+j]=Math.round(172*(1-a)+58*a);bytes[i+3]=255;}
  paint(canvas,bytes,32,32);
 }
}
const contexts:{before:ReturnType<typeof figure>;after:ReturnType<typeof figure>;pair:HTMLDivElement;sample:(level:number,seed:number)=>{width:number;height:number;bytes:Uint8Array}}[]=[];
function contextCard(parent:HTMLElement,title:string,sample:(level:number,seed:number)=>{width:number;height:number;bytes:Uint8Array}){
 const card=node('article');card.className='card';card.append(node('h3',title));
 const pair=node('div');pair.className='pair';const before=figure('Clean'),after=figure('Current wear');
 pair.append(before.root,after.root);card.append(pair);parent.append(card);contexts.push({before,after,pair,sample});
}
FLOOR_WITNESSES.forEach((w,i)=>contextCard(el('floor-context'),w.name,(level,seed)=>floorWitness(i,level,seed)));
FIXTURE_WITNESSES.forEach((w,i)=>contextCard(el('fixture-context'),w.name,(level,seed)=>fixtureWitness(i,level,seed)));
const specimenEffect=el<HTMLSelectElement>('specimen-effect');
for(const kind of WALL_EFFECTS){const o=node('option',WALL_WITNESSES[kind].label);o.value=kind;specimenEffect.append(o);}
let specimen:ReturnType<typeof createMaterialSpecimen>|undefined;
function drawSpecimen(){
 if(document.querySelector<HTMLElement>('[data-panel="specimen"]')?.hidden)return;
 try{
  specimen??=createMaterialSpecimen(el<HTMLCanvasElement>('specimen-canvas'));
  const kind=specimenEffect.value as WallEffect,p=audition(wallSample(WALL_WITNESSES[kind].finish,[kind]),Number(condition.value));
  specimen.draw(p.bytes,p.width,p.height,kind,el<HTMLSelectElement>('specimen-zoom').value==='close',el<HTMLSelectElement>('specimen-view').value==='front');
 }catch(error){el('specimen-error').textContent='3D unavailable: '+String(error);}
}
let tactical:ReturnType<typeof import('./wall-material-lab-tactical.ts').createTacticalMaterialPreview>|undefined;
let tacticalBusy=false;
el('render-tactical').addEventListener('click',async()=>{
 if(tacticalBusy)return;tacticalBusy=true;
 const status=el('tactical-status'),button=el<HTMLButtonElement>('render-tactical');
 button.disabled=true;status.textContent='Building production scene…';
 try{
  tactical??=(await import('./wall-material-lab-tactical.ts')).createTacticalMaterialPreview(el('tactical-host'));
  const building=el<HTMLSelectElement>('tactical-building').value as Parameters<typeof tactical.draw>[0],seed=Number(el<HTMLInputElement>('tactical-seed').value)||23;
  tactical.draw(building,seed,Number(condition.value),el<HTMLSelectElement>('tactical-distance').value==='close');
  status.textContent=building+' · seed '+seed+' · wear '+condition.value+'/100';
 }catch(error){status.textContent='Scene unavailable: '+String(error);}
 finally{tacticalBusy=false;button.disabled=false;}
});
function redraw(){
 const level=Number(condition.value),single=comparison.value==='single';
 el('condition-value').textContent=String(level);
 const p0=audition(wallSample(0),level),d=wallDensity(96,56,p0.width,p0.height);
 el('art-scale-info').textContent='Wall: '+p0.width+' × '+p0.height+' texels · '+d.x.toFixed(2)+' × '+d.y.toFixed(2)+' world units per texel · operator height 40 units.';
 for(const {recipe,after,before,pair,status} of cards){
  if(pair.closest<HTMLElement>('[data-panel]')?.hidden)continue;
  const p=audition(recipe,level);paint(after.canvas,p.bytes,p.width,p.height,recipe.length,recipe.height);
  const previous=comparison.value==='reference',ma=comparison.value==='ma';
  paint(before.canvas,previous?referenceWallPixels(recipe,level,p.width,p.height):ma?maWallPixels(recipe,level,p.width,p.height):audition(recipe,0).bytes,p.width,p.height,recipe.length,recipe.height);
  before.caption.textContent=previous?'MA0 · wear '+level:ma?'MA · wear '+level:'Clean';
  before.root.hidden=single;pair.className=single?'single':'pair';
  after.caption.textContent='Wear '+level+'/100';
  const active=selectWallEvents(recipe,level);
  status.textContent=active.length?active.map(e=>WALL_WITNESSES[e.kind].label).join(' · '):'No active weathering at this level';
 }
 for(const {recipe,canvas} of finishCards){if(canvas.closest<HTMLElement>('[data-panel]')?.hidden)continue;const p=audition(recipe,0);paint(canvas,p.bytes,p.width,p.height,recipe.length,recipe.height);}
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));
 for(const {before,after,pair,sample} of contexts){
  if(pair.closest<HTMLElement>('[data-panel]')?.hidden)continue;
  const variant=Number(el<HTMLSelectElement>('variant').value),p=sample(level,variant),clean=sample(0,variant);
  const dim=pair.closest<HTMLElement>('[data-panel]')?.dataset.panel==='floors'?96:48;
  paint(before.canvas,clean.bytes,clean.width,clean.height,dim,dim);paint(after.canvas,p.bytes,p.width,p.height,dim,dim);
  before.root.hidden=single;pair.className=single?'single':'pair';after.caption.textContent='Wear '+level+'/100';
 }
 document.body.classList.toggle('metric',el<HTMLSelectElement>('metric-view').value==='metric');document.body.classList.toggle('show-grid',el<HTMLInputElement>('grid-view').checked);
 drawPatterns();drawSpecimen();
 el('status').textContent=WALL_EFFECTS.length+' wall effects · '+WALL_FINISHES.length+' wall finishes · '+materials.length+' pixel motifs · '+masks.length+' local wear masks';
}
let pending=0;
function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;redraw();});}
condition.addEventListener('input',schedule);comparison.addEventListener('change',schedule);el<HTMLSelectElement>('density').addEventListener('change',schedule);el<HTMLSelectElement>('variant').addEventListener('change',schedule);
for(const id of ['specimen-effect','specimen-zoom','specimen-view','metric-view','grid-view','wall-palette'])el(id).addEventListener('change',schedule);
for(const id of ['mark-scale','mark-strength'])el(id).addEventListener('input',schedule);
window.addEventListener('resize',schedule);window.addEventListener('pagehide',()=>{specimen?.dispose();specimen=undefined;});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.addEventListener('click',()=>{condition.value=b.dataset.level!;schedule();});
seed.addEventListener('change',drawPatterns);
el<HTMLSelectElement>('material-view').addEventListener('change',drawPatterns);
for(const tab of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))tab.addEventListener('click',()=>{
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))b.setAttribute('aria-pressed',String(b===tab));
 for(const panel of document.querySelectorAll<HTMLElement>('[data-panel]'))panel.hidden=panel.dataset.panel!==tab.dataset.tab;
 schedule();
 const panel=document.querySelector<HTMLElement>('[data-panel="'+tab.dataset.tab+'"]');panel?.scrollIntoView({block:'start'});
});
redraw();
