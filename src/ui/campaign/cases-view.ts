import {uiNode as node,uiButton as button} from '../dom-elements.ts';
import type {CampaignState,Contract} from '../../campaign-state.ts';
import {campaignIncidentView} from '../../dispatch-incident-view.ts';
import {campaignIntelBalance} from '../../campaign-state.ts';
import type {CampaignHomeTab} from './home-tabs.ts';
/** Case browser: the facade supplies card rendering and authoritative actions. */
export function renderCampaignCases(c:CampaignState,selectedCaseId:string|null,
 onSelect:(id:string)=>void,renderContract:(contract:Contract)=>HTMLElement,
 resumeContract:()=>void,activateTab:(tab:CampaignHomeTab)=>void){
  const jobs=node('section','campaign-section');
  jobs.append(node('h2','','AVAILABLE CONTRACTS'));
  const pressure=Object.entries(c.regionalPressure).filter(([,value])=>value!==0);
  if(pressure.length)jobs.append(node('p','campaign-note',
   'REGIONAL PRESSURE: '+pressure.map(([region,n])=>
    region+' '+(n>0?'+'+n:n)).join(' · ')));
  const accepted=c.contracts.find(k=>k.id===c.activeContractId);
  if(accepted){
   jobs.append(node('p','campaign-note','Deployment committed: '+campaignIncidentView(c,accepted).title+' / '+accepted.region));
   jobs.append(node('p','campaign-note','Continuing after reopening starts the same contract at planning.'));
   jobs.append(button('CONTINUE DEPLOYMENT',resumeContract,'campaign-primary'));
  }else{
   const openContracts=c.contracts.filter(k=>
    k.status==='available'&&k.deadline>=c.day);
   if(!openContracts.length){
    const empty=node('div','campaign-contract-empty');
    empty.append(node('strong','','NO ACTIVE CASES'),
     node('p','campaign-note',
      'No assignments are currently available. You can review the squad, supplies, or service history.'));
    const links=node('div','campaign-contract-empty-actions');
    links.append(
     button('REVIEW SQUAD',()=>activateTab('personnel')),
     button('CHECK SUPPLIES',()=>activateTab('logistics')));
    empty.append(links);jobs.append(empty);
   }else{
    const sorted=[...openContracts].sort((a,b)=>
     a.deadline-b.deadline||a.id.localeCompare(b.id));
    // UXR-05: one active case, explicit navigation and a direct case index.
    // All cards stay mounted to preserve intel disclosures; only one is visible.
    const selectedCase=sorted.findIndex(k=>k.id===selectedCaseId);
    let current=selectedCase<0?0:selectedCase;
    const browser=node('section','campaign-uxr-case-browser');
    const browseHead=node('div','campaign-uxr-case-heading');
    const caseIndex=node('span','campaign-uxr-case-position');
    caseIndex.setAttribute('aria-live','polite');
    const prev=button('PREV',()=>selectCase(current-1),'campaign-uxr-case-prev');
    const next=button('NEXT',()=>selectCase(current+1),'campaign-uxr-case-next');
    browseHead.append(prev,caseIndex,next);
    const board=node('div','campaign-contract-board campaign-uxr-case-pages');
    const pages=sorted.map(k=>renderContract(k));
    for(const page of pages)board.append(page);
    const indexRail=node('div','campaign-uxr-case-index');
    indexRail.setAttribute('aria-label','Select a case directly');
    const selectors=sorted.map((k,i)=>{
     const title=campaignIncidentView(c,k).title;
     const buttonItem=button(String(i+1).padStart(2,'0')+' · '+title,
      ()=>selectCase(i),'campaign-uxr-case-index-item');
     buttonItem.setAttribute('aria-label','Select case '+(i+1)+' of '+sorted.length+' · '+title);
     indexRail.append(buttonItem);
     return buttonItem;
    });
    function showCase(index:number){
     current=Math.max(0,Math.min(sorted.length-1,index));
     for(let i=0;i<pages.length;i++)pages[i].hidden=i!==current;
     for(let i=0;i<selectors.length;i++)
      selectors[i].setAttribute('aria-current',i===current?'true':'false');
     caseIndex.textContent='CASE '+(current+1)+' / '+sorted.length;
     prev.disabled=current===0;next.disabled=current===sorted.length-1;
    }
    // Persist selection without mutating a save. Updated in the listener,
    // rather than by the projection or case contents.
    const selectCase=(index:number)=>{
     showCase(index);
     onSelect(sorted[current].id);
    };
    let initialTouch:{x:number;y:number}|null=null;
    board.addEventListener('touchstart',event=>{
     const touch=event.touches[0];
     if(touch&&event.touches.length===1)
      initialTouch={x:touch.clientX,y:touch.clientY};
    },{passive:true});
    board.addEventListener('touchend',event=>{
     if(!initialTouch)return;
     const touch=event.changedTouches[0];
     const deltaX=touch.clientX-initialTouch.x;
     const deltaY=touch.clientY-initialTouch.y;
     if(Math.abs(deltaX)>55&&Math.abs(deltaX)>Math.abs(deltaY)*1.45)
      selectCase(current+(deltaX<0?1:-1));
     initialTouch=null;
    },{passive:true});
    showCase(current);
    onSelect(sorted[current].id);
    browser.append(node('p','campaign-contract-board-summary',
     'INTEL '+campaignIntelBalance(c)+' · EARLIEST DEADLINE FIRST'),browseHead,board,indexRail);
    jobs.append(browser);
   }
  }
 return jobs;
}
