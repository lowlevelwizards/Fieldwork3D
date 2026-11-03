/** Campaign screens. Render only on navigation and state changes, never per frame. */
import type {CampaignState,Contract} from './campaign-state.ts';
import {SKILL_NAMES,WEAPON_PRICES,armorRepairCost,weaponServiceCost} from './campaign-state.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {sharedService} from './campaign-history.ts';
import {LOADOUT_SLOTS,itemsForSlot,itemDefinition} from './equipment-catalog.ts';
import {totalEquipmentMass,loadMobilityDescription,loadMovementScale,
 type LoadoutSlot} from './equipment-loadouts.ts';
import {CampaignKitPreview} from './equipment-preview.ts';
import {WARDROBE_ACCESSORY_SLOTS,WARDROBE_ACCESSORY_OPTIONS}
 from './operator-wardrobe-accessories.ts';
import {readWardrobe,resolvedWardrobe,
 setWardrobeStyle,WARDROBE_SLOTS,SLEEVE_STATES,TROUSER_HEMS,
 wardrobeItemsForSlot,type WardrobeOptions,type WardrobeSlot}
 from './operator-wardrobe-data.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {WeaponWorkbenchPreview} from './equipment-weapon-workbench.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot} from './equipment-weapon-assemblies.ts';
import {attachmentPrice} from './equipment-weapon-inventory.ts';
import {stageMagazines,magazinePlacementSummary,magazineSpace,
 type MagazineLocation} from './equipment-magazine-placement.ts';
import {kitMedicalSupplies,medicalSupplyCount} from './equipment-medical-supplies.ts';
import {promptFieldworkText,confirmFieldworkAction,showFieldworkNotice}
 from './ui/fieldwork-controls.ts';
import './campaign-style.css';
import './operator-headwear-picker.css';
import {createHeadwearAppearancePicker} from './operator-headwear-picker.ts';
import {createWardrobeFabricCamoPicker} from './operator-fabric-camo-picker.ts';
import {topColorwayChoices,resolvedTopColorway} from './operator-upper-colorways.ts';
import {sleeveStateOptions} from './operator-wardrobe-data.ts';
import './operator-fabric-camo-picker.css';

