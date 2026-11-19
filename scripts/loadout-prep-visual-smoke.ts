/** One real-browser acceptance harness, kept off the shipping game flow. */
import {newCampaign,acceptContract,equipCampaignPreGoFieldInventory}
 from '../src/campaign-state.ts';
import {mountCampaignPreGoPrep} from '../src/ui/campaign-pre-go-prep.ts';
import type {FieldInventory} from '../src/equipment-field-inventory.ts';
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
document.documentElement.dataset.loadoutPrepReady='1';
