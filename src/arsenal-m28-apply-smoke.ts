/** M2.8C: real Workbench + real Campaign/Quick Play adapters.
 * Build pure, isolated fixture state. No user's saves, Campaign, or server data.
 */
import {openArsenalWorkbench,type ArsenalWorkbenchApplyContext}
 from './arsenal/workbench-screen.ts';
import {arsenalRecipeFromLegacy} from './arsenal/recipes.ts';
import {newCampaign,purchaseAndEquipWeaponAttachment,readCampaign}
 from './campaign-state.ts';
import {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}
 from './arsenal/campaign-adapter.ts';
import {initialRoster,readRoster} from './breach-roster.ts';
import {setWeaponAttachment} from './equipment-weapon-assemblies.ts';
import {quoteQuickPlayArsenalEdit,applyQuickPlayArsenalEdit}
 from './arsenal/quickplay-adapter.ts';
import type {ArsenalSavedBuild} from './arsenal/saved-builds.ts';

const body=document.body,quick=new URLSearchParams(location.search).get('mode')==='quick';
const source=(recipe:NonNullable<ReturnType<typeof arsenalRecipeFromLegacy>>)=>
 ({id:'arsenal-m28-test',name:'M2.8 Test Rig',recipe}) as ArsenalSavedBuild;
if(quick){
 let roster=initialRoster();
 const member=roster.members.find(m=>m.id==='rook');
 if(!member)throw Error('Missing Quick Play Rook');
 const config=setWeaponAttachment(member.weaponConfiguration,'light','light-compact');
 if(config.slots.light!=='light-compact')throw Error('Quick Play light unsupported');
 roster={...roster,members:roster.members.map(m=>m.id==='rook'?
  {...m,weaponConfiguration:config}:m)};
 const recipe=arsenalRecipeFromLegacy(config);
 if(!recipe)throw Error('Invalid initial Quick Play recipe');
 body.dataset.m28Before=JSON.stringify({funds:null,light:config.slots.light});
 const context:ArsenalWorkbenchApplyContext={
  mode:'quick',applyLabel:'APPLY TO OPERATOR',
  quote:r=>quoteQuickPlayArsenalEdit(roster,'rook',r),
  onApply:r=>{
   const next=applyQuickPlayArsenalEdit(roster,'rook',r);
   if(next===roster)return {ok:false,message:'Quick Play Apply did not change roster'};
   roster=next;
   const persisted=readRoster(JSON.stringify(roster));
   const config=persisted.members.find(m=>m.id==='rook')?.weaponConfiguration;
   body.dataset.m28Applied=JSON.stringify({
    funds:null,light:config?.slots.light,face:config?.mountSelections?.light?.face,
    sameSave:config?.mountSelections?.light?.face===
     roster.members.find(m=>m.id==='rook')?.weaponConfiguration.mountSelections?.light?.face
   });
   return {ok:true};
  }
 };
 openArsenalWorkbench(source(recipe),undefined,context);
}else{
 let campaign=newCampaign(2828);
 campaign=purchaseAndEquipWeaponAttachment(campaign,'rook','light','light-compact');
 const operator=campaign.operators.find(o=>o.id==='rook');
 if(!operator||operator.weaponConfiguration.slots.light!=='light-compact')
  throw Error('Campaign fixture could not equip light');
 const recipe=arsenalRecipeFromLegacy(operator.weaponConfiguration);
 if(!recipe)throw Error('Invalid initial Campaign recipe');
 body.dataset.m28Before=JSON.stringify({
  funds:campaign.funds,lightStock:campaign.inventory.attachments['light-compact']??0,
  serial:operator.weaponSerialId,light:operator.weaponConfiguration.slots.light
 });
 const context:ArsenalWorkbenchApplyContext={
  mode:'campaign',applyLabel:'EQUIP BUILD',
  quote:r=>quoteCampaignArsenalEdit(campaign,'rook',r),
  onApply:r=>{
   const committed=commitCampaignArsenalEdit(campaign,'rook',r);
   if(committed.state===campaign)return {ok:false,message:'Campaign Apply did not change'};
   campaign=committed.state;
   const persisted=readCampaign(JSON.stringify(campaign));
   const current=persisted.operators.find(o=>o.id==='rook');
   body.dataset.m28Applied=JSON.stringify({
    funds:persisted.funds,lightStock:persisted.inventory.attachments['light-compact']??0,
    serial:current?.weaponSerialId,light:current?.weaponConfiguration.slots.light,
    face:current?.weaponConfiguration.mountSelections?.light?.face,
    sameSave:current?.weaponConfiguration.mountSelections?.light?.face===
     campaign.operators.find(o=>o.id==='rook')?.weaponConfiguration.mountSelections?.light?.face
   });
   return {ok:true};
  }
 };
 openArsenalWorkbench(source(recipe),undefined,context);
}
body.dataset.m28Ready='true';
