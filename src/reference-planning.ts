/** FT1.7F: standalone developer-only read-only planning surface.
 * No Three.js, campaign state, saved preferences, or equipment writes.
 */
import {buildReferenceCoverageMatrix}
 from './faction-reference-coverage-matrix.ts';
import {buildContentCandidates,prioritizeCandidates,candidateCoverageSummary,
 type ContentCandidate,type PlanningLens,type CandidateReadiness}
 from './faction-reference-production-candidates.ts';
import {briefJson,briefMarkdown,candidateBacklogCsv}
 from './faction-reference-production-briefs.ts';
import {TIMELINE_ORGANIZATIONS} from './faction-reference-timelines.ts';
import {GEAR_CATEGORIES} from './faction-reference-gear-chronology.ts';
import {FT17_CANDIDATE_DECISIONS} from './faction-reference-production-decisions.ts';
import {ft18ReviewBoard} from './faction-reference-ft1-8-review-board.ts';
import {FT18_FIRST_ASSET_SCOPE,ft18FirstAssetReadiness} from './faction-reference-ft1-8-first-asset.ts';
import {ft18ReviewCsv,ft18ReviewJson,ft18FirstAssetMarkdown} from './faction-reference-ft1-8-exports.ts';
const matrix=buildReferenceCoverageMatrix();
const candidates=buildContentCandidates(FT17_CANDIDATE_DECISIONS);
const ft18Reviews=ft18ReviewBoard();
const ft18First=ft18FirstAssetReadiness();
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{
 const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;
};
const root=document.querySelector<HTMLElement>('#planningRoot');
if(!root)throw Error('Planning root missing');
const header=node('header');
const name=node('h1','FIELDWORK / HISTORICAL CONTENT PLANNING');
header.append(name,node('p',
 'Developer audit of existing appearances; not an equipment catalog, issued kit or art-production authorization.'));
const links=node('nav');
const studio=node('a','Operator Studio');studio.href='./operator-studio.html';
const back=node('a','Breach');back.href='./index.html';
links.append(studio,back);header.append(links);
const stats=node('section');stats.className='planning-stats';
const summary=candidateCoverageSummary(candidates);
for(const [name,value] of [
 ['REFERENCES AUDITED',String(matrix.referenceCount)],
 ['CATEGORY CELLS',String(matrix.cells.length)],
 ['UNASSESSED CELLS',String(matrix.unassessedCells)],
 ['CANDIDATES',String(summary.candidateCount)],
 ['UNIQUE GAP IDS',String(summary.uniqueUnresolvedGapIds)],
 ['APPROVED FOR PRODUCTION',String(summary.readyForProduction)]
] as const){
 const item=node('div');item.append(node('small',name),node('strong',value));
 stats.append(item);
}
const controls=node('section');controls.className='planning-controls';
const makeSelect=(label:string,opts:readonly (readonly [string,string])[])=>{
 const wrapper=node('label',label);
 const select=node('select');select.setAttribute('aria-label',label);
 for(const [value,text] of opts){
  const item=node('option',text);item.value=value;select.append(item);
 }
 wrapper.append(select);controls.append(wrapper);return select;
};
const searchWrap=node('label','Search name, gap or reference');
const search=node('input');search.type='search';
search.placeholder='G36, helmet, USMC…';
search.setAttribute('aria-label','Search planning candidates');
searchWrap.append(search);controls.append(searchWrap);
const category=makeSelect('Gear category',[['all','All categories'],
 ...GEAR_CATEGORIES.map(v=>[v,v] as const)]);
const faction=makeSelect('Faction',[['all','All factions'],
 ...TIMELINE_ORGANIZATIONS.map(v=>[v.id,v.name] as const)
  .sort((a,b)=>a[1].localeCompare(b[1]))]);
const era=makeSelect('Appearance year',[['all','All snapshot years'],
 ['before-2000','Before 2000'],['after-2000','2000 and later']]);
const readiness=makeSelect('Readiness',[['all','All states'],
 ...(['configuration-fix','needs-review','art-candidate','blocked',
 'approved-for-future-work','resolved'] as CandidateReadiness[])
  .map(x=>[x,x.replace(/-/g,' ')] as const)]);
