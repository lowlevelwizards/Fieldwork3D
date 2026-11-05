/** Compact, lazy 2D reference browser. One shared 3D operator canvas remains above it. */
import {FACTION_REFERENCES,type FactionReference} from './faction-reference-catalog.ts';
import {referenceVisualStatus} from './faction-reference-audit.ts';
import {unresolvedReferenceGaps} from './faction-reference-asset-registry.ts';
import {paintCamoPreview} from './operator-camo-preview-cache.ts';
export type ReferenceCompatibility={substituted:readonly string[];lostPrints:readonly string[]};
export type ReferenceBrowserHooks={
 onPreview:(id:string)=>void;onApply:(id:string)=>void;onClose:()=>void;
 compatibility:(id:string)=>ReferenceCompatibility;
};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,text?:string)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
const option=(value:string,label:string)=>{const x=el('option');x.value=value;x.textContent=label;return x;};
export class FactionReferenceBrowser{
 private readonly root:HTMLElement;
 private readonly hooks:ReferenceBrowserHooks;
 private readonly list:HTMLElement;
 private readonly detail:HTMLElement;
 private readonly search:HTMLInputElement;
 private readonly organization:HTMLSelectElement;
 private readonly era:HTMLSelectElement;
 private readonly country:HTMLSelectElement;
 private readonly summary:HTMLElement;
 private readonly apply:HTMLButtonElement;
 private chosen=FACTION_REFERENCES[0].id;
 private readOnly=false;
 constructor(root:HTMLElement,hooks:ReferenceBrowserHooks){
  this.root=root;this.hooks=hooks;
  root.classList.add('studio-reference-panel');
  const heading=el('div','reference-top');
  const title=el('div');
  title.append(el('strong','reference-heading','REFERENCE KITS'),
   el('small','reference-intro','Curated dated appearances · preview only until you apply'));
  const close=el('button','reference-close','BACK TO CUSTOMIZE');
  close.type='button';close.addEventListener('click',()=>hooks.onClose());
  heading.append(title,close);
  const controls=el('div','reference-controls');
  this.search=el('input','reference-search');this.search.type='search';
  this.search.placeholder='Search faction, country, equipment…';
  this.search.setAttribute('aria-label','Search faction references');
  this.organization=el('select');this.organization.setAttribute('aria-label','Filter organization');
  for(const [v,t] of [['all','ALL ROLES'],['military','MILITARY'],
   ['special-operations','SPECIAL OPERATIONS'],['police','POLICE'],
   ['irregular','IRREGULAR']])this.organization.append(option(v,t));
  this.era=el('select');this.era.setAttribute('aria-label','Filter era');
  for(const [v,t] of [['all','ALL ERAS'],['historic','BEFORE 2000'],
   ['modern','2000 ONWARD']])this.era.append(option(v,t));
  this.country=el('select');this.country.setAttribute('aria-label','Filter country');
  this.country.append(option('all','ALL COUNTRIES'));
  for(const c of [...new Set(FACTION_REFERENCES.map(x=>x.country))].sort())
   this.country.append(option(c,c.toUpperCase()));
  controls.append(this.search,this.organization,this.era,this.country);
  this.summary=el('small','reference-count');
  this.list=el('div','reference-list');
  this.list.setAttribute('aria-label','Faction reference choices');
  this.detail=el('div','reference-detail');
  this.apply=el('button','reference-apply','USE COMPATIBLE LOOK');
  this.apply.type='button';
  this.apply.addEventListener('click',()=>hooks.onApply(this.chosen));
  for(const c of [this.search,this.organization,this.era,this.country])
   c.addEventListener(c===this.search?'input':'change',()=>this.renderList());
  root.replaceChildren(heading,controls,this.summary,this.list,this.detail,this.apply);
  root.hidden=true;
  this.renderList();this.renderDetail();
 }
 get selectedId(){return this.chosen;}
 show(readonly=false){
  this.readOnly=readonly;
  this.root.hidden=false;
  this.renderList();this.renderDetail();
  this.hooks.onPreview(this.chosen);
 }
 hide(){this.root.hidden=true;}
 select(id:string){
  if(!FACTION_REFERENCES.some(x=>x.id===id))return;
  this.chosen=id;this.renderList();this.renderDetail();
  if(!this.root.hidden)this.hooks.onPreview(id);
 }
 refresh(readonly=false){
  this.readOnly=readonly;
  if(!this.root.hidden)this.renderDetail();
 }
 private renderList(){
  const query=this.search.value.trim().toLowerCase();
  const found=FACTION_REFERENCES.filter(r=>
   (this.organization.value==='all'||r.organization===this.organization.value)&&
   (this.country.value==='all'||r.country===this.country.value)&&
   (this.era.value==='all'||(this.era.value==='historic'?r.era.start<2000:r.era.end>=2000))&&
   (!query||[r.name,r.country,r.weaponFamily,r.summary,r.era.label,r.uniformCamo??'']
    .some(x=>x.toLowerCase().includes(query))));
  this.summary.textContent=found.length+' / '+FACTION_REFERENCES.length+' REFERENCE KITS';
  const fragment=document.createDocumentFragment();
  for(const r of found){
   const button=el('button','reference-card');
   button.type='button';button.setAttribute('aria-pressed',String(this.chosen===r.id));
   const swatch=el('span','reference-pattern');
   if(r.uniformCamo){
    const canvas=el('canvas');canvas.setAttribute('aria-hidden','true');
    paintCamoPreview(canvas,r.uniformCamo);swatch.append(canvas);
   }else swatch.classList.add('reference-pattern-solid');
   const body=el('span','reference-card-copy');
   body.append(el('strong','',r.name),el('small','',r.country+' · '+r.era.label));
   button.append(swatch,body);
   button.addEventListener('click',()=>this.select(r.id));
   fragment.append(button);
  }
  if(!found.length)fragment.append(el('p','reference-empty','No references match those filters.'));
  this.list.replaceChildren(fragment);
 }
 private renderDetail(){
  const r=FACTION_REFERENCES.find(x=>x.id===this.chosen) as FactionReference;
  const status=referenceVisualStatus(r);
  const fit=this.hooks.compatibility(r.id);
  this.detail.replaceChildren();
  this.detail.append(
   el('h3','',r.name),
   el('p','reference-meta',r.country+' · '+r.era.label+' · '+r.organization.replace(/-/g,' ')),
   el('p','',r.summary),
   el('p','reference-meta','RECOMMENDED WEAPON FAMILY · '+r.weaponFamily),
   el('p','reference-status',status==='missing-defining-assets'?
    'RECOGNIZABLE APPROXIMATION · DEFINING DETAILS MISSING':'RECOGNIZABLE APPROXIMATION'),
   el('p','reference-sources',r.sourceNotes)
  );
  const missing=unresolvedReferenceGaps(r);
  if(missing.length){
   const block=el('div','reference-gap-list');
   block.append(el('strong','','MISSING VISUAL DETAILS'));
   for(const gap of missing)
    block.append(el('span','',gap.label+' · '+gap.importance));
   this.detail.append(block);
  }
  if(fit.substituted.length||fit.lostPrints.length){
   const warnings=el('p','reference-compat-warning',
    'YOUR EQUIPPED KIT WILL SUBSTITUTE '+fit.substituted.length+
    ' STYLE(S) AND OMIT '+fit.lostPrints.length+' FABRIC PRINT(S): '+
    [...fit.substituted,...fit.lostPrints].join(', ')+'.');
   this.detail.append(warnings);
  }else this.detail.append(el('p','reference-compat-ok',
   'Selected operator kit supports this reference appearance.'));
  this.apply.disabled=this.readOnly;
  this.apply.textContent=this.readOnly?'ACTIVE OPERATION · VIEW ONLY':'USE COMPATIBLE LOOK';
 }
}
