/** Compact, lazy 2D reference browser. One shared 3D operator canvas remains above it. */
import {FACTION_REFERENCES,type FactionReference} from './faction-reference-catalog.ts';
import {referenceVisualStatus} from './faction-reference-audit.ts';
import {unresolvedReferenceGaps} from './faction-reference-asset-registry.ts';
import {paintCamoPreview} from './operator-camo-preview-cache.ts';
import {referencePackStudies,referenceSidearmStudyAvailable} from './faction-reference-preview-options.ts';
import {referenceWeaponChoice,referenceWeaponOptions} from './faction-reference-weapons.ts';
import {FACTION_TIMELINES,timelineForReference}
 from './faction-reference-timelines.ts';
import {resolveTimelineYear,timelineById} from './faction-reference-timeline-resolver.ts';
import {equipmentAtYear,compareEquipmentYears,researchTimelineCoverage}
 from './faction-reference-equipment-resolver.ts';
import {historicalEvidence} from './faction-reference-evidence.ts';
import {generateHistoricalLoadout,type HistoricalLoadoutProposal,type GenerationMode}
 from './faction-reference-loadout-generator.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {existingVisualProxyForContext} from './faction-reference-visual-proxy.ts';
import {prioritizeContentDemand} from './faction-reference-content-demand.ts';
import {consolidatedFactions,timelineGearMilestones,GEAR_CATEGORIES}
 from './faction-reference-gear-chronology.ts';
import {gearEvolutionForTimeline,gearEventsAtYear}
 from './faction-reference-equipment-evolution.ts';
import {resolveDatedGearSnapshot,compareDatedGearSnapshots}
 from './faction-reference-dated-gear-snapshot.ts';