export type CampaignHandlers={
 newCampaign:()=>void;continueCampaign:()=>void;quickPlay:()=>void;
 chooseContract:(id:string)=>void;resumeContract:()=>void;
 buyAmmo:()=>void;buyMedical:()=>void;buyFlash:()=>void;
 resupply:(id:string)=>void;resupplyMedical:(id:string)=>void;
 treat:(id:string)=>void;
 recruit:()=>void;assignSlot:(slot:number,id:string)=>void;
 buyWeapon:(weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipWeapon:(id:string,weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipGear:(id:string,slot:LoadoutSlot,itemId:string)=>void;
 setWardrobe:(id:string,look:WardrobeOptions)=>void;
 equipAttachment:(id:string,slot:WeaponAttachmentSlot,partId:string,acquire:boolean)=>void;
 moveMagazine:(id:string,magazineId:string,location:MagazineLocation)=>void;
 repairArmor:(id:string)=>void;serviceWeapon:(id:string)=>void;
 saveKitPreset:(id:string,name:string)=>void;
 applyKitPreset:(id:string,presetId:string)=>void;
 deleteKitPreset:(presetId:string)=>void;
 renameOperator:(id:string,callsign:string)=>void;
 cycleAppearance:(id:string)=>void;
 exportSave:()=>void;importSave:(raw:string)=>void;retire:(id:string)=>void;
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
 private armoryOperatorId:string|null=null;
 private homeTab:'overview'|'personnel'|'contracts'|'logistics'|'chronicle'='overview';
 private preview:CampaignKitPreview|null=null;
 private workbench:WeaponWorkbenchPreview|null=null;
 private weaponView=false;
 private selectedMount:WeaponAttachmentSlot='optic';
 private lastArmoryRenderedId:string|null=null;
 private wardrobeExpanded=false;
 private headwearExpanded=false;
 private headwearCamoExpanded=false;
 private fabricPickerState:{expanded:boolean;openChannel:null|import('./operator-fabric-camo-policy.ts').FabricCamoChannel;filter:string}={expanded:false,openChannel:null,filter:''};
 private readonly operatorViewAngles=new Map<string,number>();
 private disposePreview(){
  if(this.preview&&this.lastArmoryRenderedId)
   this.operatorViewAngles.set(this.lastArmoryRenderedId,this.preview.getAzimuth());
  this.preview?.dispose();this.preview=null;
  this.workbench?.dispose();this.workbench=null;}
 constructor(handlers:CampaignHandlers){
  this.handlers=handlers;
  this.root.setAttribute('aria-label','Fieldwork campaign');
  this.root.hidden=true;
  document.body.append(this.root);
 }
 hide(){this.disposePreview();this.root.hidden=true;this.armoryOperatorId=null;}
 entry(hasSave:boolean){
  this.armoryOperatorId=null;
  this.disposePreview();
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell');
  main.append(node('div','campaign-eyebrow','FIELDWORK / VERDIGRIS'));
  main.append(node('h1','','FIELD OPERATIONS'));
  main.append(node('p','campaign-lede','One unit. Persistent operations. Every deployment leaves a history.'));
  const actions=node('div','campaign-entry-actions');
  if(hasSave)actions.append(button('CONTINUE CAMPAIGN',this.handlers.continueCampaign,'campaign-primary'));
  actions.append(button('NEW CAMPAIGN',this.handlers.newCampaign,
    hasSave?'':'campaign-primary'));
  actions.append(button('QUICK PLAY · TACTICAL SANDBOX',this.handlers.quickPlay));
  main.append(actions);
  main.append(node('p','campaign-note',
    'Quick Play has fresh health and equipment every round. Campaign progress stays separate.'));
  const saves=node('details','campaign-save-management');
  saves.append(node('summary','','MANAGE SAVES / IMPORT'));
  saves.append(node('p','campaign-note',
   'Import an exported Fieldwork campaign save to continue on this device.'));
  saves.append(this.importPicker());
  main.append(saves);
  this.root.append(main);
 }
 home(c:CampaignState){
  if(this.armoryOperatorId){
   const target=c.operators.find(x=>x.id===this.armoryOperatorId&&x.status!=='lost'&&x.status!=='retired');
   if(target){this.armory(c,target.id);return;}
   this.armoryOperatorId=null;
  }
  this.disposePreview();
  this.lastArmoryRenderedId=null;
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
  personnel.append(node('p','campaign-note',
   'STOCK: '+c.supplies.ammo+' ROUNDS · '+c.supplies.medical+
   ' MEDICAL KITS · '+c.supplies.flash+' FLASHBANGS'));
  const deployment=node('div','campaign-assignment');
  deployment.append(node('h2','','DEPLOYMENT TEAM'));
  for(let slot=0;slot<4;slot++){
   const line=node('label','campaign-assignment-row');
   line.append(node('span','','SLOT 0'+(slot+1)));
   const picker=node('select','campaign-select');
   picker.setAttribute('aria-label','Choose operator for tactical slot '+(slot+1));
   for(const member of c.operators.filter(p=>p.status!=='lost'&&p.status!=='retired')){
    const option=node('option','',member.callsign);
    option.value=member.id;
    picker.append(option);
   }
   picker.value=c.squadIds[slot];
   picker.disabled=!!c.activeContractId;
   picker.addEventListener('change',()=>this.handlers.assignSlot(slot,picker.value));
   line.append(picker);deployment.append(line);
  }
  personnel.append(deployment);
  const roster=node('div','campaign-roster');
  for(const p of c.operators.filter(p=>p.status!=='retired'&&p.status!=='lost')){
   const card=node('article','campaign-person');
   card.append(node('strong','',p.callsign),node('span','',p.background));
   card.append(node('small','',p.recoveryDays?'RECOVERING · '+p.recoveryDays+' DAYS':
    c.squadIds.includes(p.id)?'DEPLOYMENT TEAM':'RESERVE'));
   const skill=p.skills.handling;
   card.append(node('small','','HANDLING '+Math.round(skill*100)+' / 100 · '+p.missions+' OPS'));
   card.append(node('small','',p.trait));
   const details=node('details','campaign-dossier');
   details.append(node('summary','','DOSSIER / SKILLS'));
   details.append(node('p','campaign-note','BACKGROUND · '+p.background));
   details.append(node('p','campaign-note','SPECIAL APTITUDE · '+p.trait));
   for(const distinction of p.distinctions.slice(-4)){
    details.append(node('p','campaign-distinction','✦ '+distinction));
   }
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
   const colleagues=sharedService(c,p.id).slice(0,2);
   for(const friend of colleagues){
    const person=c.operators.find(x=>x.id===friend.id);
    details.append(node('p','campaign-note',
     'Served with '+(person?.callsign??friend.id)+' on '+friend.count+' operations'));
   }
   card.append(details);
   const actions=node('div','campaign-person-actions');
   const weaponPick=node('select','campaign-select');
   weaponPick.setAttribute('aria-label','Select weapon for '+p.callsign);
   for(const weapon of ['carbine','smg','rifle','shotgun'] as const){
    const opt=node('option','',weapon.toUpperCase()+' · '+c.inventory.weapons[weapon]+' SPARE');
    opt.value=weapon;opt.disabled=weapon!==p.weapon&&c.inventory.weapons[weapon]<1;
    weaponPick.append(opt);
   }
   weaponPick.value=p.weapon;weaponPick.disabled=!!c.activeContractId;
   weaponPick.addEventListener('change',()=>this.handlers.equipWeapon(p.id,
    weaponPick.value as 'carbine'|'smg'|'rifle'|'shotgun'));
   actions.append(button('CUSTOMIZE KIT',()=>{
    this.armoryOperatorId=p.id;this.home(c);
   },'campaign-primary'));
   actions.append(weaponPick);
   actions.append(button('RESUPPLY',()=>this.handlers.resupply(p.id)));
   const med=kitMedicalSupplies(p.loadout);
   const replenish=button('REISSUE MEDICAL '+medicalSupplyCount(p.medicalSupplies)+
    '/'+medicalSupplyCount(med)+' · 1 STOCK',
    ()=>this.handlers.resupplyMedical(p.id));
   replenish.disabled=!!c.activeContractId||c.supplies.medical<1||
    medicalSupplyCount(p.medicalSupplies)>=medicalSupplyCount(med)||
    medicalSupplyCount(med)===0;
   actions.append(replenish);
   if(p.recoveryDays>0)actions.append(button('TREAT',()=>this.handlers.treat(p.id)));
   if(!c.squadIds.includes(p.id)&&
    c.operators.filter(o=>o.status==='available'||o.status==='reserve').length>4)
    actions.append(button('RETIRE',()=>this.handlers.retire(p.id)));
   card.append(actions);
   roster.append(card);
  }
  personnel.append(roster);
  const logistics=node('section','campaign-section');
  logistics.append(node('h2','','SUPPLIES & LOGISTICS'));
  logistics.append(node('p','campaign-note',
   'STOCK: '+c.supplies.ammo+' ROUNDS · '+c.supplies.medical+
   ' MEDICAL KITS · '+c.supplies.flash+' FLASHBANGS'));
  const purchases=node('div','campaign-purchases');
  purchases.append(button('BUY 60 ROUNDS · 120 CR',this.handlers.buyAmmo),
   button('BUY MEDICAL KIT · 170 CR',this.handlers.buyMedical),
   button('BUY 2 FLASHBANGS · 150 CR',this.handlers.buyFlash));
  logistics.append(purchases);
  const inventory=node('div','campaign-armory');
  inventory.append(node('h2','','FIELD ARMORY'));
  for(const weapon of ['carbine','smg','rifle','shotgun'] as const){
   const stock=c.inventory.weapons[weapon],price=WEAPON_PRICES[weapon];
   const buy=button('BUY '+weapon.toUpperCase()+' · '+price+' CR · '+stock+' STOCK',
    ()=>this.handlers.buyWeapon(weapon));
   buy.disabled=c.funds<price||!!c.activeContractId;
   inventory.append(buy);
  }
  logistics.append(inventory);
  const recruit=button('RECRUIT OPERATOR · 450 CR',this.handlers.recruit);
  recruit.disabled=c.operators.length>=32||c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').length>=8||c.funds<450||!!c.activeContractId;
  personnel.append(recruit);
  const notice=node('p','campaign-note',c.history.length?
   'LAST OPERATION: '+c.history[c.history.length-1].grade+' · '+c.history[c.history.length-1].outcome.toUpperCase():
   'No operations completed. Select your first contract.');
  personnel.append(notice);
  grid.append(personnel);
  const jobs=node('section','campaign-section');
  jobs.append(node('h2','','AVAILABLE CONTRACTS'));
  const pressure=Object.entries(c.regionalPressure).filter(([,value])=>value!==0);
  if(pressure.length)jobs.append(node('p','campaign-note',
   'REGIONAL PRESSURE: '+pressure.map(([region,n])=>
    region+' '+(n>0?'+'+n:n)).join(' · ')));
  const accepted=c.contracts.find(k=>k.id===c.activeContractId);
  if(accepted){
   jobs.append(node('p','campaign-note','Deployment committed: '+accepted.title+' / '+accepted.region));
   jobs.append(node('p','campaign-note','Continuing after reopening starts the same contract at planning.'));
   jobs.append(button('CONTINUE DEPLOYMENT',this.handlers.resumeContract,'campaign-primary'));
  }else{
   for(const contract of c.contracts.filter(k=>k.status==='available'&&k.deadline>=c.day).slice(0,3)){
    jobs.append(this.contract(contract,c));
   }
  }
  grid.append(jobs);main.append(grid);
  const chronicle=node('section','campaign-section campaign-chronicle');
  chronicle.append(node('h2','','UNIT CHRONICLE'));
  if(c.history.length===0)chronicle.append(node('p','campaign-note',
   'Your unit history will appear here after its first operation.'));
  for(const report of c.history.slice(-8).reverse()){
   const contract=c.contracts.find(k=>k.id===report.contractId);
   chronicle.append(node('p','campaign-report',
    'DAY '+report.day+' · '+(contract?.title??'Operation')+' · '+
    report.outcome.toUpperCase()+' · '+report.grade+' · '+
    report.participatingIds.length+' OPERATORS'));
  }
  const highlights=c.journal.filter(e=>['wounded','first-deployment','first-success','objective','intel','down','distinction'].includes(e.kind)).slice(-6).reverse();
  for(const e of highlights){
   const person=c.operators.find(o=>o.id===e.operatorId);
   chronicle.append(node('p','campaign-note',
    'DAY '+e.day+' · '+(person?.callsign??e.operatorId)+' — '+e.detail));
  }
  const retirees=c.operators.filter(o=>o.status==='retired'||o.status==='lost');
  if(retirees.length){
   chronicle.append(node('h2','','SERVICE ARCHIVE'));
   for(const o of retirees)chronicle.append(node('p','campaign-report',
    o.callsign+' · '+o.missions+' DEPLOYMENTS · '+o.successful+' SUCCESSES · '+o.status.toUpperCase()));
  }
  grid.append(chronicle);
  const footer=node('div','campaign-footer');
  footer.append(button('EXPORT CAMPAIGN SAVE',this.handlers.exportSave));
  footer.append(node('p','campaign-note','IMPORT CAMPAIGN SAVE'));
  footer.append(this.importPicker());
  footer.append(button('QUICK PLAY (NO CAMPAIGN PROGRESS)',this.handlers.quickPlay));
  const overview=node('section','campaign-section campaign-overview');
  overview.append(node('h2','','UNIT OVERVIEW'));
  const stats=node('div','campaign-overview-stats');
  const available=c.operators.filter(o=>o.status==='available'||o.status==='reserve').length;
  for(const [value,label] of [
   [String(available),'AVAILABLE'],[String(c.squadIds.length),'ASSIGNED'],
   [String(c.contracts.filter(k=>k.status==='available'&&k.deadline>=c.day).length),'CONTRACTS']
  ]){
   const stat=node('div','campaign-stat');
   stat.append(node('strong','',value),node('span','',label));stats.append(stat);
  }
  overview.append(stats);
  overview.append(node('p','campaign-note',
   'SUPPLIES · '+c.supplies.ammo+' ROUNDS · '+c.supplies.medical+
   ' MEDICAL KITS · '+c.supplies.flash+' FLASHBANGS'));
  const readiness=node('div','campaign-readiness');
  readiness.append(node('h2','','DEPLOYMENT READINESS'));
  const assigned=c.operators.filter(o=>c.squadIds.includes(o.id));
  const recovering=assigned.filter(o=>o.recoveryDays>0);
  const rosterStatus=node('p','campaign-readiness-label',
   assigned.map(o=>o.callsign).join(' · ')||'NO OPERATORS ASSIGNED');
  readiness.append(rosterStatus);
  const checks=[
   {attention:assigned.length<4,label:assigned.length+' / 4 SQUAD SLOTS FILLED',
    action:'personnel' as const},
   {attention:recovering.length>0,
    label:recovering.length+' ASSIGNED OPERATOR'+(recovering.length===1?'':'S')+
     ' RECOVERING',action:'personnel' as const},
   {attention:c.supplies.ammo<60,
    label:'LOW AMMUNITION RESERVE · '+c.supplies.ammo+' ROUNDS IN STOCK',
    action:'logistics' as const},
   {attention:c.supplies.medical===0,
    label:'NO SPARE MEDICAL KITS IN STOCK',action:'logistics' as const}
  ];
  for(const check of checks){
   if(!check.attention)continue;
   const item=button(check.label,()=>{
    this.homeTab=check.action;this.root.scrollTop=0;this.home(c);
   },'campaign-readiness-warning');
   readiness.append(item);
  }
  if(!checks.some(check=>check.attention)){
   readiness.append(node('p','campaign-readiness-ok',
    'SQUAD ASSIGNED · BASE RESERVES AVAILABLE'));
  }
  overview.append(readiness);
  if(accepted)overview.append(button('CONTINUE · '+accepted.title.toUpperCase(),
   this.handlers.resumeContract,'campaign-primary'));
  const shortcuts=node('div','campaign-overview-actions');
  for(const [tab,label] of [
   ['contracts','VIEW CONTRACTS'],['personnel','MANAGE PERSONNEL'],
   ['logistics','SUPPLIES & ARMORY']
  ] as const){
   shortcuts.append(button(label,()=>{
    this.homeTab=tab;this.root.scrollTop=0;this.home(c);
   }));
  }
  overview.append(shortcuts,footer);
  grid.append(overview,logistics);
  const sections={
   overview,personnel,contracts:jobs,logistics,chronicle
  } as const;
  const nav=node('nav','campaign-tabs');
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Operations Room sections');
  for(const [tab,label] of [
   ['overview','Overview'],['personnel','Personnel'],
   ['contracts','Contracts'],['logistics','Logistics'],
   ['chronicle','Chronicle']
  ] as const){
   const panel=sections[tab];
   panel.id='campaign-panel-'+tab;panel.setAttribute('role','tabpanel');
   panel.hidden=this.homeTab!==tab;
   const trigger=button(label,()=>{
    this.homeTab=tab;this.root.scrollTop=0;this.home(c);
   },'campaign-tab');
   trigger.id='campaign-tab-'+tab;
   trigger.setAttribute('role','tab');
   trigger.setAttribute('aria-selected',String(this.homeTab===tab));
   trigger.setAttribute('aria-controls',panel.id);
   // Each tab remains keyboard-reachable; arrow-key navigation is optional.
   trigger.tabIndex=0;
   panel.setAttribute('aria-labelledby',trigger.id);
   nav.append(trigger);
  }
  main.insertBefore(nav,grid);
  this.root.append(main);
 }
 private armory(c:CampaignState,id:string){
  const sameOperator=this.lastArmoryRenderedId===id;
  const restoreScroll=sameOperator?this.root.scrollTop:0;
  const previousFocus=this.root.contains(document.activeElement)?
    document.activeElement?.getAttribute('aria-label'):null;
  this.disposePreview();
  if(!sameOperator){
   this.wardrobeExpanded=false;
   this.headwearExpanded=false;this.headwearCamoExpanded=false;
   this.fabricPickerState={expanded:false,openChannel:null,filter:''};
  }
  this.lastArmoryRenderedId=id;
  const person=c.operators.find(o=>o.id===id);
  if(!person){this.armoryOperatorId=null;this.home(c);return;}
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell campaign-wide');
  const top=node('div','campaign-head');
  const identity=node('div');
  identity.append(node('div','campaign-eyebrow','PERSONNEL / FIELD ARMORY'),
   node('h1','',person.callsign+' / EQUIPMENT'));
  top.append(identity,node('div','campaign-funds',
   totalEquipmentMass(person.loadout,person.weaponConfiguration).toFixed(2)+' KG · ASSIGNED KIT'));
  main.append(top);
  main.append(button('← BACK TO OPERATIONS',()=>{
   this.armoryOperatorId=null;this.home(c);
  }));
  const nav=node('div','campaign-kit-nav');
  for(const member of c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired')){
   const choose=button(member.callsign,()=>{
    this.armoryOperatorId=member.id;this.home(c);
   },member.id===id?'campaign-primary':'');
   choose.setAttribute('aria-pressed',String(member.id===id));
   nav.append(choose);
  }
  main.append(nav);
  const grid=node('div','campaign-kit-grid');
  const summary=node('section','campaign-section campaign-kit-summary');
  summary.append(node('h2','','OPERATOR'));
  const preview=node('div','campaign-kit-preview');
  const viewToggle=button(this.weaponView?'SHOW FULL OPERATOR':'INSPECT WEAPON / MOUNTS',()=>{
   this.weaponView=!this.weaponView;this.armory(c,id);
  });
  summary.append(preview,viewToggle,node('p','campaign-note',
   this.weaponView?'DRAG TO ROTATE · TAP A MOUNT TO SELECT ITS SLOT':'DRAG THE SOLDIER TO ROTATE'));
  summary.append(node('strong','campaign-kit-name',person.callsign));
  const identityActions=node('div','campaign-kit-actions');
  const rename=button('EDIT CALLSIGN',async()=>{
   const name=await promptFieldworkText({
    title:'Edit operator callsign',label:'CALLSIGN',value:person.callsign,
    maxLength:24,confirmLabel:'SAVE CALLSIGN'
   });
   if(name!==null&&name!==person.callsign)this.handlers.renameOperator(id,name);
  });
  const appearance=button('EDIT APPEARANCE',()=>{
   wardrobePanel.open=true;
   wardrobePanel.scrollIntoView({block:'start',behavior:'smooth'});
  });
  rename.disabled=!!c.activeContractId;appearance.disabled=!!c.activeContractId;
  identityActions.append(rename,appearance);summary.append(identityActions);
  const carrying=carryCapacityReport(person.loadout,person.magazines);
  const carryItems=carrying.placements.filter(p=>p.kind!=='magazine');
  if(carryItems.length)summary.append(node('p','campaign-note',
   'PHYSICAL CARRY · '+carryItems.map(p=>p.kind.toUpperCase()+' '+
    p.location.toUpperCase()+' / '+p.accessSeconds.toFixed(2)+'s ACCESS').join(' · ')));
  summary.append(node('p','campaign-note',
   person.background+' · '+person.trait+' · '+person.missions+' OPERATIONS'));
  summary.append(node('p','campaign-kit-metrics','MOBILITY · '+
   loadMobilityDescription(person.loadout,person.weaponConfiguration)+' · '+
   Math.round(loadMovementScale(person.loadout,person.weaponConfiguration)*100)+'% MOVEMENT SPEED'));
  summary.append(node('div','campaign-kit-metrics',
   'PRIMARY · '+person.weapon.toUpperCase()+
   '    /    MAGAZINE · '+person.magazine+
   '    /    RESERVE · '+person.reserve));
  const firearm=c.inventory.serializedWeapons?.find(w=>w.id===person.weaponSerialId);
  if(firearm){
   const serviceCost=weaponServiceCost(firearm);
   const service=button('SERVICE WEAPON · '+serviceCost+' CR',
    ()=>this.handlers.serviceWeapon(person.id));
   service.disabled=!!c.activeContractId||serviceCost===0||c.funds<serviceCost;
   summary.append(service);
   summary.append(node('p','campaign-kit-metrics',
    'SERIAL · '+firearm.id+' · CONDITION '+firearm.condition+'% · '+
    firearm.roundsFired+' ROUNDS FIRED'));
   const recent=firearm.history.slice(-3).map(e=>
    'DAY '+e.day+' '+e.kind.toUpperCase()+
    (e.rounds?' · '+e.rounds+' RDS':'')).join(' / ');
   summary.append(node('p','campaign-note',
    'WEAPON SERVICE LOG · '+(recent||'NO RECORDED EVENTS')));
  }
  const placed=person.weapon==='shotgun'?[]:
   stageMagazines(person.magazines,person.loadout);
  const magSlots=person.weapon==='shotgun'?null:
   magazinePlacementSummary(person.magazines,person.loadout);
  if(magSlots)summary.append(node('p','campaign-kit-metrics',
   'MAGAZINES · CHEST '+magSlots.rig+' · BELT '+magSlots.belt+
   ' · POCKET '+magSlots.pocket+' · PACK '+magSlots.backpack+
   ' · STOWED '+magSlots.overflow));
  summary.append(node('p','campaign-note',
   'Spare magazines can be individually placed below. Chest and belt magazines reload faster; backpack and overflow retrievals take longer.'));
  const maximum=initialArmorIntegrity(person.loadout);
  const repairCost=armorRepairCost(person);
  summary.append(node('p','campaign-kit-metrics',
   'ARMOR · '+person.armorCondition.torso+'/'+maximum.torso+
   '     HELMET · '+person.armorCondition.head+'/'+maximum.head));
  const repair=button('REPAIR PROTECTION · '+repairCost+' CR',
   ()=>this.handlers.repairArmor(person.id));
  repair.disabled=!!c.activeContractId||repairCost===0||c.funds<repairCost;
  summary.append(repair);
  const capacity=kitMedicalSupplies(person.loadout);
  summary.append(node('p','campaign-kit-metrics',
   'FIELD MEDICAL · '+medicalSupplyCount(person.medicalSupplies)+' / '+
    medicalSupplyCount(capacity)+' · HQ RESERVE '+c.supplies.medical));
  summary.append(node('p','campaign-kit-metrics',
   'WEAPON CONFIG · '+Object.values(person.weaponConfiguration.slots)
    .map(v=>v.replace(/^[^-]+-/,'')).join(' / ')));
  summary.append(node('p','campaign-note',
   'Equipment is issued as a saved preparation kit. Carried weight now influences movement speed. Coarse armor coverage and durability are now simulated; detailed ballistic hitboxes, retrieval times, tools and attachment handling are still in development.'));
  summary.append(node('p','campaign-note',
   'The preview uses the same 3D operator rig as the mission. Some equipment slots are metadata-only until their gameplay systems are implemented.'));
  grid.append(summary);
  const editor=node('section','campaign-section campaign-kit-editor');
  const locked=!!c.activeContractId;
  const presetTitle=node('h2','','SAVED KIT PRESETS');
  editor.append(presetTitle);
  const presetActions=node('div','campaign-kit-actions');
  const save=button('SAVE CURRENT KIT',async()=>{
   const name=await promptFieldworkText({
    title:'Save equipment preset',label:'PRESET NAME',
    value:person.callsign+' / FIELD',maxLength:32,
    confirmLabel:'SAVE PRESET'
   });
   if(name!==null)this.handlers.saveKitPreset(id,name);
  });
  save.disabled=locked||c.kitPresets.length>=24;
  presetActions.append(save);
  const picker=node('select','campaign-select');
  picker.setAttribute('aria-label','Choose saved equipment preset');
  const blank=node('option','','SELECT PRESET');blank.value='';picker.append(blank);
  for(const preset of c.kitPresets){
   const option=node('option','',preset.name+' · '+preset.weapon.toUpperCase());
   option.value=preset.id;picker.append(option);
  }
  const load=button('APPLY PRESET',()=>{
   if(picker.value){
    const preset=c.kitPresets.find(p=>p.id===picker.value);
    if(preset&&preset.weapon!==person.weapon&&c.inventory.weapons[preset.weapon]<1){
     void showFieldworkNotice('Equipment unavailable',
      'This preset requires a primary weapon not currently available in the armory.');
     return;
    }
    this.handlers.applyKitPreset(id,picker.value);
   }
  });
  const remove=button('DELETE PRESET',async()=>{
   if(!picker.value)return;
   const selectedPreset=picker.value;
   if(await confirmFieldworkAction({
    title:'Delete saved kit preset?',
    message:'This deletes the preset, not the equipment you own.',
    confirmLabel:'DELETE PRESET',danger:true
   }))this.handlers.deleteKitPreset(selectedPreset);
  });
  load.disabled=locked||c.kitPresets.length===0;
  remove.disabled=locked||c.kitPresets.length===0;
  presetActions.append(picker,load,remove);
  editor.append(presetActions,node('p','campaign-note',
   'Presets save a configuration, not copies of purchased equipment. Applying one requires an available primary weapon.'));
  editor.append(node('h2','','EQUIPMENT SLOTS'));
  if(locked)editor.append(node('p','campaign-note','ACTIVE DEPLOYMENT · KIT CHANGES LOCKED'));
  for(const slot of LOADOUT_SLOTS){
   const row=node('label','campaign-kit-row');
   const title=node('span','',slot.replace(/-/g,' ').toUpperCase());
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Select '+slot+' for '+person.callsign);
   if(slot==='primary'){
    for(const weapon of ['carbine','smg','rifle','shotgun'] as const){
     const item=itemDefinition('primary-'+weapon);
     const option=node('option','',(item?.name??weapon.toUpperCase())+
      (weapon===person.weapon?' · EQUIPPED':
      ' · '+c.inventory.weapons[weapon]+' AVAILABLE'));
     option.value='primary-'+weapon;
     option.disabled=weapon!==person.weapon&&c.inventory.weapons[weapon]<1;
     select.append(option);
    }
    select.value='primary-'+person.weapon;
    select.addEventListener('change',()=>{
     this.handlers.equipWeapon(id,select.value.slice('primary-'.length) as
      'carbine'|'smg'|'rifle'|'shotgun');
    });
   }else{
    for(const item of itemsForSlot(slot)){
     const option=node('option','',item.name+' · '+item.massKg.toFixed(2)+' KG');
     option.value=item.id;select.append(option);
    }
    select.value=person.loadout.slots[slot];
    select.addEventListener('change',()=>this.handlers.equipGear(
     id,slot,select.value));
   }
   select.disabled=locked;
   row.append(title,select);
   const selected=itemDefinition(person.loadout.slots[slot]);
   const info=node('small','campaign-kit-description',selected?.description??'');
   const wrap=node('div','campaign-kit-choice');
   wrap.append(row,info);
   editor.append(wrap);
  }
  // Wardrobe uses a separate cosmetic record and never edits purchased
  // equipment. Incompatible helmet/carrier styles are disabled, not silently
  // granted as gameplay items.
  const wardrobePanel=node('details','campaign-wardrobe');
  wardrobePanel.open=this.wardrobeExpanded;
  wardrobePanel.addEventListener('toggle',()=>{
   if(wardrobePanel.isConnected)this.wardrobeExpanded=wardrobePanel.open;
  });
  wardrobePanel.append(node('summary','','WARDROBE / APPEARANCE'));
  wardrobePanel.append(node('p','campaign-note',
   'Personal styling only. Armor protection, weight and carry capacity remain controlled by EQUIPMENT SLOTS.'));
  const wardrobe=readWardrobe(person.wardrobe);
  const looks=resolvedWardrobe(wardrobe,person.loadout);
  for(const slot of WARDROBE_SLOTS){
   const row=node('label','campaign-kit-row');
   row.append(node('span','',slot.replace(/([A-Z])/g,' $1').toUpperCase()));
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Wardrobe '+slot+' for '+person.callsign);
   for(const item of wardrobeItemsForSlot(slot)){
    const option=node('option','',item.name);option.value=item.id;
    const candidate=setWardrobeStyle(wardrobe,slot,item.id);
    option.disabled=resolvedWardrobe(candidate,person.loadout)[slot]!==item.id;
    select.append(option);
   }
   select.value=looks[slot];select.disabled=locked;
   select.addEventListener('change',()=>this.handlers.setWardrobe(
    id,setWardrobeStyle(wardrobe,slot as WardrobeSlot,select.value)));
   row.append(select);wardrobePanel.append(row);
  }
  wardrobePanel.append(createHeadwearAppearancePicker(person.loadout,wardrobe,
    next=>this.handlers.setWardrobe(id,next),{
     disabled:locked,expanded:this.headwearExpanded,
     camoExpanded:this.headwearCamoExpanded,
     onExpandedChange:open=>{this.headwearExpanded=open;},
     onCamoExpandedChange:open=>{this.headwearCamoExpanded=open;}
    }));
   wardrobePanel.append(createWardrobeFabricCamoPicker(person.loadout,wardrobe,
    next=>this.handlers.setWardrobe(id,next),this.fabricPickerState,locked));
  const cosmeticExtras=node('details','campaign-wardrobe-extras');
  cosmeticExtras.append(node('summary','','COSMETIC EMPTY POUCHES / ACCESSORIES'));
  cosmeticExtras.append(node('p','campaign-note',
   'Appearance-only empty holders and fabric details. No additional mission equipment.'));
  for(const slot of WARDROBE_ACCESSORY_SLOTS){
   const row=node('label','campaign-kit-row');
   row.append(node('span','',slot.replace(/([A-Z])/g,' $1').toUpperCase()));
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Wardrobe accessory '+slot);
   for(const name of WARDROBE_ACCESSORY_OPTIONS[slot]){
    const option=node('option','',name.replace(/-/g,' ').toUpperCase());
    option.value=name;select.append(option);
   }
   select.value=wardrobe.accessories[slot];select.disabled=locked;
   select.addEventListener('change',()=>this.handlers.setWardrobe(id,{
    ...wardrobe,accessories:{...wardrobe.accessories,[slot]:select.value}
   }));
   row.append(select);cosmeticExtras.append(row);
  }
  wardrobePanel.append(cosmeticExtras);
  const colors=topColorwayChoices(looks.top);
  if(colors.length){
   const row=node('label','campaign-kit-row');
   row.append(node('span','','GARMENT MATERIAL'));
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Garment material for '+person.callsign);
   for(const [value,name] of colors){
    const option=node('option','',name);option.value=value;select.append(option);
   }
   select.value=resolvedTopColorway(looks.top,wardrobe.topColorway);
   select.disabled=locked;
   select.addEventListener('change',()=>this.handlers.setWardrobe(id,{
    ...wardrobe,topColorway:select.value}));
   row.append(select);wardrobePanel.append(row);
  }
  for(const [field,label,options] of [
   ['sleeveState','SLEEVE FINISH',SLEEVE_STATES],
   ['trouserHem','TROUSER HEM',TROUSER_HEMS]
  ] as const){
   const row=node('label','campaign-kit-row');
   row.append(node('span','',label));
   const select=node('select','campaign-select');
   select.setAttribute('aria-label',label+' for '+person.callsign);
   for(const optionId of options){
    const option=node('option','',optionId.toUpperCase());
    option.value=optionId;select.append(option);
   }
   select.value=wardrobe[field];
   select.disabled=locked||(field==='sleeveState'?
    sleeveStateOptions(looks.top).length===1:
    !['bdu-trousers','acu-trousers'].includes(looks.trousers)||
    looks.footwear==='bare-feet');
   select.addEventListener('change',()=>{
    if(field==='sleeveState')
     this.handlers.setWardrobe(id,{...wardrobe,
      sleeveState:select.value as WardrobeOptions['sleeveState']});
    else this.handlers.setWardrobe(id,{...wardrobe,
      trouserHem:select.value as WardrobeOptions['trouserHem']});
   });
   row.append(select);wardrobePanel.append(row);
  }
  editor.append(wardrobePanel);
  const mountSelectors=new Map<WeaponAttachmentSlot,HTMLSelectElement>();
  editor.append(node('h2','','WEAPON ATTACHMENTS'));
  editor.append(node('p','campaign-note',
   'Factory parts are included. Additional modules are finite workshop stock; purchase and install before deployment. The preview uses your assembled firearm.'));
  for(const slot of WEAPON_ATTACHMENT_SLOTS){
   const row=node('label','campaign-kit-row');
   const title=node('span','',slot.toUpperCase());
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Select '+slot+' for '+person.callsign);
   const current=person.weaponConfiguration.slots[slot];
   for(const part of Object.values(WEAPON_ATTACHMENTS)){
    if(part.slot!==slot||!part.compatible.includes(person.weapon))continue;
    const price=attachmentPrice(part.id),stock=c.inventory.attachments[part.id]??0;
    const suffix=price===0?' · INCLUDED':
     part.id===current?' · EQUIPPED':
     stock>0?' · STOCK '+stock:' · BUY '+price+' CR';
    const option=node('option','',part.name+suffix);
    option.value=part.id;select.append(option);
   }
   select.value=current;select.disabled=locked;
   mountSelectors.set(slot,select);
   select.addEventListener('focus',()=>{this.selectedMount=slot;
    this.workbench?.setActiveSlot(slot);});
   select.addEventListener('change',async()=>{
    const partId=select.value,price=attachmentPrice(partId);
    const stock=c.inventory.attachments[partId]??0;
    const acquire=price>0&&stock<1;
    if(acquire&&c.funds<price){
     void showFieldworkNotice('Insufficient funds',
      'You do not have enough credits for this attachment.');
     select.value=current;return;
    }
    if(acquire&&!await confirmFieldworkAction({
     title:'Purchase and install attachment?',
     message:(WEAPON_ATTACHMENTS[partId]?.name??partId)+
      ' costs '+price+' credits. Confirm this armory purchase.',
     confirmLabel:'BUY & INSTALL'
    })){
     select.value=current;return;
    }
    this.handlers.equipAttachment(id,slot,partId,acquire);
   });
   row.append(title,select);editor.append(row);
  }
  const gun=resolveWeaponAssembly(person.weaponConfiguration);
  editor.append(node('p','campaign-kit-metrics',
   'WEAPON MASS · '+gun.massKg.toFixed(2)+' KG · BALANCE '+gun.balanceX.toFixed(1)+
   ' · MUZZLE EXTENSION '+(gun.muzzleX-19.5).toFixed(1)));
  if(placed.length){
   editor.append(node('h2','','PHYSICAL MAGAZINE PLACEMENT'));
   editor.append(node('p','campaign-note',
    'Each magazine is a real saved item. Change its location; the system will enforce available pouch capacity.'));
   const capacity=magazineSpace(person.loadout);
   const locations:MagazineLocation[]=['rig','belt','pocket','backpack','overflow'];
   for(const [i,mag] of placed.entries()){
    const row=node('label','campaign-kit-row campaign-kit-choice');
    row.append(node('span','', 'MAG '+String(i+1).padStart(2,'0')+
     ' · '+mag.rounds+' RDS'));
    const picker=node('select','campaign-select');
    picker.setAttribute('aria-label','Carry magazine '+(i+1)+' for '+person.callsign);
    for(const loc of locations){
     const count=placed.filter(m=>m.location===loc).length;
     const available=loc==='overflow'||loc===mag.location||count<capacity[loc];
     const opt=node('option','',loc.toUpperCase());
     opt.value=loc;opt.disabled=!available;picker.append(opt);
    }
    picker.value=mag.location;
    picker.disabled=locked;
    picker.addEventListener('change',()=>this.handlers.moveMagazine(
     id,mag.id,picker.value as MagazineLocation));
    row.append(picker);editor.append(row);
   }
  }
  grid.append(editor);main.append(grid);
  this.root.append(main);
  if(this.weaponView){
   this.workbench=new WeaponWorkbenchPreview(preview,person.weaponConfiguration,slot=>{
    this.selectedMount=slot;
    const select=mountSelectors.get(slot);
    if(!select)return;
    select.focus({preventScroll:true});
    select.scrollIntoView({block:'nearest',behavior:'smooth'});
    try{select.showPicker();}catch{/* mobile browser may require a second tap */}
   });
   this.workbench.setActiveSlot(this.selectedMount);
  }else{
   this.preview=new CampaignKitPreview(preview,person.id,person.weapon,
    person.appearanceSeed,person.loadout,person.weaponConfiguration,
    person.magazines,person.wardrobe);
   const azimuth=this.operatorViewAngles.get(id);
   if(azimuth!==undefined)this.preview.setAzimuth(azimuth);
  }
  this.root.scrollTop=restoreScroll;
  if(previousFocus){
   const restored=Array.from(this.root.querySelectorAll<HTMLElement>('[aria-label]'))
    .find(el=>el.getAttribute('aria-label')===previousFocus);
   restored?.focus({preventScroll:true});
  }
 }
 private importPicker(){
  const input=node('input','campaign-import');
  input.type='file';input.accept='.json,application/json';
  input.setAttribute('aria-label','Import campaign JSON save');
  input.addEventListener('change',()=>{
   const file=input.files?.[0];
   if(!file)return;
   void file.text().then(raw=>this.handlers.importSave(raw))
    .catch(()=>{void showFieldworkNotice('Import failed',
     'Could not read the selected campaign save file.');});
  });
  return input;
 }
 private contract(c:Contract,campaign:CampaignState){
  const card=node('article','campaign-contract');
  card.append(node('strong','',c.title));
  card.append(node('div','campaign-muted',c.region+' · '+['','LOW','MODERATE','HIGH'][c.risk]+' RISK'));
  if(c.followUpOf)card.append(node('div','campaign-note','FOLLOW-UP OPERATION'));
  card.append(node('p','',c.description));
  const row=node('div','campaign-contract-row');
  row.append(node('span','',c.reward+' CR · DEADLINE DAY '+c.deadline));
  row.append(button('REVIEW DEPLOYMENT',()=>this.reviewContract(c,campaign),'campaign-primary'));
  card.append(row);return card;
 }
 /** Review only information the contract already reveals. Acceptance is a separate action. */
 private reviewContract(contract:Contract,campaign:CampaignState){
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overlay=node('div','campaign-preflight-backdrop');
  const panel=node('section','campaign-preflight fw-sheet');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  const heading=node('h2','',contract.title);
  heading.id='campaign-preflight-title';
  panel.setAttribute('aria-labelledby',heading.id);
  panel.append(node('div','campaign-eyebrow','CONTRACT / PREDEPLOYMENT REVIEW'),heading);
  const info=node('div','campaign-preflight-fields');
  const add=(label:string,value:string)=>{
   const section=node('div','campaign-preflight-field');
   section.append(node('span','',label),node('p','',value));
   info.append(section);
  };
  add('OBJECTIVE',contract.description);
  add('ASSIGNMENT',contract.kind.replace(/-/g,' ').toUpperCase());
  add('LOCATION',contract.region);
  add('RISK',['','LOW','MODERATE','HIGH'][contract.risk]);
  add('REWARD / DEADLINE',contract.reward+' CR · DAY '+contract.deadline);
  add('INTELLIGENCE',{
   unknown:'Site layout and threats are unknown until discovered',
   scouted:'Exterior intelligence available; interior remains uncertain',
   'floor-plan':'Floor plan known; hostile positions remain unknown'
  }[contract.intel]);
  panel.append(info);
  const roster=node('div','campaign-preflight-roster');
  roster.append(node('h3','','ASSIGNED OPERATORS'));
  const assigned=campaign.squadIds.map(id=>campaign.operators.find(o=>o.id===id))
   .filter((o):o is NonNullable<typeof o>=>!!o);
  for(const member of assigned){
   const person=node('div','campaign-preflight-member');
   person.append(node('strong','',member.callsign),node('span','',
    member.weapon.toUpperCase()+' · '+(member.recoveryDays>0?
     'RECOVERING '+member.recoveryDays+' DAYS':'READY')));
   roster.append(person);
  }
  if(!assigned.length)roster.append(node('p','campaign-note','NO SQUAD ASSIGNED'));
  panel.append(roster);
  const cautions:string[]=[];
  if(assigned.length<4)cautions.push('Only '+assigned.length+' of 4 squad slots filled');
  if(assigned.some(p=>p.recoveryDays>0))cautions.push('Assigned operator still recovering');
  if(campaign.supplies.ammo<60)cautions.push('Low ammunition stock for future resupply');
  if(campaign.supplies.medical===0)cautions.push('No spare medical kits in stock');
  if(cautions.length){
   const warnings=node('div','campaign-preflight-warning');
   warnings.append(node('strong','','READINESS ADVISORIES'));
   for(const warning of cautions)warnings.append(node('p','',warning));
   panel.append(warnings);
  }
  const actions=node('div','campaign-preflight-actions');
  const cancel=button('RETURN TO CONTRACTS',()=>dismiss());
  const deploy=button('ACCEPT & DEPLOY',()=>{
   dismiss();
   this.handlers.chooseContract(contract.id);
  },'campaign-primary');
  const dismiss=()=>{
   overlay.remove();
   prior?.focus({preventScroll:true});
  };
  overlay.addEventListener('click',e=>{
   if(e.target===overlay)dismiss();
  });
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();dismiss();}
   else if(e.key==='Tab'){
    const active=document.activeElement;
    if(active===cancel&&e.shiftKey){e.preventDefault();deploy.focus();}
    else if(active===deploy&&!e.shiftKey){e.preventDefault();cancel.focus();}
   }
  });
  actions.append(cancel,deploy);
  panel.append(actions);
  overlay.append(panel);
  document.body.append(overlay);
  cancel.focus({preventScroll:true});
 }
}
