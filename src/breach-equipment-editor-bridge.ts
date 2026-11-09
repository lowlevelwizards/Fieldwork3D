/** Stage 10d: editor workbench routing against live state, preserving persistence.
 */
import type {RosterState} from './breach-roster.ts';
import type {CampaignState} from './campaign-state.ts';
import type {Session} from './breach-game.ts';
type CampaignMode='menu'|'home'|'mission'|'quick';
export type EquipmentEditorBridgeHooks={
 getRoster:()=>RosterState;setRoster:(value:RosterState)=>void;
 getCampaign:()=>CampaignState|null;setCampaign:(value:CampaignState)=>void;
 getSession:()=>Session;getMode:()=>CampaignMode;isReplaying:()=>boolean;
 saveCampaign:()=>boolean;showHelp:(message:string,duration:number)=>void;
 onQuickApplied:(id:string)=>void;onCampaignApplied:()=>void;
};
export function createBreachEquipmentEditorBridge(config:EquipmentEditorBridgeHooks){
async function openQuickArsenal(id:string){
 if(config.getSession().phase!=='planning'||config.isReplaying()||config.getMode()!=='quick')return;
 const member=config.getRoster().members.find(m=>m.id===id);
 if(!member)return;
 try{
  const [{arsenalRecipeFromLegacy},{openArsenalWorkbench},
   {applyQuickPlayArsenalEdit,quoteQuickPlayArsenalEdit}]=await Promise.all([
    import('./arsenal/recipes.ts'),import('./arsenal/workbench-screen.ts'),
    import('./arsenal/quickplay-adapter.ts')]);
  if(config.getSession().phase!=='planning'||config.isReplaying()||config.getMode()!=='quick')return;
  const current=config.getRoster().members.find(m=>m.id===id);
  const recipe=current&&arsenalRecipeFromLegacy(current.weaponConfiguration);
  if(!current||!recipe){config.showHelp('THIS WEAPON USES THE LEGACY LOADOUT EDITOR',3000);return;}
  openArsenalWorkbench({id:'equipped-quick-'+id,name:current.callsign,recipe},undefined,{
   mode:'quick',applyLabel:'APPLY TO OPERATOR',
   quote:r=>{
    const result=quoteQuickPlayArsenalEdit(config.getRoster(),id,r);
    return {...result,canCommit:result.valid};
   },
   onApply:nextRecipe=>{
    if(config.getSession().phase!=='planning'||config.isReplaying()||config.getMode()!=='quick')
     return {ok:false,message:'Equipment changes are only available before deployment'};
    const next=applyQuickPlayArsenalEdit(config.getRoster(),id,nextRecipe);
    if(next===config.getRoster()&&
     !config.getRoster().members.some(m=>m.id===id))
     return {ok:false,message:'Operator is unavailable'};
    config.setRoster(next);
    
    config.onQuickApplied(id);
    return {ok:true};
   }
  });
 }catch{
  config.showHelp('ARSENAL UNAVAILABLE · EXISTING LOADOUT EDITOR STILL WORKS',4000);
 }
}

async function openCampaignArsenal(id:string){
 if(!config.getCampaign()||config.getCampaign().activeContractId)return;
 try{
  const [{arsenalRecipeFromLegacy},{openArsenalWorkbench},
   {quoteCampaignArsenalEdit,commitCampaignArsenalEdit}]=await Promise.all([
    import('./arsenal/recipes.ts'),import('./arsenal/workbench-screen.ts'),
    import('./arsenal/config.getCampaign()-adapter.ts')]);
  const current=config.getCampaign();
  const member=current?.operators.find(o=>o.id===id&&o.status!=='retired'&&o.status!=='lost');
  if(!current||current.activeContractId||!member)return;
  const recipe=arsenalRecipeFromLegacy(member.weaponConfiguration);
  if(!recipe){config.showHelp('THIS WEAPON USES THE LEGACY ARMORY',3000);return;}
  openArsenalWorkbench({id:'equipped-config.getCampaign()-'+id,name:member.callsign,recipe},undefined,{
   mode:'campaign',applyLabel:'EQUIP WEAPON',
   quote:r=>{const current=config.getCampaign();return current?quoteCampaignArsenalEdit(current,id,r):
    {valid:false,canCommit:false,reason:'Campaign unavailable'};},
   onApply:r=>{
    const before=config.getCampaign();
    if(!before)return {ok:false,message:'Campaign unavailable'};
    const result=commitCampaignArsenalEdit(before,id,r);
    if(!result.quote.canCommit)
     return {ok:false,message:result.quote.reason??'Cannot equip this build'};
    if(result.state===before)return {ok:true};
    config.setCampaign(result.state);
    if(!config.saveCampaign()){
     config.setCampaign(before);return {ok:false,message:'Could not save Campaign. No equipment was changed.'};
    }
    config.onCampaignApplied();return {ok:true};
   }
  });
 }catch{
  config.showHelp('ARSENAL UNAVAILABLE · EXISTING ARMORY STILL WORKS',4000);
 }
}

 return {openQuickArsenal,openCampaignArsenal};
}
