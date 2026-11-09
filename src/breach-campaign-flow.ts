/** Stage 10b: Campaign screen and transitions; authoritative state stays in host.
 * All Campaign actions continue using campaign-state and campaign-persistence.
 */
import {CampaignScreen} from './campaign-ui.ts';
import {newCampaign,acceptContract,purchaseAmmo,purchaseMedical,purchaseFlash,
  resupplyOperator,resupplyMedicalOperator,treatOperator,hireRecruit,
  assignOperatorToSlot,buyWeapon,equipCampaignWeapon,repairCampaignArmor,
  serviceCampaignWeapon,equipCampaignGear,equipCampaignWeaponPreset,
  equipCampaignWeaponFamilyPart,equipCampaignWeaponAttachment,
  purchaseAndEquipWeaponAttachment,moveCampaignMagazine,saveCampaignKitPreset,
  applyCampaignKitPreset,deleteCampaignKitPreset,renameCampaignOperator,
  cycleCampaignAppearance,setCampaignWardrobe,retireOperator,
  type CampaignState} from './campaign-state.ts';
import {exportCampaign,importCampaign} from './campaign-persistence.ts';
import {familyPreset} from './equipment-weapon-families.ts';
import {confirmFieldworkAction} from './ui/fieldwork-controls.ts';
import type {IntelMode} from './breach-intel.ts';
import type {SiteScale} from './breach-site.ts';
import type {Session} from './breach-game.ts';
type CampaignMode='menu'|'home'|'mission'|'quick';
export type CampaignFlowHooks={
 getCampaign:()=>CampaignState|null;setCampaign:(value:CampaignState|null)=>void;
 saveCampaign:()=>boolean;
 getMode:()=>CampaignMode;setMode:(value:CampaignMode)=>void;
 getIntel:()=>IntelMode;setIntel:(value:IntelMode)=>void;
 getScale:()=>SiteScale;setScale:(value:SiteScale)=>void;
 getSession:()=>Session;
 siteSize:HTMLButtonElement;siteSettings:HTMLElement;randomSeed:()=>number;
 resetContract:(job:CampaignState['contracts'][number])=>void;
 launchQuickPlay:()=>void|Promise<void>;openReplayLibrary:()=>void;
 openStudio:(id:string)=>void;openArsenal:(id:string)=>void;
 showBriefing:()=>void;
};
export function createBreachCampaignFlow(config:CampaignFlowHooks){
 const model={
   get campaign(){return config.getCampaign();},
   set campaign(next:CampaignState|null){config.setCampaign(next);},
   get mode(){return config.getMode();},
   set mode(next:CampaignMode){config.setMode(next);},
   get intel(){return config.getIntel();},
   set intel(next:IntelMode){config.setIntel(next);},
   get scale(){return config.getScale();},
   set scale(next:SiteScale){config.setScale(next);}
 };
 const backButton=document.createElement('button');
 backButton.type='button';backButton.id='campaignReturnButton';
 backButton.textContent='OPERATIONS ROOM';
 backButton.setAttribute('aria-label','Return to campaign operations room');
 config.siteSettings.append(backButton);
const campaignScreen=new CampaignScreen({
 newCampaign:async()=>{
  if(model.campaign&&!await confirmFieldworkAction({
   title:'Start a new campaign?',
   message:'This replaces the active local campaign. Export a save first if you want to preserve it.',
   confirmLabel:'START NEW CAMPAIGN',danger:true
  }))return;
  model.campaign=newCampaign(config.randomSeed());
  config.saveCampaign();showCampaignHome();
 },
 continueCampaign:()=>showCampaignHome(),
 quickPlay:()=>{void config.launchQuickPlay();},
 openReplayLibrary:()=>config.openReplayLibrary(),
 chooseContract:(id)=>{
  if(!model.campaign)return;
  const next=acceptContract(model.campaign,id);
  if(next===model.campaign)return;
  model.campaign=next;config.saveCampaign();deployCampaignContract();
 },
 resumeContract:()=>deployCampaignContract(),
 buyAmmo:()=>{if(model.campaign){model.campaign=purchaseAmmo(model.campaign);config.saveCampaign();showCampaignHome();}},
 buyMedical:()=>{if(model.campaign){model.campaign=purchaseMedical(model.campaign);config.saveCampaign();showCampaignHome();}},
 buyFlash:()=>{if(model.campaign){model.campaign=purchaseFlash(model.campaign);config.saveCampaign();showCampaignHome();}},
 resupply:(id)=>{if(model.campaign){model.campaign=resupplyOperator(model.campaign,id);config.saveCampaign();showCampaignHome();}},
 resupplyMedical:(id)=>{if(model.campaign){
  model.campaign=resupplyMedicalOperator(model.campaign,id);config.saveCampaign();showCampaignHome();}},
 treat:(id)=>{if(model.campaign){model.campaign=treatOperator(model.campaign,id);config.saveCampaign();showCampaignHome();}},
 recruit:()=>{if(model.campaign){model.campaign=hireRecruit(model.campaign);config.saveCampaign();showCampaignHome();}},
 assignSlot:(slot,id)=>{if(model.campaign){model.campaign=assignOperatorToSlot(model.campaign,slot,id);
  config.saveCampaign();showCampaignHome();}},
 buyWeapon:(weapon)=>{if(model.campaign){model.campaign=buyWeapon(model.campaign,weapon);config.saveCampaign();showCampaignHome();}},
 equipWeapon:(id,weapon)=>{if(model.campaign){model.campaign=equipCampaignWeapon(model.campaign,id,weapon);
  config.saveCampaign();showCampaignHome();}},
 repairArmor:(id)=>{if(model.campaign){model.campaign=repairCampaignArmor(model.campaign,id);
  config.saveCampaign();showCampaignHome();}},
 serviceWeapon:(id)=>{if(model.campaign){model.campaign=serviceCampaignWeapon(model.campaign,id);
  config.saveCampaign();showCampaignHome();}},
 equipGear:(id,slot,itemId)=>{if(model.campaign){
  model.campaign=equipCampaignGear(model.campaign,id,slot,itemId);
  config.saveCampaign();showCampaignHome();}},
 equipWeaponPreset:(id,presetId)=>{if(model.campaign&&!model.campaign.activeContractId){
  const preset=familyPreset(presetId);
  const member=model.campaign.operators.find(o=>o.id===id);
  if(!preset||!member)return;
  let next=model.campaign;
  if(member.weapon!==preset.weapon){
   if((model.campaign.inventory.weapons[preset.weapon]??0)<1)return;
   next=equipCampaignWeapon(next,id,preset.weapon);
   if(next===model.campaign)return;
  }
  next=equipCampaignWeaponPreset(next,id,presetId);
  if(next===model.campaign)return;
  model.campaign=next;config.saveCampaign();showCampaignHome();}},
 equipWeaponFamilyPart:(id,slot,partId)=>{if(model.campaign){
  model.campaign=equipCampaignWeaponFamilyPart(model.campaign,id,slot,partId);
  config.saveCampaign();showCampaignHome();}},
 equipAttachment:(id,slot,partId,acquire)=>{if(model.campaign){
  model.campaign=acquire?
   purchaseAndEquipWeaponAttachment(model.campaign,id,slot,partId):
   equipCampaignWeaponAttachment(model.campaign,id,slot,partId);
  config.saveCampaign();showCampaignHome();}},
 moveMagazine:(id,magazineId,location)=>{if(model.campaign){
  model.campaign=moveCampaignMagazine(model.campaign,id,magazineId,location);
  config.saveCampaign();showCampaignHome();}},
 saveKitPreset:(id,name)=>{if(model.campaign){model.campaign=saveCampaignKitPreset(model.campaign,id,name);
  config.saveCampaign();showCampaignHome();}},
 applyKitPreset:(id,presetId)=>{if(model.campaign){model.campaign=applyCampaignKitPreset(model.campaign,id,presetId);
  config.saveCampaign();showCampaignHome();}},
 deleteKitPreset:(presetId)=>{if(model.campaign){model.campaign=deleteCampaignKitPreset(model.campaign,presetId);
  config.saveCampaign();showCampaignHome();}},
 renameOperator:(id,callsign)=>{if(model.campaign){model.campaign=renameCampaignOperator(model.campaign,id,callsign);
  config.saveCampaign();showCampaignHome();}},
 cycleAppearance:(id)=>{if(model.campaign){model.campaign=cycleCampaignAppearance(model.campaign,id);
  config.saveCampaign();showCampaignHome();}},
 setWardrobe:(id,look)=>{if(model.campaign){
  model.campaign=setCampaignWardrobe(model.campaign,id,look);
  config.saveCampaign();showCampaignHome();}},
 openStudio:(id)=>openOperatorStudio(id,'model.campaign'),
 openArsenal:(id)=>{void config.openArsenal(id);},
 exportSave:()=>{
  if(!model.campaign)return;
  const blob=new Blob([exportCampaign(model.campaign)],{type:'application/json'});
  const href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='fieldwork-'+model.campaign.id+'.json';
  document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
 },
 retire:(id)=>{
  if(!model.campaign||!window.confirm('Retire this operator from active service? Their career record will remain.'))return;
  model.campaign=retireOperator(model.campaign,id);config.saveCampaign();showCampaignHome();
 },
 importSave:(raw)=>{
  const next=importCampaign(raw);
  if(!next){window.alert('The selected file is not a valid Fieldwork model.campaign save.');return;}
  if(model.campaign&&!window.confirm('Replace the saved model.campaign with this import?'))return;
  model.campaign=next;config.saveCampaign();showCampaignHome();
 }
});
function showCampaignHome(){
 if(!model.campaign)return;
 model.mode='home';campaignScreen.home(model.campaign);
}
function deployCampaignContract(){
 if(!model.campaign?.activeContractId)return;
 const job=model.campaign.contracts.find(k=>k.id===model.campaign!.activeContractId);
 if(!job)return;
 model.mode='mission';
 model.intel=job.intel==='unknown'?'true-blind':
  job.intel==='scouted'?'exterior-known':'floor-plan';
 model.scale=job.scale;
 config.siteSize.textContent='MAP SIZE · '+model.scale.toUpperCase();
 config.resetContract(job);
 campaignScreen.hide();
 config.showBriefing();
}
function returnAfterCampaignMission(){
 if(model.mode==='mission'&&(config.getSession().phase==='won'||config.getSession().phase==='lost')){
  showCampaignHome();return true;
 }
 return false;
}
backButton.addEventListener('click',()=>{
 if(model.mode==='mission'&&config.getSession().phase==='running')return;
 if(model.campaign)showCampaignHome();
 else{model.mode='menu';campaignScreen.entry(false);}
});

 return {screen:campaignScreen,showHome:showCampaignHome,
   deployContract:deployCampaignContract,
   returnAfterMission:returnAfterCampaignMission};
}