const lens=makeSelect('Priority lens',[
 ['visual-impact','Defining / proxy coverage'],
 ['coverage','Unique kit coverage'],
 ['production-efficiency','Reviewed benefit / effort']
]);
const reviewPanel=node('section');reviewPanel.className='planning-exports';
reviewPanel.append(node('h2','FT1.8 · VERIFIED CONTENT TRIAGE'));
reviewPanel.append(node('p','Ten selected gap candidates; catalog inspection is not visual approval. The proposed G36 production brief stays blocked until independently reviewed.'));
const first=node('p','FIRST ASSET DRAFT: '+FT18_FIRST_ASSET_SCOPE.title+
 ' · '+(ft18First.authorized?'REVIEWED AND AUTHORIZED':'HUMAN REVIEW REQUIRED'));
reviewPanel.append(first);
const reviewDetails=node('details');
reviewDetails.append(node('summary','Show review queue and existing model checks'));
for(const item of ft18Reviews){
 const entry=node('div');entry.className='planning-gap';
 entry.append(node('strong',item.order+'. '+item.name),
  node('small',item.status+' · '+item.category),
  node('p',item.modelAudit));
 if(item.existingModel)entry.append(node('small','Known catalog model: '+item.existingModel));
 reviewDetails.append(entry);
}
reviewPanel.append(reviewDetails);
const content=node('main');content.className='planning-main';
const list=node('section');list.className='planning-list';
const detail=node('section');detail.className='planning-detail';
const count=node('p');
list.append(count);
const cards=node('div');cards.className='planning-cards';list.append(cards);
content.append(list,detail);
const download=(filename:string,body:string,mime:string)=>{
 const file=new Blob([body],{type:mime});
 const url=URL.createObjectURL(file);const a=node('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const button=(title:string,fn:()=>void)=>{
 const b=node('button',title);b.type='button';b.addEventListener('click',fn);return b;
};
const output=node('section');output.className='planning-exports';
output.append(node('h2','Audit exports'));
output.append(node('p','Current candidate metadata is read-only, source-controlled, and unreviewed by default. These exports do not create art tasks or GitHub issues.'));
output.append(button('EXPORT FT1.8 REVIEW CSV',()=>download('ft1-8-review.csv',
 ft18ReviewCsv(),'text/csv;charset=utf-8')));
output.append(button('EXPORT FT1.8 REVIEW JSON',()=>download('ft1-8-review.json',
 ft18ReviewJson(),'application/json')));
output.append(button('EXPORT FIRST-ASSET DRAFT',()=>download('ft1-8-first-asset.md',
 ft18FirstAssetMarkdown(),'text/markdown;charset=utf-8')));
output.append(button('EXPORT BACKLOG CSV',()=>download('ft1-7-backlog.csv',
 candidateBacklogCsv(candidates),'text/csv;charset=utf-8')));
output.append(button('EXPORT COVERAGE JSON',()=>download('ft1-7-coverage.json',
 JSON.stringify(matrix,null,2)+'\n','application/json')));
let selectedId=candidates[0]?.id??'';
const referencedYears=new Map(matrix.cells.map(x=>[x.referenceId,x.year]));
const visible=()=>{
 const q=search.value.trim().toLowerCase();
 return prioritizeCandidates(candidates,lens.value as PlanningLens).filter(item=>{
  if(category.value!=='all'&&item.category!==category.value)return false;
  if(faction.value!=='all'&&!item.organizationIds.includes(faction.value))return false;
  if(readiness.value!=='all'&&item.readiness!==readiness.value)return false;
  if(era.value!=='all'&&!item.affectedReferenceIds.some(id=>{
   const year=referencedYears.get(id);
   return year!==undefined&&(era.value==='before-2000'?year<2000:year>=2000);
  }))return false;
  return !q||[item.id,item.name,...item.gapIds,...item.affectedReferenceIds,
   ...item.organizationIds,...item.currentProxies].some(x=>x.toLowerCase().includes(q));
 });
};
const score=(x:number|null)=>x===null?'UNREVIEWED':x+' / 3';
const renderDetail=(item?:ContentCandidate)=>{
 detail.replaceChildren();
 if(!item){detail.append(node('h2','No matching candidate'));return;}
 detail.append(node('h2',item.name));
 const meta=node('p',item.category.toUpperCase()+' · '+item.readiness.toUpperCase()+
  ' · '+item.delivery.replace(/-/g,' ').toUpperCase());
 detail.append(meta,node('p',item.rationale));
 const ft18=ft18Reviews.find(x=>x.candidateId===item.id);
 if(ft18){
  detail.append(node('h3','FT1.8 verified triage'));
  detail.append(node('p',ft18.modelAudit));
  detail.append(node('p','Visual review: '+ft18.status+
   ' · remaining evidence: '+ft18.pending.join('; ')));
 }
 if(item.id===FT18_FIRST_ASSET_SCOPE.candidateId)
  detail.append(node('p','FIRST PRODUCTION DRAFT · '+FT18_FIRST_ASSET_SCOPE.state+
   ' · '+(ft18First.authorized?'approved':'approval blocked')));
 if(item.delivery==='variant-family')
  detail.append(node('p','SEPARATE REQUIRED VARIANTS: '+item.distinctVariantIds.join(', ')));
 const measures=node('div');measures.className='planning-measures';
 for(const [name,value] of Object.entries(item.metrics)){
  const cell=node('div');cell.append(node('small',name.replace(/([A-Z])/g,' $1')),
   node('strong',String(value)));measures.append(cell);
 }
 detail.append(measures);
 const review=node('details');review.open=true;
 review.append(node('summary','Human review / production readiness'));
 for(const [name,value] of [
  ['Silhouette distinctiveness',item.review.silhouetteDifference],
  ['Visual importance',item.review.visualImportance],
  ['Reusable geometry',item.review.reusePotential],
  ['Integration complexity',item.review.productionComplexity]
 ] as const)review.append(node('p',name+': '+score(value)));
 review.append(node('p','Missing reviews: '+item.reviewMissing.join(', ')));
 review.append(node('p','Approval: '+(item.review.notes||'No review has been recorded.')));
 detail.append(review);
 const gapSection=node('details');gapSection.open=true;
 gapSection.append(node('summary','Affected references and current stand-ins'));
 for(const {referenceId,gap} of item.gaps){
  const row=node('div');row.className='planning-gap';
  row.append(node('strong',referenceId+' · '+gap.label),
   node('small',gap.status+' · '+gap.action+' · '+gap.importance),
   node('p','Selected visual: '+(gap.selectedProxy??'none')),
   node('p',gap.reason));
  gapSection.append(row);
 }
 detail.append(gapSection);
 const actions=node('div');actions.className='planning-actions';
 actions.append(button('DOWNLOAD MARKDOWN BRIEF',()=>download(
  item.id+'.md',briefMarkdown(item),'text/markdown;charset=utf-8')),
  button('DOWNLOAD JSON BRIEF',()=>download(
   item.id+'.json',briefJson(item),'application/json')));
 detail.append(actions);
};
function render(){
 const filtered=visible();
 count.textContent=filtered.length+' OF '+candidates.length+
  ' CANDIDATES · counts cover authored kit references, not historical prevalence';
 cards.replaceChildren();
 if(!filtered.some(x=>x.id===selectedId))selectedId=filtered[0]?.id??'';
 for(const [index,item] of filtered.entries()){
  const b=node('button');b.type='button';b.className='planning-card';
  b.setAttribute('aria-pressed',String(item.id===selectedId));
  b.append(node('strong',(index+1)+'. '+item.name),
   node('small',item.category+' · '+item.readiness+' · '+
    item.metrics.uniqueKits+' kits / '+item.metrics.uniqueOrganizations+' factions'),
   node('small',item.metrics.definingKits+' defining · '+
    item.metrics.existingOptionKits+' potentially mapping-only'));
  b.addEventListener('click',()=>{selectedId=item.id;render();});
  cards.append(b);
 }
 renderDetail(filtered.find(x=>x.id===selectedId));
}
for(const item of [search,category,faction,era,readiness,lens])
 item.addEventListener(item===search?'input':'change',render);
root.replaceChildren(header,stats,reviewPanel,controls,content,output);
render();
