import {uiNode as node,uiButton as button} from '../dom-elements.ts';
export type CampaignHomeTab='overview'|'personnel'|'contracts'|'logistics'|'chronicle';
/** One mounted tab set. Owns only DOM selection; the facade owns durable UI preference. */
export function createCampaignHomeTabs(root:HTMLElement,sections:Record<CampaignHomeTab,HTMLElement>,
 initialTab:CampaignHomeTab,onSelect:(tab:CampaignHomeTab)=>void,
 openCaseCount:number,recordedOperationCount:number){
 let selectedTab=initialTab;
  const nav=node('nav','campaign-tabs');
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Operations Room sections');
  // Keep the five already-built sections alive while changing only visibility.
  // This avoids rebuilding every roster, contract and logistics control per tap.
  const activateTab=(tab:CampaignHomeTab)=>{
   if(selectedTab===tab)return;
   selectedTab=tab;onSelect(tab);
   for(const [id,panel] of Object.entries(sections))
    panel.hidden=id!==tab;
   for(const trigger of nav.querySelectorAll<HTMLButtonElement>('.campaign-tab')){
    const selected=trigger.id==='campaign-tab-'+tab;
    trigger.setAttribute('aria-selected',String(selected));
    trigger.tabIndex=selected?0:-1;
   }
   root.scrollTop=0;
  };
  nav.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const tabs=Array.from(nav.querySelectorAll<HTMLButtonElement>('.campaign-tab'));
   const current=tabs.indexOf(root.ownerDocument.activeElement as HTMLButtonElement);
   if(current<0)return;
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
    (current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   event.preventDefault();
   tabs[next].focus({preventScroll:true});
   tabs[next].click();
  });
  // Counts come from the same campaign snapshot as the visible panel.
  // They are navigation hints, not a second contract/record source of truth.
  for(const [tab,label,accessible] of [
   ['overview','Ops','Overview'],['personnel','Squad','Personnel'],
   ['contracts','Cases','Contracts'],['logistics','Supply','Logistics'],
   ['chronicle','Records','Chronicle']
  ] as const){
   const panel=sections[tab];
   panel.id='campaign-panel-'+tab;panel.setAttribute('role','tabpanel');
   panel.hidden=selectedTab!==tab;
   const trigger=button(label,()=>{
    activateTab(tab)
   },'campaign-tab');
   trigger.id='campaign-tab-'+tab;
   const count=tab==='contracts'?openCaseCount:
    tab==='chronicle'?recordedOperationCount:0;
   const context=tab==='contracts'?' available':
    tab==='chronicle'?' recorded operations':'';
   const accessibleLabel=count?accessible+' · '+count+context:accessible;
   trigger.setAttribute('aria-label',accessibleLabel);
   trigger.title=accessibleLabel;
   if(count){
    const counter=node('span','campaign-tab-count',String(count));
    counter.setAttribute('aria-hidden','true');
    trigger.append(counter);
   }
   trigger.setAttribute('role','tab');
   trigger.setAttribute('aria-selected',String(selectedTab===tab));
   trigger.setAttribute('aria-controls',panel.id);
   // One tab is in the sequential Tab order; arrows move between the others.
   trigger.tabIndex=selectedTab===tab?0:-1;
   panel.setAttribute('aria-labelledby',trigger.id);
   nav.append(trigger);
  }
 return {nav,activateTab};
}
