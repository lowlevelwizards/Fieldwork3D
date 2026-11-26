import {WALL_EFFECTS,WALL_FINISHES,WALL_WITNESSES,wallSample,samplePixels,selectWallEvents} from './wall-material-lab-samples.ts';
import {PIXEL_SURFACES,pixelPattern} from './rendering/pixel-recipes.ts';
import {referenceWallPixels} from './wall-material-lab-reference.ts';
import {SRGB_BYTE_TO_LINEAR,linearToSRGBByte} from './rendering/surface-color-space.ts';
import {wearPixels,type WearTextureKind} from './rendering/pixel-decals.ts';
import {bakedWallSurfacePixels,type WallSurfaceRecipe} from './worldgen/wall-surface-recipe.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const condition=el<HTMLInputElement>('condition'),comparison=el<HTMLSelectElement>('comparison'),seed=el<HTMLInputElement>('seed');
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function paint(canvas:HTMLCanvasElement,bytes:Uint8Array,width:number,height:number){
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const image=ctx.createImageData(width,height);image.data.set(bytes);ctx.putImageData(image,0,0);
}
function figure(label:string){const root=node('figure'),canvas=node('canvas'),caption=node('figcaption',label);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);root.append(canvas,caption);return {root,canvas,caption};}
type Card={recipe:WallSurfaceRecipe;after:ReturnType<typeof figure>;before:ReturnType<typeof figure>;pair:HTMLDivElement;status:HTMLParagraphElement};
const cards:Card[]=[];
const finishCards:{recipe:WallSurfaceRecipe;canvas:HTMLCanvasElement}[]=[];
function audition(recipe:WallSurfaceRecipe,level:number){
 const p=samplePixels(recipe,level);
 return el<HTMLSelectElement>('density').value==='56'?{width:96,height:56,bytes:bakedWallSurfacePixels(recipe,level,96,56)}:p;
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
wallCard(el('combined'),'Kitchen wall','Cooking residue and sink splashes (separate anchors in maps)',wallSample(5,['grease','splash']));
for(const [i,w] of WALL_FINISHES.entries())wallCard(el('finishes'),w.name,'96 × '+wallSample(i).height+' world units',wallSample(i),false);
const materials=PIXEL_SURFACES.map(kind=>{const f=figure(kind.replaceAll('-',' '));el('materials').append(f.root);return {kind,canvas:f.canvas};});
const kinds=['dust','stain','scrape','scuff','oil','grease','rust','chip','crack','scratch','drip','mud','footprint','mineral','fade','soot','moss','paint-peel','fray','abrade'] as const satisfies readonly WearTextureKind[];
const masks=kinds.map(kind=>{const f=figure(kind.replaceAll('-',' '));el('masks').append(f.root);return {kind,canvas:f.canvas};});
const swatchColor=(kind:string):number=>/wood/.test(kind)?0xa37a50:/grass|foliage/.test(kind)?0x73925c:/asphalt/.test(kind)?0x62686c:/earth|gravel/.test(kind)?0x9a8166:/rubber/.test(kind)?0x454b4b:/brick/.test(kind)?0xab654e:/metal|steel|panel/.test(kind)?0x788e91:/fabric|carpet/.test(kind)?0x827e68:/tile|porcelain/.test(kind)?0xd5d8d0:/plastic/.test(kind)?0x758e80:/paper/.test(kind)?0xd6c8ad:0xb7b5a9;
function drawPatterns(){
 const n=Math.max(0,Math.min(99999,Math.round(Number(seed.value)||0)));
 for(const {kind,canvas} of materials){
  const bytes=pixelPattern(kind,n),color=swatchColor(kind);
  if(el<HTMLSelectElement>('material-view').value==='tinted')for(let i=0;i<bytes.length;i+=4)for(let j=0;j<3;j++)bytes[i+j]=linearToSRGBByte(SRGB_BYTE_TO_LINEAR[bytes[i+j]]*SRGB_BYTE_TO_LINEAR[(color>>((2-j)*8))&255]);
  paint(canvas,bytes,32,32);
 }
 for(const {kind,canvas} of masks){
  const bytes=wearPixels(kind,n);
  // Neutral swatch for alpha visibility; preserve the exact mask coverage.
  for(let i=0;i<bytes.length;i+=4){const a=bytes[i+3]/255;for(let j=0;j<3;j++)bytes[i+j]=Math.round(172*(1-a)+58*a);bytes[i+3]=255;}
  paint(canvas,bytes,32,32);
 }
}
function redraw(){
 const level=Number(condition.value),single=comparison.value==='single';
 el('condition-value').textContent=String(level);
 for(const {recipe,after,before,pair,status} of cards){
  const p=audition(recipe,level);paint(after.canvas,p.bytes,p.width,p.height);
  const previous=comparison.value==='reference';
  paint(before.canvas,previous?referenceWallPixels(recipe,level,p.width,p.height):audition(recipe,0).bytes,p.width,p.height);
  before.caption.textContent=previous?'MA0 · wear '+level:'Clean';
  before.root.hidden=single;pair.className=single?'single':'pair';
  after.caption.textContent='Wear '+level+'/100';
  const active=selectWallEvents(recipe,level);
  status.textContent=active.length?active.map(e=>WALL_WITNESSES[e.kind].label).join(' · '):'No active weathering at this level';
 }
 for(const {recipe,canvas} of finishCards){const p=audition(recipe,0);paint(canvas,p.bytes,p.width,p.height);}
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));
 el('status').textContent=WALL_EFFECTS.length+' wall effects · '+WALL_FINISHES.length+' wall finishes · '+materials.length+' pixel motifs · '+masks.length+' local wear masks';
}
let pending=0;
function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;redraw();});}
condition.addEventListener('input',schedule);comparison.addEventListener('change',schedule);el<HTMLSelectElement>('density').addEventListener('change',schedule);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.addEventListener('click',()=>{condition.value=b.dataset.level!;schedule();});
seed.addEventListener('change',drawPatterns);
el<HTMLSelectElement>('material-view').addEventListener('change',drawPatterns);
for(const tab of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))tab.addEventListener('click',()=>{
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-tab]'))b.setAttribute('aria-pressed',String(b===tab));
 for(const panel of document.querySelectorAll<HTMLElement>('[data-panel]'))panel.hidden=panel.dataset.panel!==tab.dataset.tab;
});
drawPatterns();redraw();
