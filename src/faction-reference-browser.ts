/** Compact, lazy 2D reference browser. One shared 3D operator canvas remains above it. */
import {FACTION_REFERENCES,type FactionReference} from './faction-reference-catalog.ts';
import {referenceVisualStatus} from './faction-reference-audit.ts';
import {unresolvedReferenceGaps} from './faction-reference-asset-registry.ts';
import {paintCamoPreview} from './operator-camo-preview-cache.ts';
import {referenceWeaponChoice,referenceWeaponOptions} from './faction-reference-weapons.ts';
import {FACTION_TIMELINES,TIMELINE_ORGANIZATIONS,timelineForReference}
 from './faction-reference-timelines.ts';
import {resolveTimelineYear,timelineById} from './faction-reference-timeline-resolver.ts';
import {equipmentAtYear,compareEquipmentYears,researchTimelineCoverage}
 from './faction-reference-equipment-resolver.ts';
import {historicalEvidence} from './faction-reference-evidence.ts';
import {generateHistoricalLoadout,type HistoricalLoadoutProposal,type GenerationMode}
 from './faction-reference-loadout-generator.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
export type ReferenceCompatibility={substituted:readonly string[];lostPrints:readonly string[]};
export type ReferenceBrowserHooks={
 onPreview:(id:string)=>void;onApply:(id:string)=>void;onClose:()=>void;
 compatibility:(id:string)=>ReferenceCompatibility;
 proposalBaseline?:()=>EquipmentLoadout|undefined;
 onProposalPreview?:(proposal:HistoricalLoadoutProposal|null)=>void;
 onApplyProposedLook?:(proposal:HistoricalLoadoutProposal)=>void;
 onApplyProposedEquipment?:(proposal:HistoricalLoadoutProposal)=>void;
 canApplyProposedEquipment?:()=>boolean;
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
 private readonly view:HTMLSelectElement;
 private readonly timelineControls:HTMLElement;
 private readonly timeline:HTMLSelectElement;
 private readonly timelineYear:HTMLInputElement;
 private readonly timelineEnvironment:HTMLSelectElement;
 private readonly timelineStatus:HTMLElement;
 private readonly historicalPanel:HTMLElement;
 private readonly compareYear:HTMLInputElement;
 private generatorMode:GenerationMode='evidence-backed';
 private generatorRole='';private generatorTheater='';
 private generatorSeed=0;private proposal:HistoricalLoadoutProposal|null=null;
 private readonly proposalLocks=new Set<string>();
 private readonly proposalAlternatives=new Map<string,string>();
 private timelineMode=false;
 private timelineHasMatch=true;
 private readonly summary:HTMLElement;
 private readonly apply:HTMLButtonElement;
 private chosen=FACTION_REFERENCES[0].id;
 private readonly weaponPreviewOverrides=new Map<string,string>();
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
  this.view=el('select');this.view.setAttribute('aria-label','Browse reference mode');
  this.view.append(option('kits','REFERENCE KITS'),option('timeline','FACTION TIMELINES'));
  controls.append(this.view,this.search,this.organization,this.era,this.country);
  this.timelineControls=el('div','reference-controls');this.timelineControls.hidden=true;
  this.timeline=el('select');this.timeline.setAttribute('aria-label','Faction timeline');
  for(const item of FACTION_TIMELINES){
   const org=TIMELINE_ORGANIZATIONS.find(o=>o.id===item.organizationId);
   this.timeline.append(option(item.id,(org?.name??item.organizationId)+' · '+item.label));
  }
  this.timelineYear=el('input');this.timelineYear.type='number';
  this.timelineYear.min='1800';this.timelineYear.max='2100';this.timelineYear.step='1';
  this.timelineYear.value='1990';this.timelineYear.setAttribute('aria-label','Reference year');
  this.timelineEnvironment=el('select');
  this.timelineEnvironment.setAttribute('aria-label','Reference environment');
  for(const [id,label] of [['all','ALL ENVIRONMENTS'],['woodland','WOODLAND'],
   ['desert','DESERT'],['urban','URBAN'],['mixed','MIXED']])
   this.timelineEnvironment.append(option(id,label));
  this.timelineControls.append(this.timeline,this.timelineYear,this.timelineEnvironment);
  this.timelineStatus=el('small','reference-timeline-status');this.timelineStatus.hidden=true;
  this.historicalPanel=el('section','reference-historical-panel');
  this.historicalPanel.hidden=true;
  this.compareYear=el('input');this.compareYear.type='number';
  this.compareYear.min='1800';this.compareYear.max='2100';this.compareYear.step='1';
  this.compareYear.value='2010';this.compareYear.setAttribute('aria-label','Compare equipment year');
  this.compareYear.addEventListener('change',()=>this.renderHistorical());
  this.view.addEventListener('change',()=>{
   this.clearProposal();
   this.timelineMode=this.view.value==='timeline';
   this.timelineControls.hidden=!this.timelineMode;
   for(const control of [this.search,this.organization,this.era,this.country])
    control.hidden=this.timelineMode;
   if(this.timelineMode){
    const group=timelineForReference(this.chosen);
    if(group)this.timeline.value=group.id;
    const chosen=FACTION_REFERENCES.find(r=>r.id===this.chosen);
    const snap=group?.snapshots.find(x=>x.referenceId===this.chosen);
    this.timelineYear.value=String(snap?.representativeYear??chosen?.era.start??1990);
   }
   this.renderList();this.renderDetail();
  });
  this.timeline.addEventListener('change',()=>{
   this.clearProposal();this.generatorRole=timelineById(this.timeline.value)?.role??'';
   this.generatorTheater='';
   const first=timelineById(this.timeline.value)?.snapshots[0];
   if(first)this.timelineYear.value=String(first.representativeYear);
   this.timelineEnvironment.value='all';
   this.renderList();
  });
  for(const c of [this.timelineYear,this.timelineEnvironment])
   c.addEventListener('change',()=>{this.clearProposal();this.renderList();});
  this.summary=el('small','reference-count');
  this.list=el('div','reference-list');
  this.list.setAttribute('aria-label','Faction reference choices');
  this.detail=el('div','reference-detail');
  this.apply=el('button','reference-apply','USE COMPATIBLE LOOK');
  this.apply.type='button';
  this.apply.addEventListener('click',()=>hooks.onApply(this.chosen));
  for(const c of [this.search,this.organization,this.era,this.country])
   c.addEventListener(c===this.search?'input':'change',()=>this.renderList());
  root.replaceChildren(heading,controls,this.timelineControls,this.timelineStatus,
   this.historicalPanel,this.summary,this.list,this.detail,this.apply);
  root.hidden=true;
  this.renderList();this.renderDetail();
 }
 get selectedId(){return this.chosen;}
 /** Nonpersistent preview variant; applying a look never purchases/issues a rifle. */
 get selectedWeaponPresetId(){
  return this.weaponPreviewOverrides.get(this.chosen) ??
   referenceWeaponChoice(this.chosen).presetId;
 }
 show(readonly=false){
  this.readOnly=readonly;
  this.root.hidden=false;
  this.renderList();this.renderDetail();
  this.hooks.onPreview(this.chosen);
 }
 hide(){this.clearProposal();this.root.hidden=true;}
 select(id:string){
  if(!FACTION_REFERENCES.some(x=>x.id===id))return;
  this.clearProposal();this.chosen=id;this.renderList();this.renderDetail();
  if(!this.root.hidden)this.hooks.onPreview(id);
 }
 refresh(readonly=false){
  this.readOnly=readonly;
  if(!this.root.hidden)this.renderDetail();
 }
 private renderList(){
  const query=this.search.value.trim().toLowerCase();
  const active=timelineById(this.timeline.value);
  const year=Number(this.timelineYear.value);
  const environment=this.timelineEnvironment.value;
  const timelineResult=active?resolveTimelineYear(active,year,
   environment==='all'?undefined:environment as FactionReference['environment']):null;
  const found=this.timelineMode?(timelineResult?.matches.map(x=>x.reference)??[]):
   FACTION_REFERENCES.filter(r=>
   (this.organization.value==='all'||r.organization===this.organization.value)&&
   (this.country.value==='all'||r.country===this.country.value)&&
   (this.era.value==='all'||(this.era.value==='historic'?r.era.start<2000:r.era.end>=2000))&&
   (!query||[r.name,r.country,r.weaponFamily,r.summary,r.era.label,r.uniformCamo??'']
    .some(x=>x.toLowerCase().includes(query))));
  this.timelineHasMatch=!this.timelineMode||found.length>0;
  this.timelineStatus.hidden=!this.timelineMode;
  if(this.timelineMode){
   const closest=timelineResult?.nearest.map(x=>String(x.snapshot.representativeYear)).join(', ');
   this.timelineStatus.textContent=timelineResult?.status==='covered'?
    'AUTHORED APPEARANCE REFERENCES FOR '+year+
    ' · these are representative looks, not universal historical issue':
    'NO AUTHORED REFERENCE FOR '+year+
    (closest?' · NEAREST SNAPSHOTS: '+closest:'')+
    ' · a previous preview does not represent the selected year';
   if(found.length&&!found.some(r=>r.id===this.chosen)){
    this.chosen=found[0].id;
    if(!this.root.hidden)this.hooks.onPreview(this.chosen);
   }
  }
  this.summary.textContent=this.timelineMode?
   found.length+' MATCHING SNAPSHOT(S) · '+year:
   found.length+' / '+FACTION_REFERENCES.length+' REFERENCE KITS';
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
  this.renderHistorical();
  if(this.timelineMode)this.renderDetail();
 }
 /** Research coverage does not require a 3D appearance snapshot. */
 private renderHistorical(){
  const active=this.timelineMode?timelineById(this.timeline.value):undefined;
  this.historicalPanel.hidden=!active;
  this.historicalPanel.replaceChildren();
  if(!active)return;
  const year=Number(this.timelineYear.value);
  const environment=this.timelineEnvironment.value;
  const context=environment==='all'?undefined:
   environment as FactionReference['environment'];
  const records=equipmentAtYear(active.id,year,context);
  this.historicalPanel.append(el('strong','','HISTORICALLY DOCUMENTED EQUIPMENT'),
   el('p','reference-sources',
   'Evidence coverage only · lack of a record does not mean unavailable or retired.'));
  const coverage=researchTimelineCoverage(active.id);
  this.historicalPanel.append(el('small','reference-meta',
   coverage.records+' RESEARCH RECORDS · '+coverage.sourceCount+' SOURCES · '+
   coverage.equipmentCount+' EQUIPMENT IDENTITIES'));
  if(coverage.milestoneYears.length){
   const jump=el('div','reference-history-jump');
   jump.append(el('small','reference-meta','RESEARCH MILESTONES · SELECT YEAR'));
   const years=el('div','reference-history-years');
   for(const n of coverage.milestoneYears){
    const control=el('button','reference-history-year',String(n));
    control.type='button';
    control.setAttribute('aria-pressed',String(n===year));
    control.addEventListener('click',()=>{
     this.timelineYear.value=String(n);
     this.renderList();
    });
    years.append(control);
   }
   jump.append(years);this.historicalPanel.append(jump);
  }
  if(!records.length)this.historicalPanel.append(el('p','reference-empty',
   'No researched equipment for this year / environment. Existing appearance kits may still be browsed.'));
  const categories=[...new Set(records.map(x=>x.equipment.category))];
  for(const category of categories){
   const group=el('div','reference-historical-group');
   group.append(el('strong','',category.toUpperCase()));
   for(const result of records.filter(x=>x.equipment.category===category)){
    const {record,equipment}=result;
    const article=el('details','reference-historical-item');
    const status=record.issueStatus.replace(/-/g,' ')+' · '+
     record.availability+' · '+record.confidence;
    article.append(el('summary','',equipment.name+' · '+status),
     el('p','reference-sources',record.note),
     el('p','reference-meta',record.startYear===record.endYear?
      'EVIDENCE YEAR '+record.startYear:
      'DOCUMENTED RESEARCH WINDOW '+record.startYear+'–'+record.endYear),
     el('p','reference-meta','FIELDWORK MODEL · '+(equipment.model?
      equipment.model.fidelity.toUpperCase()+' · '+equipment.model.note:
      'MISSING / UNMAPPED')));
    for(const id of record.evidenceIds){
     const source=historicalEvidence(id);
     if(!source)continue;
     const link=el('a','reference-source-link',source.title+' · '+source.publisher);
     link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
     article.append(link,el('p','reference-meta',source.claim));
    }
    group.append(article);
   }
   this.historicalPanel.append(group);
  }
  const compare=el('div','reference-history-compare');
  const header=el('div','reference-history-compare-header');
  header.append(el('strong','','COMPARE RESEARCH COVERAGE'),
   el('label','','OTHER YEAR '));
  const label=header.lastElementChild as HTMLLabelElement;
  label.append(this.compareYear);
  compare.append(header);
  const target=Number(this.compareYear.value);
  const delta=compareEquipmentYears(active.id,target,year,context);
  for(const [caption,items] of [
   ['ALSO DOCUMENTED IN '+target,delta.continued],
   ['DOCUMENTED IN '+year+' (NOT '+target+')',delta.newlyDocumented],
   ['DOCUMENTED IN '+target+' (NOT '+year+')',delta.notDocumentedInSecond]
  ] as const){
   compare.append(el('p','reference-meta',caption+' · '+
    (items.length?items.map(x=>x.equipment.name).join(', '):'none in dataset')));
  }
  compare.append(el('small','reference-sources',
   'A missing entry never establishes historical retirement or non-use.'));
  this.historicalPanel.append(compare);
  this.renderGenerator(active.id,year,context);
 }
 private clearProposal(){
  if(!this.proposal)return;
  this.proposal=null;
  this.hooks.onProposalPreview?.(null);
 }
 private renderGenerator(timelineId:string,year:number,
  environment?:FactionReference['environment']){
  const panel=el('section','reference-generator');
  panel.append(el('strong','','GENERATE RESEARCH-INFORMED LOADOUT'),
   el('small','reference-sources',
    'Sparse proposal only. Independently documented items do not prove a complete historical kit.'));
  const controls=el('div','reference-generator-controls');
  const mode=el('select');mode.setAttribute('aria-label','Generation mode');
  mode.append(option('evidence-backed','EVIDENCE-BACKED ONLY'),
   option('playable-composite','PLAYABLE COMPOSITE'));
  mode.value=this.generatorMode;
  mode.addEventListener('change',()=>{
   this.generatorMode=mode.value as GenerationMode;this.clearProposal();this.renderList();
  });
  const role=el('input');role.type='text';role.placeholder='Role (optional)';
  role.setAttribute('aria-label','Generation role');role.value=this.generatorRole;
  role.addEventListener('change',()=>{
   this.generatorRole=role.value.trim();this.clearProposal();this.renderList();
  });
  const theater=el('input');theater.type='text';theater.placeholder='Theater (optional)';
  theater.setAttribute('aria-label','Generation theater');theater.value=this.generatorTheater;
  theater.addEventListener('change',()=>{
   this.generatorTheater=theater.value.trim();this.clearProposal();this.renderList();
  });
  controls.append(mode,role,theater);panel.append(controls);
  const generate=el('button','reference-apply','GENERATE PROPOSAL');
  generate.type='button';
  generate.addEventListener('click',()=>{
   this.proposal=generateHistoricalLoadout({
    context:{timelineId,year,environment,
     ...(this.generatorRole?{role:this.generatorRole}:{}),
     ...(this.generatorTheater?{theater:this.generatorTheater}:{})},
    mode:this.generatorMode,seed:this.generatorSeed,
    baseline:this.hooks.proposalBaseline?.(),
    lockedCategories:[...this.proposalLocks],
    selectedHistoricalIds:Object.fromEntries(this.proposalAlternatives)
   });
   this.hooks.onProposalPreview?.(this.proposal);
   this.renderList();
  });
  panel.append(generate);
  const current=this.proposal;
  if(current&&current.context.timelineId===timelineId&&current.context.year===year&&
   current.context.environment===environment){
   panel.append(el('p','reference-meta',
    'STATUS '+current.status.toUpperCase()+' · '+current.choices.length+
    ' RESEARCH CHOICES · '+current.unresolvedCategories.length+' UNRESOLVED CATEGORIES'));
   for(const choice of current.choices){
    const item=el('div','reference-generator-choice');
    const label=el('strong','',choice.name);
    const mapping=choice.mapping;
    item.append(label,el('small','reference-meta',
     choice.category.toUpperCase()+' · '+choice.confidence.toUpperCase()+' · '+
     (mapping?mapping.fidelity.toUpperCase()+' MODEL':'NO GAME MODEL')));
    const sources=el('small','reference-sources','SOURCES · '+choice.sourceIds.join(', '));
    item.append(sources);
    const conflict=current.conflicts.find(x=>x.category===choice.category);
    if(conflict){
     const selector=el('select');selector.setAttribute('aria-label',
      'Historical alternative for '+choice.category);
     for(const value of conflict.alternatives)
      selector.append(option(value.historicalId,value.name));
     selector.value=choice.historicalId;
     selector.addEventListener('change',()=>{
      this.proposalAlternatives.set(choice.category,selector.value);
      this.clearProposal();this.renderList();
     });
     item.append(selector);
    }
    const lock=el('label','reference-generator-lock');
    const checkbox=el('input');checkbox.type='checkbox';
    checkbox.checked=this.proposalLocks.has(choice.category);
    checkbox.addEventListener('change',()=>{
     if(checkbox.checked)this.proposalLocks.add(choice.category);
     else this.proposalLocks.delete(choice.category);
     this.clearProposal();this.renderList();
    });
    lock.append(checkbox,document.createTextNode(' Keep current '+choice.category));
    item.append(lock);
    panel.append(item);
   }
   if(current.unresolvedCategories.length)
    panel.append(el('p','reference-compat-warning',
     'NOT RESEARCHED / NOT PLAYABLE: '+current.unresolvedCategories.join(', ')+
     '. Retaining existing gear does not verify its historical accuracy.'));
   for(const warning of current.warnings)
    panel.append(el('small','reference-sources',warning));
   const apply=el('button','reference-apply','APPLY COMPATIBLE APPEARANCE DRAFT');
   apply.type='button';apply.disabled=this.readOnly||!current.choices.length||
    !this.hooks.onApplyProposedLook;
   apply.addEventListener('click',()=>this.hooks.onApplyProposedLook?.(current));
   panel.append(apply);
   const equip=el('button','reference-apply','EQUIP PROPOSAL (EXPLICIT)');
   equip.type='button';
   equip.disabled=this.readOnly||!current.choices.length||
    !this.hooks.onApplyProposedEquipment||
    !this.hooks.canApplyProposedEquipment?.();
   equip.addEventListener('click',()=>this.hooks.onApplyProposedEquipment?.(current));
   panel.append(equip,
    el('small','reference-sources',
     'Gear issue is separate from appearance draft. It requires an editable preparation phase and authorized stock-aware host confirmation.'));

  }
  this.historicalPanel.append(panel);
 }
 private renderDetail(){
  const r=FACTION_REFERENCES.find(x=>x.id===this.chosen) as FactionReference;
  const status=referenceVisualStatus(r);
  const options=referenceWeaponOptions(r.id);
  const issued=referenceWeaponChoice(r.id,this.selectedWeaponPresetId);
  const fit=this.hooks.compatibility(r.id);
  this.detail.replaceChildren();
  if(this.timelineMode&&!this.timelineHasMatch)
   this.detail.append(el('p','reference-compat-warning',
    'PREVIOUS KIT PREVIEW ONLY · no supported appearance reference for the chosen year.'));
  this.detail.append(
   el('h3','',r.name),
   el('p','reference-meta',r.country+' · '+r.era.label+' · '+r.organization.replace(/-/g,' ')),
   el('p','',r.summary),
   el('p','reference-meta','REFERENCE SERVICE WEAPON · '+r.weaponFamily),
    el('p','reference-meta','VISIBLE WEAPON · '+issued.preset.name.toUpperCase()+
     (issued.fidelity==='exact'?' · MATCH':
      issued.fidelity==='representative'?' · PERIOD/FAMILY APPROXIMATION':
      ' · TEMPORARY VISUAL PROXY (TRUE FAMILY NOT YET MODELED)')),
   el('p','reference-status',status==='missing-defining-assets'?
    'RECOGNIZABLE APPROXIMATION · DEFINING DETAILS MISSING':'RECOGNIZABLE APPROXIMATION'),
   el('p','reference-sources',r.sourceNotes),
   ...(r.gearFitNote?[el('p','reference-sources','GEAR MODEL FIT · '+r.gearFitNote)]:[])
  );
  if(options.length>1){
   const section=el('div','reference-weapon-choices');
   section.append(el('strong','','PERIOD WEAPON PREVIEWS'));
   const picker=el('select','reference-weapon-choice');
   picker.setAttribute('aria-label','Reference weapon preview');
   for(const value of options){
    const issuedOption=referenceWeaponChoice(r.id,value.presetId);
    picker.append(option(value.presetId,issuedOption.preset.name));
   }
   picker.value=issued.presetId;
   picker.addEventListener('change',()=>{
    this.weaponPreviewOverrides.set(r.id,picker.value);
    this.renderDetail();
    if(!this.root.hidden)this.hooks.onPreview(r.id);
   });
   section.append(picker,el('p','reference-sources',issued.note),
    el('small','reference-meta',
    'VISUAL PREVIEW ONLY · APPLYING A LOOK DOES NOT CHANGE YOUR EQUIPPED WEAPON'));
   this.detail.append(section);
  }
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
  this.apply.disabled=this.readOnly||!this.timelineHasMatch;
  this.apply.textContent=this.readOnly?'ACTIVE OPERATION · VIEW ONLY':
   !this.timelineHasMatch?'NO YEAR MATCH · SELECT A REFERENCE':'USE COMPATIBLE LOOK';
 }
}
