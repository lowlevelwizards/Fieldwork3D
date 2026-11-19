/** One real-browser acceptance harness, kept off the shipping game flow. */
import {newCampaign,acceptContract,equipCampaignPreGoFieldInventory}
 from '../src/campaign-state.ts';
import {mountCampaignPreGoPrep} from '../src/ui/campaign-pre-go-prep.ts';
import type {FieldInventory} from '../src/equipment-field-inventory.ts';
import {initialRoster,moveRosterMagazine,equipRosterCarryGear} from '../src/breach-roster.ts';
import {attachCarryGearChangePreview} from '../src/ui/carry-gear-change-controls.ts';
import {setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {createFieldGadgetEditor} from '../src/ui/field-gadget-editor.ts';
let campaign=newCampaign(73);
campaign=acceptContract(campaign,campaign.contracts[0].id);
campaign={...campaign,operators:campaign.operators.map(o=>({...o,magazines:[]}))};
let preparing=true;
const mount=mountCampaignPreGoPrep(document.getElementById('briefingRoster')!,{
 getCampaign:()=>campaign,
 canPrepare:()=>preparing,
 issue:(id:string,kit:FieldInventory)=>{
  const next=equipCampaignPreGoFieldInventory(campaign,id,kit);
  if(next===campaign)return false;
  campaign=next;return true;
 }
});
mount.setAvailable(true);
Object.assign(window,{loadoutPrepSmoke:{
 stop:()=>{preparing=false;},
 start:()=>{preparing=true;},
 close:mount.close,
 flash:(id:string)=>campaign.operators.find(o=>o.id===id)
  ?.loadout.fieldInventory?.stacks.filter(s=>s.itemId==='flashbang')
   .reduce((sum,s)=>sum+s.quantity,0)??0
 }});
// Nonshipping placement witness uses the actual roster magazine authority.
let roster=initialRoster();
const magazineHost=document.createElement('section');
magazineHost.id='magazinePlacementSmoke';
magazineHost.style.cssText='max-width:720px;margin:12px auto;min-width:0';
document.body.append(magazineHost);
const renderMagazineEditor=()=>{
 const operator=roster.members[0];
 magazineHost.replaceChildren(createFieldGadgetEditor({
  loadout:operator.loadout,magazines:operator.magazines,onCommit:()=>{},
  onMoveMagazine:(id,to)=>{
   const next=moveRosterMagazine(roster,operator.id,id,to);
   if(next===roster)throw Error('Owner rejected a quoted magazine move');
   roster=next;renderMagazineEditor();
  }
 }));
};
renderMagazineEditor();
// L2.12C3–C4: real interactive gear-change smoke, not a shipping flow.
let carryRoster=initialRoster();
const carryHost=document.createElement('section');
carryHost.id='carryGearSwapSmoke';carryHost.style.cssText=
 'max-width:720px;margin:12px auto;min-width:0';
document.body.append(carryHost);
const renderCarry=()=>{
 const operator=carryRoster.members[0];
 carryHost.replaceChildren();
 const current=document.createElement('output');current.dataset.role='current-rig';
 current.textContent=operator.loadout.slots.rig;carryHost.append(current);
 const selector=document.createElement('select');
 selector.setAttribute('aria-label','Rig change preview witness');
 for(const [id,name] of [['rig-light','Light Chest Rig'],
  ['rig-none','No Chest Rig'],['rig-full','Field Webbing']]){
  const opt=document.createElement('option');opt.value=id;opt.textContent=name;
  selector.append(opt);
 }
 selector.value=operator.loadout.slots.rig;carryHost.append(selector);
 attachCarryGearChangePreview({
  select:selector,host:carryHost,slot:'rig',kit:operator.loadout,
  magazines:operator.magazines,
  onApply:item=>{
   const next=equipRosterCarryGear(carryRoster,operator.id,'rig',item);
   if(next===carryRoster)throw Error('Owner rejected quoted carry change');
   carryRoster=next;renderCarry();
  }
 });
};
renderCarry();
const blockedHost=document.createElement('section');
blockedHost.id='carryGearBlockedSmoke';blockedHost.style.cssText=
 'max-width:720px;margin:12px auto;min-width:0';
document.body.append(blockedHost);
const cramped=carryRoster.members[0];
let crampedKit=setEquipmentChoice(cramped.loadout,'backpack','backpack-none');
crampedKit=setEquipmentChoice(crampedKit,'belt','belt-none');
const denied=document.createElement('select');
denied.setAttribute('aria-label','Blocked rig change witness');
for(const item of ['rig-light','rig-none']){
 const option=document.createElement('option');option.value=item;
 option.textContent=item;denied.append(option);
}
denied.value='rig-light';blockedHost.append(denied);
attachCarryGearChangePreview({select:denied,host:blockedHost,slot:'rig',
 kit:crampedKit,magazines:cramped.magazines,
 onApply:()=>{throw Error('Blocked physical change was committed')}
});
document.documentElement.dataset.loadoutPrepReady='1';
