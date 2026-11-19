/** L2.7A — Campaign pre-GO field kit editor.
 * Same physical inventory UI as Operations Room and Quick Play; no separate
 * stock authority, no tactical simulation mutation, and no persistent timer.
 */
import type {CampaignState} from '../campaign-state.ts';
import {initialFieldInventory,fieldQuantity,type FieldInventory}
 from '../equipment-field-inventory.ts';
import {FieldInventoryUndoHistory} from '../equipment-field-undo.ts';
import {createFieldGadgetEditor} from './field-gadget-editor.ts';
import {createLoadoutSquadRail} from './loadout-squad-rail.ts';
import {CampaignKitPreview} from '../equipment-preview.ts';
import './campaign-pre-go-prep.css';

export type CampaignPreGoPrepHooks={
 getCampaign:()=>CampaignState|null;
 canPrepare:()=>boolean;
 issue:(operatorId:string,inventory:FieldInventory)=>boolean;
};
export function mountCampaignPreGoPrep(briefingRoster:HTMLElement,
 hooks:CampaignPreGoPrepHooks):{close:()=>void;setAvailable:(available:boolean)=>void}{
 const launch=document.createElement('button');
 launch.type='button';launch.className='fw-pre-go-launch';
 launch.textContent='PREPARE SQUAD EQUIPMENT';
 launch.hidden=true;
 launch.setAttribute('aria-label','Prepare Campaign squad field equipment before GO');
 briefingRoster.insertAdjacentElement('afterend',launch);
 const backdrop=document.createElement('div');backdrop.className='fw-pre-go-backdrop';
 backdrop.hidden=true;
 const panel=document.createElement('section');panel.className='fw-pre-go-panel';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','Campaign squad preparation');
 const heading=document.createElement('header');heading.className='fw-pre-go-header';
 const title=document.createElement('div');title.className='fw-pre-go-title';
 const eyebrow=document.createElement('small');eyebrow.textContent='FIELDWORK / CAMPAIGN';
 const headingText=document.createElement('h2');headingText.textContent='SQUAD PREP';
 title.append(eyebrow,headingText);
 const closeButton=document.createElement('button');closeButton.type='button';
 closeButton.className='fw-pre-go-close';closeButton.textContent='BACK TO BRIEFING';
 heading.append(title,closeButton);
 const squadHost=document.createElement('div');
 const viewerHost=document.createElement('div');viewerHost.className='fw-pre-go-preview';
 const editorHost=document.createElement('div');editorHost.className='fw-pre-go-editor';
 const note=document.createElement('p');note.className='fw-pre-go-note';
 note.textContent='Equipment issued here updates the current mission before GO. No mission restart or resupply after execution.';
 panel.append(heading,note,squadHost,viewerHost,editorHost);backdrop.append(panel);
 document.body.append(backdrop);
 const undo=new FieldInventoryUndoHistory();
 let selectedId:string|null=null;
 let preview:CampaignKitPreview|null=null;
 let priorFocus:HTMLElement|null=null;
 const close=()=>{
  preview?.dispose();preview=null;
  backdrop.hidden=true;
  if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});
  priorFocus=null;
 };
 const canPrepare=()=>hooks.canPrepare()&&!!hooks.getCampaign()?.activeContractId;
 const render=(rebuildPreview=true)=>{
  if(backdrop.hidden||!canPrepare()){close();return;}
  const campaign=hooks.getCampaign();
  if(!campaign)return;
  const squad=campaign.squadIds.map(id=>campaign.operators.find(o=>o.id===id))
   .filter((o):o is CampaignState['operators'][number]=>!!o&&
    o.status!=='lost'&&o.status!=='retired');
  const selected=squad.find(o=>o.id===selectedId)??squad[0];
  if(!selected){close();return;}
  selectedId=selected.id;
  squadHost.replaceChildren(createLoadoutSquadRail(squad.map(o=>({
   id:o.id,name:o.callsign.toUpperCase(),detail:o.weapon.toUpperCase(),
   status:o.recoveryDays>0?'RECOVERING':'ASSIGNED'
  })),selected.id,id=>{selectedId=id;render(true);}));
  if(rebuildPreview||!preview){
   preview?.dispose();preview=null;viewerHost.replaceChildren();
   preview=new CampaignKitPreview(viewerHost,selected.id,selected.weapon,
    selected.appearanceSeed,selected.loadout,selected.weaponConfiguration,
    selected.magazines,selected.wardrobe,'carry');
  }else preview.updateEquipment(selected.weapon,selected.appearanceSeed,
    selected.loadout,selected.weaponConfiguration,selected.magazines,
    selected.wardrobe);
  const current=selected.loadout.fieldInventory??initialFieldInventory(selected.loadout);
  const flashElsewhere=squad.filter(o=>o.id!==selected.id)
   .reduce((n,o)=>n+fieldQuantity(o.loadout.fieldInventory??
    initialFieldInventory(o.loadout),'flashbang'),0);
  const onChange=(inventory:FieldInventory,undoing=false)=>{
   if(!canPrepare())return;
   note.textContent='Equipment issued here updates the current mission before GO. No resupply after execution.';
   // Rebuild just the equipment controls while keeping the finger/keyboard
   // position stable. A quantity tap must not jump the mission sheet.
   const focusedLabel=document.activeElement instanceof HTMLElement?
    document.activeElement.getAttribute('aria-label'):null;
   const scroll=panel.scrollTop;
   const before=hooks.getCampaign()?.operators.find(o=>o.id===selected.id);
   if(!before||!hooks.issue(selected.id,inventory))return;
   const after=hooks.getCampaign()?.operators.find(o=>o.id===selected.id);
   if(after){
    if(undoing)undo.clear(selected.id);
    else undo.record(selected.id,before.loadout.fieldInventory??
     initialFieldInventory(before.loadout),after.loadout.fieldInventory??
     initialFieldInventory(after.loadout));
   }
   render(false);
   panel.scrollTop=scroll;
   if(focusedLabel){
    const refocus=Array.from(editorHost.querySelectorAll<HTMLElement>(
     'button[aria-label],select[aria-label]')).find(el=>
      el.getAttribute('aria-label')===focusedLabel&&
      !(el as HTMLButtonElement|HTMLSelectElement).disabled);
    refocus?.focus({preventScroll:true});
   }
  };
  editorHost.replaceChildren(createFieldGadgetEditor({
   loadout:selected.loadout,magazines:selected.magazines,
   maxFlash:Math.max(0,campaign.supplies.flash-flashElsewhere),
   copyTargets:squad.filter(o=>o.id!==selected.id).map(o=>({
    id:o.id,name:o.callsign,loadout:o.loadout,magazines:o.magazines
   })),
   onCopy:(targetId,inventory)=>{
    if(!canPrepare())return;
    const target=hooks.getCampaign()?.operators.find(o=>o.id===targetId);
    if(!target)return;
    const before=target.loadout.fieldInventory??initialFieldInventory(target.loadout);
    if(!hooks.issue(targetId,inventory)){
     note.textContent='Cannot copy this kit: check squad stock and available carrying space.';
     return;
    }
    const after=hooks.getCampaign()?.operators.find(o=>o.id===targetId);
    if(after)undo.record(targetId,before,
     after.loadout.fieldInventory??initialFieldInventory(after.loadout));
    note.textContent='Carried gadgets copied to '+target.callsign+
     '. The destination keeps its own weapon, armor, and medical supplies.';
    render(false);
   },
   canUndo:!!undo.peek(selected.id,current),
   onUndo:()=>{
    const snapshot=undo.peek(selected.id,current);
    if(snapshot)onChange(snapshot,true);
   },
   onCommit:inventory=>onChange(inventory)
  }));
 };
 launch.addEventListener('click',()=>{
  if(!canPrepare())return;
  priorFocus=document.activeElement instanceof HTMLElement?document.activeElement:launch;
  backdrop.hidden=false;render();closeButton.focus({preventScroll:true});
 });
 closeButton.addEventListener('click',close);
 backdrop.addEventListener('click',event=>{if(event.target===backdrop)close();});
 backdrop.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const items=Array.from(panel.querySelectorAll<HTMLButtonElement|HTMLSelectElement>(
   'button:not(:disabled),select:not(:disabled)'));
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 // The launch action is also used when the briefing can be reviewed after GO.
 // Its click gate, rather than stale CSS state, is the authoritative restriction.
 return {close,setAvailable:available=>{
  launch.hidden=!available;
  launch.disabled=!available;
  if(!available)close();
 }};
}