const CONTENT_DEMAND=prioritizeContentDemand();
const FACTION_GROUPS=consolidatedFactions();
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
 private readonly timelineOrganization:HTMLSelectElement;
 private readonly gearTimelinePanel:HTMLElement;
 private readonly timeline:HTMLSelectElement;
 private readonly timelineYear:HTMLInputElement;
 private readonly timelineEnvironment:HTMLSelectElement;
 private readonly timelineStatus:HTMLElement;
 private readonly historicalPanel:HTMLElement;
 private readonly compareYear:HTMLInputElement;
 private gearCompareTimeline='';
 private gearCompareFrom='';
 private gearCompareTo='';
 private generatorMode:GenerationMode='evidence-backed';
 private generatorRole='';private generatorTheater='';
 private generatorSeed=0;private generatorTentative=false;
 private generatorTrials=false;
 private proposal:HistoricalLoadoutProposal|null=null;
 private readonly proposalLocks=new Set<string>();
 private readonly proposalAlternatives=new Map<string,string>();
 private timelineMode=true;
 private timelineHasMatch=true;
 private readonly summary:HTMLElement;
 private readonly apply:HTMLButtonElement;
 private chosen=FACTION_TIMELINES[0].snapshots[0].referenceId;
 private readonly weaponPreviewOverrides=new Map<string,string>();
 private readonly packPreviewOverrides=new Map<string,string>();
 private readonly sidearmPreviewOverrides=new Set<string>();
 private readOnly=false;
 constructor(root:HTMLElement,hooks:ReferenceBrowserHooks){
  this.root=root;this.hooks=hooks;
  root.classList.add('studio-reference-panel');
  const heading=el('div','reference-top');
  const title=el('div');
  title.append(el('strong','reference-heading','FACTION EQUIPMENT TIMELINES'),
   el('small','reference-intro','Faction → role → gear-change snapshots · visual and historical evidence remain separate'));
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
  this.view.append(option('timeline','FACTIONS / TIMELINES'),option('kits','ALL REFERENCE LOOKS'));
  this.view.value='timeline';
  controls.append(this.view,this.search,this.organization,this.era,this.country);
  this.timelineControls=el('div','reference-controls');this.timelineControls.hidden=false;
  this.timelineOrganization=el('select');
  this.timelineOrganization.setAttribute('aria-label','Choose faction');
  for(const group of FACTION_GROUPS)
   this.timelineOrganization.append(option(group.organization.id,
    group.organization.name+' · '+group.referenceCount+' LOOKS'));
  this.timelineOrganization.value=FACTION_TIMELINES[0].organizationId;
  this.timeline=el('select');this.timeline.setAttribute('aria-label','Choose role timeline');
  this.populateRoleTimelines(FACTION_TIMELINES[0].id);
  this.timelineYear=el('input');this.timelineYear.type='number';
  this.timelineYear.min='1800';this.timelineYear.max='2100';this.timelineYear.step='1';
  this.timelineYear.value='1990';this.timelineYear.setAttribute('aria-label','Reference year');
  this.timelineEnvironment=el('select');
  this.timelineEnvironment.setAttribute('aria-label','Reference environment');
  for(const [id,label] of [['all','ALL ENVIRONMENTS'],['woodland','WOODLAND'],
   ['desert','DESERT'],['urban','URBAN'],['mixed','MIXED']])
   this.timelineEnvironment.append(option(id,label));
  this.timelineControls.append(this.timelineOrganization,this.timeline,
   this.timelineYear,this.timelineEnvironment);
  this.timelineStatus=el('small','reference-timeline-status');this.timelineStatus.hidden=false;
  this.gearTimelinePanel=el('section','reference-gear-timeline');
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
    if(group){
     this.timelineOrganization.value=group.organizationId;
     this.populateRoleTimelines(group.id);
    }
    const chosen=FACTION_REFERENCES.find(r=>r.id===this.chosen);
    const snap=group?.snapshots.find(x=>x.referenceId===this.chosen);
    this.timelineYear.value=String(snap?.representativeYear??chosen?.era.start??1990);
   }
   this.renderList();this.renderDetail();
  });
  this.timelineOrganization.addEventListener('change',()=>{
   this.clearProposal();
   this.populateRoleTimelines();
   this.generatorRole=timelineById(this.timeline.value)?.role??'';
   this.generatorTheater='';
   const first=timelineById(this.timeline.value)?.snapshots[0];
   if(first){this.timelineYear.value=String(first.representativeYear);
    this.chosen=first.referenceId;}
   this.timelineEnvironment.value='all';
   this.renderList();
  });
  this.timeline.addEventListener('change',()=>{
   this.clearProposal();this.generatorRole=timelineById(this.timeline.value)?.role??'';
   this.generatorTheater='';
   const first=timelineById(this.timeline.value)?.snapshots[0];
   if(first){this.timelineYear.value=String(first.representativeYear);
    this.chosen=first.referenceId;}
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
   this.gearTimelinePanel,this.historicalPanel,this.summary,this.list,this.detail,this.apply);
  root.hidden=true;
  this.renderList();this.renderDetail();
 }
 private populateRoleTimelines(preferred?:string){
  const organizationId=this.timelineOrganization.value;
  const timelines=FACTION_GROUPS.find(x=>x.organization.id===organizationId)?.timelines??[];
  this.timeline.replaceChildren(...timelines.map(t=>option(t.id,t.label+' · '+t.role)));
  if(preferred&&timelines.some(t=>t.id===preferred))this.timeline.value=preferred;
 }
 get selectedId(){return this.chosen;}
 get selectedPackStudyId(){return this.packPreviewOverrides.get(this.chosen);}
 get selectedSidearmStudy(){return this.sidearmPreviewOverrides.has(this.chosen);}
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
  this.clearProposal();this.chosen=id;
  const lineage=timelineForReference(id);
  if(lineage&&this.timelineMode){
   this.timelineOrganization.value=lineage.organizationId;
   this.populateRoleTimelines(lineage.id);
   const snapshot=lineage.snapshots.find(x=>x.referenceId===id);
   if(snapshot){this.timelineYear.value=String(snapshot.representativeYear);
    this.timelineEnvironment.value=snapshot.environment;}
  }
  this.renderList();this.renderDetail();
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
 /** Authored appearance changes are separated by environment; a research
  * boundary is never presented as an actual issue or retirement switch. */
 private renderGearChronology(active?:typeof FACTION_TIMELINES[number]){
  this.gearTimelinePanel.hidden=!active;
  this.gearTimelinePanel.replaceChildren();
  if(!active)return;
  const milestones=timelineGearMilestones(active.id);
  this.gearTimelinePanel.append(el('strong','','EQUIPMENT CHANGE SNAPSHOTS'),
   el('p','reference-sources',
    'Authored looks show visible changes by category. Research boundaries show dated evidence, not universal equipment changes.'));
  const chronology=el('div','reference-chronology-items');
  for(const point of milestones){
   const entry=el('details','reference-chronology-point');
   const changed=[...new Set(point.visualSnapshots.flatMap(x=>x.changes.map(c=>c.category)))];
   entry.append(el('summary','',
    point.year+' · '+(point.visualSnapshots.length?
     point.visualSnapshots.length+' LOOK'+(point.visualSnapshots.length===1?'':'S'):
     'RESEARCH ONLY')+
    (changed.length?' · CHANGED: '+changed.join(', '):'')+
    (point.researchMarkers.length?' · '+point.researchMarkers.length+' SOURCE MARKER(S)':'')));
   for(const snapshot of point.visualSnapshots){
    const card=el('div','reference-chronology-visual');
    card.append(el('strong','',snapshot.label+' · '+snapshot.environment.toUpperCase()),
     el('small','reference-meta',
      snapshot.kind.replace(/-/g,' ').toUpperCase()+
      ' · indexed appearance year, not a proven issue date'));
    const action=el('button','reference-history-year','VIEW THIS LOOK');
    action.type='button';action.addEventListener('click',()=>this.select(snapshot.referenceId));
    card.append(action);
    if(snapshot.changes.length){
     for(const category of GEAR_CATEGORIES){
      const changed=snapshot.changes.filter(x=>x.category===category);
      if(!changed.length)continue;
      const group=el('div','reference-chronology-category');
      group.append(el('strong','',category.toUpperCase()));
      for(const item of changed)
       group.append(el('small','reference-meta',
        item.key+': '+(item.previous??'not specified')+' → '+(item.current??'not specified')));
      card.append(group);
     }
    }else{
     const group=el('details','reference-chronology-category');
     group.append(el('summary','',snapshot.kind==='unchanged-appearance'?
      'NO VISUAL GEAR CHANGES':'SHOW ALL CATEGORIZED GEAR'));
     for(const category of GEAR_CATEGORIES){
      const settings=snapshot.settings[category];
      if(!settings.length)continue;
      group.append(el('strong','',category.toUpperCase()),
       el('p','reference-meta',settings.map(x=>x.key+': '+x.value).join(' · ')));
     }
     card.append(group);
    }
    if(snapshot.changes.length){
     const full=el('details','reference-chronology-category');
     full.append(el('summary','','SHOW COMPLETE CONFIGURATION BY GEAR CATEGORY'));
     for(const category of GEAR_CATEGORIES){
      const settings=snapshot.settings[category];
      if(!settings.length)continue;
      full.append(el('strong','',category.toUpperCase()),
       el('p','reference-meta',settings.map(x=>x.key+': '+x.value).join(' · ')));
     }
     card.append(full);
    }
    entry.append(card);
   }
   for(const marker of point.researchMarkers){
    const row=el('div','reference-chronology-research');
    row.append(el('strong','',marker.label+' · '+marker.category.toUpperCase()),
     el('small','reference-meta',marker.marker==='research-window-start'?
      'BEGINNING OF RESEARCHED WINDOW':'END OF RESEARCHED WINDOW (NOT RETIREMENT)'),
     el('small','reference-sources',
      marker.issueStatus.replace(/-/g,' ')+' · '+marker.confidence+' · '+marker.note));
    entry.append(row);
   }
   chronology.append(entry);
  }
  this.gearTimelinePanel.append(chronology);
  this.renderGearEvolutionReview(active);
 }
 /** Read-only equipment timeline assessment, without issuing historical proxies. */
 private renderGearEvolutionReview(active:typeof FACTION_TIMELINES[number]){
  const laneData=gearEvolutionForTimeline(active.id);
  if(!laneData)return;
  const year=Number(this.timelineYear.value);
  const env=this.timelineEnvironment.value==='all'?undefined:
   this.timelineEnvironment.value as FactionReference['environment'];
  const selected=resolveDatedGearSnapshot({timelineId:active.id,year,
   ...(env?{environment:env}:{})});
  const panel=el('section','reference-evolution-review');
  panel.append(el('strong','','INDEPENDENT EQUIPMENT EVOLUTION'),
   el('small','reference-sources',
    'One event per existing visual gear setting or cited research-window boundary. None automatically becomes a historical issue or withdrawal date.'));
  const yearEvents=gearEventsAtYear(active.id,year);
  const counts=laneData.lanes.filter(x=>x.events.length);
  panel.append(el('small','reference-meta',
   counts.map(x=>x.category.toUpperCase()+' '+x.events.length).join(' · ')),
   el('small','reference-sources',
    'SELECTED '+year+' · '+selected.state.replace(/-/g,' ').toUpperCase()+
    ' · '+selected.historical.length+' ELIGIBLE RESEARCH ITEMS · '+
    selected.unknownHistoricalCategories.length+' UNKNOWN HISTORICAL CATEGORIES'));
  const events=el('details','reference-chronology-category');
  events.append(el('summary','',yearEvents.length+' INDIVIDUAL EVENTS AT '+year));
  for(const event of yearEvents){
   events.append(el('small','reference-meta',
    event.category.toUpperCase()+' · '+event.itemKey+' · '+
    event.kind.replace(/-/g,' ')+' · '+
    (event.kind.startsWith('visual')?
     (event.from??'baseline')+' → '+(event.to??'not specified'):
     event.issueStatus+' · '+event.confidence)+
    (event.sourceIds.length?' · '+event.sourceIds.join(', '):' · appearance only')));
  }
  panel.append(events);
  const visuals=active.snapshots.map(x=>({
   ...x,label:FACTION_REFERENCES.find(r=>r.id===x.referenceId)?.name??x.referenceId
  })).sort((a,b)=>a.representativeYear-b.representativeYear||
   a.referenceId.localeCompare(b.referenceId));
  if(this.gearCompareTimeline!==active.id){
   this.gearCompareTimeline=active.id;
   const last=visuals[visuals.length-1];
   const same=visuals.filter(x=>x.environment===last?.environment);
   this.gearCompareFrom=same[0]?.referenceId??'';
   this.gearCompareTo=last?.referenceId??'';
  }
  const compare=el('details','reference-evolution-compare');
  compare.append(el('summary','','COMPARE TWO AUTHORED EQUIPMENT SNAPSHOTS'));
  compare.open=false;
  const controls=el('div','reference-controls');
  const left=el('select'),right=el('select');
  left.setAttribute('aria-label','First gear snapshot');
  right.setAttribute('aria-label','Second gear snapshot');
  for(const item of visuals){
   left.append(option(item.referenceId,item.representativeYear+' · '+
    item.environment+' · '+item.label));
   right.append(option(item.referenceId,item.representativeYear+' · '+
    item.environment+' · '+item.label));
  }
  left.value=this.gearCompareFrom;right.value=this.gearCompareTo;
  const result=el('div','reference-evolution-diff');
  const paint=()=>{
   const a=visuals.find(x=>x.referenceId===left.value);
   const b=visuals.find(x=>x.referenceId===right.value);
   if(!a||!b){result.replaceChildren();return;}
   const first=resolveDatedGearSnapshot({timelineId:active.id,
    year:a.representativeYear,environment:a.environment},a.referenceId);
   const second=resolveDatedGearSnapshot({timelineId:active.id,
    year:b.representativeYear,environment:b.environment},b.referenceId);
   const delta=compareDatedGearSnapshots(first,second);
   result.replaceChildren(el('small','reference-sources',delta.reason));
   if(!delta.comparable)return;
   for(const category of GEAR_CATEGORIES){
    const changes=delta.changes.filter(x=>x.category===category);
    if(!changes.length)continue;
    const row=el('div','reference-chronology-category');
    row.append(el('strong','',category.toUpperCase()+' · '+changes.length+' CHANGES'));
    for(const change of changes)row.append(el('small','reference-meta',
     change.key+': '+(change.previous??'none')+' → '+(change.current??'none')));
    result.append(row);
   }
   if(!delta.changes.length)result.append(el('small','reference-meta',
    'NO AUTHORED GEAR SETTING DIFFERENCES'));
  };
  left.addEventListener('change',()=>{
   this.gearCompareFrom=left.value;paint();
  });
  right.addEventListener('change',()=>{
   this.gearCompareTo=right.value;paint();
  });
  controls.append(left,right);compare.append(controls,result);paint();
  panel.append(compare);
  if(selected.contentDemand.length){
   const demand=el('details','reference-evolution-demand');
   demand.append(el('summary','',
    selected.contentDemand.length+' FUTURE ASSET NEEDS FOR THIS LOOK'));
   for(const item of selected.contentDemand.slice(0,10)){
    demand.append(el('small','reference-meta',
     item.label+' · '+item.affectedKitCount+' KITS · SCORE '+
     item.priorityScore+' · '+item.noveltyAssessment+
     ' · '+item.currentProxies.slice(0,2).join('; ')));
   }
   demand.append(el('small','reference-sources',
    'Priority ranks existing gaps only; actual silhouette difference needs human review.'));
   panel.append(demand);
  }
  this.gearTimelinePanel.append(panel);
 }
 /** Research coverage does not require a 3D appearance snapshot. */
 private renderHistorical(){
  const active=this.timelineMode?timelineById(this.timeline.value):undefined;
  this.historicalPanel.hidden=!active;
  this.historicalPanel.replaceChildren();
  this.renderGearChronology(active);
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
 private generateNow(timelineId:string,year:number,
  environment?:FactionReference['environment']){
  this.proposal=generateHistoricalLoadout({
   context:{timelineId,year,environment,
    ...(this.generatorRole?{role:this.generatorRole}:{}),
    ...(this.generatorTheater?{theater:this.generatorTheater}:{}),
    ...(this.generatorTentative?{includeTentative:true}:{}),
    ...(this.generatorTrials?{includeTrials:true}:{})},
   mode:this.generatorMode,seed:this.generatorSeed,
   baseline:this.hooks.proposalBaseline?.(),
   lockedCategories:[...this.proposalLocks],
   selectedHistoricalIds:Object.fromEntries(this.proposalAlternatives)
  });
  this.hooks.onProposalPreview?.(this.proposal);
  this.renderList();
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
  const optional=el('div','reference-generator-options');
  for(const [name,checked,commit] of [
   ['Include tentative claims',this.generatorTentative,(v:boolean)=>this.generatorTentative=v],
   ['Include documented trials',this.generatorTrials,(v:boolean)=>this.generatorTrials=v]
  ] as const){
   const label=el('label','reference-generator-lock');
   const input=el('input');input.type='checkbox';input.checked=checked;
   input.addEventListener('change',()=>{
    commit(input.checked);this.clearProposal();this.renderList();
   });
   label.append(input,document.createTextNode(name));optional.append(label);
  }
  panel.append(optional);
  const generate=el('button','reference-apply','GENERATE PROPOSAL');
  generate.type='button';
  generate.addEventListener('click',()=>this.generateNow(timelineId,year,environment));
  const reroll=el('button','reference-history-year','REGENERATE UNLOCKED');
  reroll.type='button';reroll.disabled=!this.proposal;
  reroll.addEventListener('click',()=>{
   this.generatorSeed=(this.generatorSeed+1)>>>0;
   this.generateNow(timelineId,year,environment);
  });
  panel.append(generate,reroll);
  const current=this.proposal;
  const visual=existingVisualProxyForContext({timelineId,year,environment,
   ...(this.generatorRole?{role:this.generatorRole}:{}),
   ...(this.generatorTheater?{theater:this.generatorTheater}:{})});
  panel.append(el('small','reference-sources',
   'EXISTING VISUAL REFERENCE · '+
   (visual.referenceId?visual.referenceId+' ('+visual.status+')':'NONE')+
   ' · '+visual.explanation));
  if(current&&current.context.timelineId===timelineId&&current.context.year===year&&
   current.context.environment===environment){
   panel.append(el('p','reference-meta',
    'STATUS '+current.status.toUpperCase()+' · '+current.choices.length+
    ' RESEARCH CHOICES · '+current.unresolvedCategories.length+' UNRESOLVED CATEGORIES'));
   panel.append(el('small','reference-sources',
    'ENSEMBLE · '+current.ensemble.researchedCategoryCount+' RESEARCHED CATEGORIES · '+
    current.ensemble.visuallyRepresentedCount+' MAPPED · '+
    current.ensemble.proxyOnlyCount+' PROXY ONLY · '+
    current.ensemble.historicalOnlyCount+' UNMAPPED · '+current.ensemble.sourceCount+
    ' SOURCES · NO COMPLETE-KIT CERTIFICATION'));
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
      this.generateNow(timelineId,year,environment);
     });
     item.append(selector);
    }
    const lock=el('label','reference-generator-lock');
    const checkbox=el('input');checkbox.type='checkbox';
    checkbox.checked=this.proposalLocks.has(choice.category);
    checkbox.addEventListener('change',()=>{
     if(checkbox.checked)this.proposalLocks.add(choice.category);
     else this.proposalLocks.delete(choice.category);
     this.generateNow(timelineId,year,environment);
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
  this.renderContentDemandQueue();
 }
 private renderContentDemandQueue(){
  const section=el('details','reference-content-demand');
  section.append(el('summary','','FUTURE VISUAL CONTENT QUEUE · '+
   CONTENT_DEMAND.length+' UNRESOLVED NEEDS'));
  section.append(el('p','reference-sources',
   'System audit only · no new assets are being added. Scores rank benefit to existing reference kits and documented proxy gaps; novelty is a heuristic requiring silhouette review.'));
  const items=el('div','reference-content-demand-items');
  for(const [i,entry] of CONTENT_DEMAND.slice(0,12).entries()){
   const row=el('div','reference-content-demand-item');
   row.append(el('strong','',String(i+1)+'. '+entry.label),
    el('small','reference-meta',
     entry.category.toUpperCase()+' · SCORE '+entry.priorityScore+
     ' · '+entry.affectedKitCount+' KITS · '+entry.missingKitCount+
     ' WITHOUT ACCEPTABLE MODEL · '+entry.definingCount+' DEFINING'),
    el('small','reference-sources',
     'Distinctiveness: '+entry.noveltyAssessment.replace(/-/g,' ')+
     ' (not geometrically measured)'),
    el('small','reference-sources',
     'Current representations: '+entry.currentProxies.slice(0,3).join('; ')));
   items.append(row);
  }
  section.append(items,el('p','reference-sources',
   'The ranking is advisory. A future art review should assess distinctive silhouette, modeling cost and shared use before a content task is approved.'));
  const planning=el('a','reference-source-link','OPEN DEDICATED ASSET PLANNING WORKBENCH');
  planning.href='./reference-planning.html';
  planning.target='_blank';planning.rel='noopener noreferrer';
  section.append(planning);
  this.historicalPanel.append(section);
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
  const packStudies=referencePackStudies(r.id);
  if(packStudies.length||referenceSidearmStudyAvailable(r.id)){
   const section=el('div','reference-weapon-choices');
   section.append(el('strong','','OPTIONAL VISUAL STUDIES'),
    el('small','reference-meta','Costume variants only · not documented issue · not saved by Use Compatible Look'));
   if(packStudies.length){
    const picker=el('select','reference-weapon-choice');
    picker.setAttribute('aria-label','Reference backpack study');
    picker.append(option('','Original reference pack'));
    for(const study of packStudies)picker.append(option(study.id,study.label));
    picker.value=this.selectedPackStudyId??'';
    picker.addEventListener('change',()=>{
     if(picker.value)this.packPreviewOverrides.set(r.id,picker.value);
     else this.packPreviewOverrides.delete(r.id);
     if(!this.root.hidden)this.hooks.onPreview(r.id);
    });
    section.append(picker);
   }
   if(referenceSidearmStudyAvailable(r.id)){
    const picker=el('select','reference-weapon-choice');
    picker.setAttribute('aria-label','Reference sidearm study');
    picker.append(option('none','Original reference · no sidearm'),option('glock','Optional Glock appearance study'));
    picker.value=this.selectedSidearmStudy?'glock':'none';
    picker.addEventListener('change',()=>{
     if(picker.value==='glock')this.sidearmPreviewOverrides.add(r.id);
     else this.sidearmPreviewOverrides.delete(r.id);
     if(!this.root.hidden)this.hooks.onPreview(r.id);
    });
    section.append(picker);
   }
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
