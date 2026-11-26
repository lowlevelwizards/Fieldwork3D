import {WALL_EFFECTS,WALL_FINISHES,WALL_WITNESSES,wallSample,samplePixels,selectWallEvents} from './wall-material-lab-samples.ts';
import {PIXEL_SURFACES,pixelPattern} from './rendering/pixel-recipes.ts';
import {wearPixels,type WearTextureKind} from './rendering/pixel-decals.ts';
import type {WallSurfaceRecipe} from './worldgen/wall-surface-recipe.ts';
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
function wallCard(parent:HTMLElement,title:string,context:string,recipe:WallSurfaceRecipe,compare=true){
 const card=node('article');card.className='card';card.append(node('h3',title),node('p',context));
 const pair=node('div');pair.className=compare?'pair':'single';
 const before=figure(title+' · clean'),after=figure(title+' · current');
 if(compare){pair.append(before.root);const p=samplePixels(recipe,0);paint(before.canvas,p.bytes,p.width,p.height);}
 pair.append(after.root);const status=node('p');status.className='threshold';card.append(pair,status);parent.append(card);
 if(compare)cards.push({recipe,before,after,pair,status});
 else{const p=samplePixels(recipe,0);paint(after.canvas,p.bytes,p.width,p.height);after.caption.textContent='Base finish';}
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
function drawPatterns(){
 const n=Math.max(0,Math.min(99999,Math.round(Number(seed.value)||0)));
 for(const {kind,canvas} of materials)paint(canvas,pixelPattern(kind,n),32,32);
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
  const p=samplePixels(recipe,level);paint(after.canvas,p.bytes,p.width,p.height);
  before.root.hidden=single;pair.className=single?'single':'pair';
  after.caption.textContent='Wear '+level+'/100';
  const active=selectWallEvents(recipe,level);
  status.textContent=active.length?active.map(e=>WALL_WITNESSES[e.kind].label).join(' · '):'No active weathering at this level';
 }
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));
 el('status').textContent=WALL_EFFECTS.length+' wall effects · '+WALL_FINISHES.length+' wall finishes · '+materials.length+' pixel motifs · '+masks.length+' local wear masks';
}
let pending=0;
function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;redraw();});}
condition.addEventListener('input',schedule);comparison.addEventListener('change',schedule);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-level]'))b.addEventListener('click',()=>{condition.value=b.dataset.level!;schedule();});
seed.addEventListener('change',drawPatterns);
drawPatterns();redraw();
