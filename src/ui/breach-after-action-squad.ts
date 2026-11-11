/** V4 Stage 2: mission-first squad ranking and contextual inspection.
 * The record is evidence-derived; never feed presentation points to gameplay.
 * Actual shared 3D operator models are a separate Stage 3 presentation owner.
 */
import type {AfterActionReport,OperatorAfterAction}
 from '../breach-after-action-report.ts';
import type {ReplayManifest} from '../breach-replay-manifest.ts';

const el=(tag:string,cls='',label?:string)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(label!==undefined)e.textContent=label;
 return e;
};
function action(label:string,onClick:()=>void,cls:string){
 const button=document.createElement('button');button.type='button';
 button.className=cls;button.textContent=label;
 button.addEventListener('click',onClick);return button;
}
const categories=['combat','recon','support','objective'] as const;
const categoryName={
 combat:'COMBAT',recon:'RECON',support:'SUPPORT',objective:'OBJECTIVE'
};
const statusName=(status:OperatorAfterAction['status'])=>({
 active:'ACTIVE',wounded:'WOUNDED',heavy:'HEAVILY WOUNDED',
 incapacitated:'INCAPACITATED',unknown:'STATUS NOT RECORDED'
})[status];
function distinction(op:OperatorAfterAction):string|null{
 if(op.incapacitations>0&&op.shots>=5&&op.hits===op.shots)
   return 'MARKSMAN · ALL RECORDED SHOTS HIT';
 if((op.doorsForced??0)>0)return 'ENTRY SPECIALIST';
 if((op.windowsTraversed??0)>0)return 'WINDOW ENTRY';
 if(op.categories.objective>0)return 'OBJECTIVE CONTRIBUTOR';
 if(op.contactReports>0)return 'CONTACT REPORTER';
 if(op.rank===1&&op.contribution>0)return 'TOP CONTRIBUTOR';
 return null;
}
function categoryTile(label:string,points:number){
 const tile=el('div','fw-v4-category-tile');
 tile.append(el('span','',label),el('strong','',String(points)+' pts'));
 return tile;
}
function breakdown(points:{combat:number;recon:number;support:number;objective:number}){
 const grid=el('div','fw-v4-category-grid');
 grid.setAttribute('aria-label','Weighted contribution category totals');
 for(const category of categories)
   grid.append(categoryTile(categoryName[category],points[category]));
 return grid;
}
function pointExplanation():HTMLElement{
 return el('p','fw-v4-scoring-note',
   'Contribution is a weighted summary of recorded actions, not the mission grade or Campaign XP. '+
   'Combat: incapacitations 12 pts, damaging hits 2 pts, confirmed armor stops 1 pt. '+
   'Recon: distinct sightings and intelligence reports 2 pts. '+
   'Support: doors opened 2 pts, forced 4 pts, '+
   'window entries 3 pts. Objective: secured actions 8 pts.');
}
function scoreRank(op:OperatorAfterAction,operators:OperatorAfterAction[]){
 const tied=operators.filter(member=>member.rank===op.rank).length>1;
 return (tied?'TIED #':'#')+op.rank;
}
function rankRow(op:OperatorAfterAction,operators:OperatorAfterAction[],
 selectedId:string|null,choose:(id:string|null)=>void){
 const row=action('',()=>choose(op.id),'fw-v3-roster-card fw-v4-rank-row');
 row.setAttribute('aria-pressed',String(op.id===selectedId));
 row.setAttribute('data-after-operator-id',op.id);
 row.setAttribute('aria-label',op.name+', '+scoreRank(op,operators)+
   ' in recorded contribution, '+op.contribution+' points, '+statusName(op.status));
 const rank=el('span','fw-v4-rank-number',scoreRank(op,operators));
 const name=el('span','fw-v4-rank-identity');
 name.append(el('strong','',op.name),
   el('small','',statusName(op.status)));
 const points=el('span','fw-v4-rank-points');
 points.append(el('strong','',String(op.contribution)),
   el('small','','PTS'));
 row.append(rank,name,points);
 return row;
}
function initialOverview(report:AfterActionReport){
 const root=el('div','fw-v4-team-overview');
 const total=report.operators.reduce((sum,op)=>sum+op.contribution,0);
 const heading=el('div','fw-v4-overview-heading');
 heading.append(el('span','fw-after-caption','RECORDED TEAM CONTRIBUTIONS'),
   el('strong','',total+' pts'));
 root.append(heading);
 const totals={combat:0,recon:0,support:0,objective:0};
 for(const op of report.operators)
   for(const category of categories)
     totals[category]+=op.categories[category];
 root.append(breakdown(totals));
 root.append(el('p','fw-v4-select-note',
   'Select any ranked operator to inspect their actions and condition.'));
 root.append(pointExplanation());
 return root;
}
function selectedOverview(op:OperatorAfterAction,
 operators:OperatorAfterAction[],choose:(id:string|null)=>void,
 more:(id:string)=>void){
 const root=el('div','fw-v4-selected-overview');
 const top=el('div','fw-v4-selected-top');
 const name=el('div','fw-v3-squad-name');
 name.append(el('small','',scoreRank(op,operators)+' OF '+operators.length+
   ' · RECORDED CONTRIBUTION'),
   el('h2','',op.name),
   el('span','',statusName(op.status)));
 const points=el('div','fw-v4-selected-total');
 points.append(el('strong','',String(op.contribution)),
   el('small','','TOTAL PTS'));
 top.append(name,points);
 root.append(top,breakdown(op.categories));
 const counts=el('div','fw-v4-selected-counts');
 counts.append(
   el('span','',op.shots?op.hits+' / '+op.shots+' HITS / SHOTS':'NO SHOTS RECORDED'),
   el('span','',op.incapacitations+' INCAPACITATIONS'),
   el('span','',op.contactReports+' CONTACT REPORTS')
 );
 root.append(counts);
 const earned=distinction(op);
 if(earned)root.append(el('div','fw-v3-distinction','✦ '+earned));
 const actions=el('div','fw-v4-selected-actions');
 actions.append(
   action('FULL OPERATOR RECORD',()=>more(op.id),'fw-v3-details-link'),
   action('ALL OPERATORS',()=>choose(null),'fw-v4-overview-back')
 );
 root.append(actions);
 if(!op.shots&&!op.contactReports&&!op.contribution)
   root.append(el('p','fw-after-muted',
     'NO ATTRIBUTABLE RECORDED CONTRIBUTIONS · NOT A MEASURE OF PERFORMANCE'));
 return root;
}
export function renderSquadView(report:AfterActionReport,
 _manifest:ReplayManifest|null,selectedId:string|null,
 choose:(id:string|null)=>void,more:(id:string)=>void):HTMLElement{
 const section=el('section','fw-v3-squad fw-v4-squad');
 const operators=report.operators;
 if(!operators.length){
   section.append(el('p','fw-after-empty','NO RECORDED SQUAD AVAILABLE'));
   return section;
 }
 const intro=el('header','fw-v4-squad-heading');
 intro.append(el('h2','','SQUAD CONTRIBUTION'),
   el('p','','RANKED BY RECORDED WEIGHTED POINTS'));
 section.append(intro);
 const content=el('div','fw-v4-squad-content');
 const roster=el('nav','fw-v3-roster fw-v4-rank-list');
 roster.setAttribute('aria-label','Squad ranked by recorded contribution');
 const selected=operators.find(op=>op.id===selectedId)??null;
 for(const op of operators)
   roster.append(rankRow(op,operators,selected?.id??null,choose));
 const focus=el('div','fw-v3-squad-focus fw-v4-squad-focus');
 focus.append(selected?selectedOverview(selected,operators,choose,more):
   initialOverview(report));
 content.append(roster,focus);section.append(content);
 if(!report.complete)section.append(el('p','fw-after-muted fw-v4-partial',
   'PARTIAL REPLAY · RANKING MAY OMIT UNRECORDED ACTIONS'));
 return section;
}
export function renderSquadDetails(op:OperatorAfterAction):HTMLElement{
 const root=el('section','fw-v3-operator-details');
 root.append(el('h3','',op.name+' / RECORDED CONTRIBUTIONS'));
 const pairs:[string,string][]=[
  ['CONDITION',statusName(op.status)],
  ['CONTRIBUTION RANK','#'+String(op.rank)],
  ['TOTAL RECORDED CONTRIBUTION',String(op.contribution)+' pts'],
  ['COMBAT CONTRIBUTION',String(op.categories.combat)+' pts'],
  ['RECON CONTRIBUTION',String(op.categories.recon)+' pts'],
  ['SUPPORT CONTRIBUTION',String(op.categories.support)+' pts'],
  ['OBJECTIVE CONTRIBUTION',String(op.categories.objective)+' pts'],
  ['SHOTS',String(op.shots)],['HITS',String(op.hits)],
  ['DAMAGING HITS',String(op.damagingHits)],
  ['CONFIRMED ARMOR STOPS',String(op.armorStops)],
  ['INCAPACITATIONS',String(op.incapacitations)],
  ['CONTACT REPORTS',String(op.contactReports)],
  ['DOORS OPENED',op.doorsOpened===null?'NOT RECORDED':String(op.doorsOpened)],
  ['DOORS FORCED',op.doorsForced===null?'NOT RECORDED':String(op.doorsForced)],
  ['WINDOW ENTRIES',op.windowsTraversed===null?'NOT RECORDED':String(op.windowsTraversed)]
 ];
 for(const [label,value] of pairs){
  const row=el('div','fw-after-pair');
  row.append(el('span','',label),el('span','',value));root.append(row);
 }
 const earned=distinction(op);
 if(earned)root.append(el('p','fw-v3-distinction','✦ '+earned));
 root.append(pointExplanation());
 return root;
}
