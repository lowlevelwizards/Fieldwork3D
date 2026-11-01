/** Campaign screens. Render only on navigation and state changes, never per frame. */
import type {CampaignState,Contract} from './campaign-state.ts';
import {SKILL_NAMES} from './campaign-state.ts';
import './campaign-style.css';

export type CampaignHandlers={
 newCampaign:()=>void;continueCampaign:()=>void;quickPlay:()=>void;
 chooseContract:(id:string)=>void;resumeContract:()=>void;
};
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',label='')=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(label)el.textContent=label;return el;
};
const button=(label:string,action:()=>void,cls='')=>{
 const b=node('button',cls,label);b.type='button';b.addEventListener('click',action);return b;
};
export class CampaignScreen{
 readonly root=node('section','campaign-screen');
 private readonly handlers:CampaignHandlers;
 constructor(handlers:CampaignHandlers){
  this.handlers=handlers;
  this.root.setAttribute('aria-label','Fieldwork campaign');
  this.root.hidden=true;
  document.body.append(this.root);
 }
 hide(){this.root.hidden=true;}
 entry(hasSave:boolean){
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell');
  main.append(node('div','campaign-eyebrow','FIELDWORK / VERDIGRIS'));
  main.append(node('h1','','FIELD OPERATIONS'));
  main.append(node('p','campaign-lede','One unit. Persistent operations. Every deployment leaves a history.'));
  if(hasSave)main.append(button('CONTINUE CAMPAIGN',this.handlers.continueCampaign,'campaign-primary'));
  main.append(button('NEW CAMPAIGN',this.handlers.newCampaign,'campaign-primary'));
  main.append(button('QUICK PLAY — TACTICAL SANDBOX',this.handlers.quickPlay));
  main.append(node('p','campaign-note','Quick Play remains separate from your persistent campaign.'));
  this.root.append(main);
 }
 home(c:CampaignState){
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell campaign-wide');
  const top=node('div','campaign-head');
  const title=node('div');
  title.append(node('div','campaign-eyebrow','FIELDWORK / VERDIGRIS'));
  title.append(node('h1','','OPERATIONS ROOM'));
  top.append(title,node('div','campaign-funds','DAY '+c.day+' · '+c.funds+' CR'));
  main.append(top);
  const grid=node('div','campaign-grid');
  const personnel=node('section','campaign-section');
  personnel.append(node('h2','','PERSONNEL'));
  const roster=node('div','campaign-roster');
  for(const p of c.operators){
   const card=node('article','campaign-person');
   card.append(node('strong','',p.callsign),node('span','',p.background));
   card.append(node('small','',p.recoveryDays?'RECOVERING · '+p.recoveryDays+' DAYS':p.status.toUpperCase()));
   const skill=p.skills.handling;
   card.append(node('small','','HANDLING '+Math.round(skill*100)+' / 100 · '+p.missions+' OPS'));
   const details=node('details','campaign-dossier');
   details.append(node('summary','','DOSSIER / SKILLS'));
   for(const skill of SKILL_NAMES){
    const label=skill.replace(/([A-Z])/g,' $1').toUpperCase();
    const line=node('div','campaign-skill');
    line.append(node('span','',label),node('span','',Math.round(p.skills[skill]*100)+'/100'));
    const bar=node('div','campaign-skill-track');
    const fill=node('div','campaign-skill-fill');
    fill.style.width=Math.round(p.skills[skill]*100)+'%';bar.append(fill);
    details.append(line,bar);
   }
   const history=c.journal.filter(e=>e.operatorId===p.id).slice(-4).reverse();
   for(const e of history)details.append(node('p','campaign-note',
    'DAY '+e.day+' · '+e.detail));
   card.append(details);
   roster.append(card);
  }
  personnel.append(roster);
  const notice=node('p','campaign-note',c.history.length?
   'LAST OPERATION: '+c.history[c.history.length-1].grade+' · '+c.history[c.history.length-1].outcome.toUpperCase():
   'No operations completed. Select your first contract.');
  personnel.append(notice);
  grid.append(personnel);
  const jobs=node('section','campaign-section');
  jobs.append(node('h2','','AVAILABLE CONTRACTS'));
  const accepted=c.contracts.find(k=>k.id===c.activeContractId);
  if(accepted){
   jobs.append(node('p','campaign-note','Deployment committed: '+accepted.title+' / '+accepted.region));
   jobs.append(button('CONTINUE DEPLOYMENT',this.handlers.resumeContract,'campaign-primary'));
  }else{
   for(const contract of c.contracts.filter(k=>k.status==='available'&&k.deadline>=c.day).slice(0,3)){
    jobs.append(this.contract(contract));
   }
  }
  grid.append(jobs);main.append(grid);
  const footer=node('div','campaign-footer');
  footer.append(button('QUICK PLAY (NO CAMPAIGN PROGRESS)',this.handlers.quickPlay));
  main.append(footer);this.root.append(main);
 }
 private contract(c:Contract){
  const card=node('article','campaign-contract');
  card.append(node('strong','',c.title));
  card.append(node('div','campaign-muted',c.region+' · '+['','LOW','MODERATE','HIGH'][c.risk]+' RISK'));
  card.append(node('p','',c.description));
  const row=node('div','campaign-contract-row');
  row.append(node('span','',c.reward+' CR · DEADLINE DAY '+c.deadline));
  row.append(button('BRIEF / DEPLOY',()=>this.handlers.chooseContract(c.id),'campaign-primary'));
  card.append(row);return card;
 }
}
