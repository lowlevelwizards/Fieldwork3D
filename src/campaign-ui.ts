/** Campaign screens. Render only on navigation and state changes, never per frame. */
import type {CampaignState,Contract} from './campaign-state.ts';
import {SKILL_NAMES,WEAPON_PRICES,armorRepairCost} from './campaign-state.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {sharedService} from './campaign-history.ts';
import {LOADOUT_SLOTS,itemsForSlot,itemDefinition} from './equipment-catalog.ts';
import {totalEquipmentMass,loadMobilityDescription,loadMovementScale,
 type LoadoutSlot} from './equipment-loadouts.ts';
import {CampaignKitPreview} from './equipment-preview.ts';
import {WeaponWorkbenchPreview} from './equipment-weapon-workbench.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 type WeaponAttachmentSlot} from './equipment-weapon-assemblies.ts';
import {attachmentPrice} from './equipment-weapon-inventory.ts';
import {stageMagazines,magazinePlacementSummary,magazineSpace,
 type MagazineLocation} from './equipment-magazine-placement.ts';
import './campaign-style.css';

export type CampaignHandlers={
 newCampaign:()=>void;continueCampaign:()=>void;quickPlay:()=>void;
 chooseContract:(id:string)=>void;resumeContract:()=>void;
 buyAmmo:()=>void;buyMedical:()=>void;buyFlash:()=>void;
 resupply:(id:string)=>void;treat:(id:string)=>void;
 recruit:()=>void;assignSlot:(slot:number,id:string)=>void;
 buyWeapon:(weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipWeapon:(id:string,weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipGear:(id:string,slot:LoadoutSlot,itemId:string)=>void;
 equipAttachment:(id:string,slot:WeaponAttachmentSlot,partId:string,acquire:boolean)=>void;
 moveMagazine:(id:string,magazineId:string,location:MagazineLocation)=>void;
 repairArmor:(id:string)=>void;
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
 private preview:CampaignKitPreview|null=null;
 private workbench:WeaponWorkbenchPreview|null=null;
 private weaponView=false;
 private selectedMount:WeaponAttachmentSlot='optic';
 private disposePreview(){this.preview?.dispose();this.preview=null;
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
  if(hasSave)main.append(button('CONTINUE CAMPAIGN',this.handlers.continueCampaign,'campaign-primary'));
  main.append(button('NEW CAMPAIGN',this.handlers.newCampaign,'campaign-primary'));
  main.append(button('QUICK PLAY — TACTICAL SANDBOX',this.handlers.quickPlay));
  main.append(node('p','campaign-note','Quick Play remains separate from your persistent campaign.'));
  main.append(node('p','campaign-note','IMPORT EXISTING CAMPAIGN SAVE'));
  main.append(this.importPicker());
  this.root.append(main);
 }
 home(c:CampaignState){
  if(this.armoryOperatorId){
   const target=c.operators.find(x=>x.id===this.armoryOperatorId&&x.status!=='lost'&&x.status!=='retired');
   if(target){this.armory(c,target.id);return;}
   this.armoryOperatorId=null;
  }
  this.disposePreview();
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
   if(p.recoveryDays>0)actions.append(button('TREAT',()=>this.handlers.treat(p.id)));
   if(!c.squadIds.includes(p.id)&&
    c.operators.filter(o=>o.status==='available'||o.status==='reserve').length>4)
    actions.append(button('RETIRE',()=>this.handlers.retire(p.id)));
   card.append(actions);
   roster.append(card);
  }
  personnel.append(roster);
  const purchases=node('div','campaign-purchases');
  purchases.append(button('BUY 60 ROUNDS · 120 CR',this.handlers.buyAmmo),
   button('BUY MEDICAL KIT · 170 CR',this.handlers.buyMedical),
   button('BUY 2 FLASHBANGS · 150 CR',this.handlers.buyFlash));
  personnel.append(purchases);
  const inventory=node('div','campaign-armory');
  inventory.append(node('h2','','FIELD ARMORY'));
  for(const weapon of ['carbine','smg','rifle','shotgun'] as const){
   const stock=c.inventory.weapons[weapon],price=WEAPON_PRICES[weapon];
   const buy=button('BUY '+weapon.toUpperCase()+' · '+price+' CR · '+stock+' STOCK',
    ()=>this.handlers.buyWeapon(weapon));
   buy.disabled=c.funds<price||!!c.activeContractId;
   inventory.append(buy);
  }
  personnel.append(inventory);
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
    jobs.append(this.contract(contract));
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
  main.append(chronicle);
  const footer=node('div','campaign-footer');
  footer.append(button('EXPORT CAMPAIGN SAVE',this.handlers.exportSave));
  footer.append(node('p','campaign-note','IMPORT CAMPAIGN SAVE'));
  footer.append(this.importPicker());
  footer.append(button('QUICK PLAY (NO CAMPAIGN PROGRESS)',this.handlers.quickPlay));
  main.append(footer);this.root.append(main);
 }
 private armory(c:CampaignState,id:string){
  this.disposePreview();
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
  const rename=button('EDIT CALLSIGN',()=>{
   const name=window.prompt('Operator callsign (up to 24 characters)',person.callsign);
   if(name!==null)this.handlers.renameOperator(id,name);
  });
  const appearance=button('NEXT LOOK',()=>this.handlers.cycleAppearance(id));
  rename.disabled=!!c.activeContractId;appearance.disabled=!!c.activeContractId;
  identityActions.append(rename,appearance);summary.append(identityActions);
  summary.append(node('p','campaign-note',
   person.background+' · '+person.trait+' · '+person.missions+' OPERATIONS'));
  summary.append(node('p','campaign-kit-metrics','MOBILITY · '+
   loadMobilityDescription(person.loadout,person.weaponConfiguration)+' · '+
   Math.round(loadMovementScale(person.loadout,person.weaponConfiguration)*100)+'% MOVEMENT SPEED'));
  summary.append(node('div','campaign-kit-metrics',
   'PRIMARY · '+person.weapon.toUpperCase()+
   '    /    MAGAZINE · '+person.magazine+
   '    /    RESERVE · '+person.reserve));
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
  const save=button('SAVE CURRENT KIT',()=>{
   const name=window.prompt('Preset name (up to 32 characters)',person.callsign+' / FIELD');
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
     window.alert('This preset requires a primary weapon not currently available in the Armory.');return;
    }
    this.handlers.applyKitPreset(id,picker.value);
   }
  });
  const remove=button('DELETE PRESET',()=>{
   if(picker.value&&window.confirm('Delete selected kit preset?'))
    this.handlers.deleteKitPreset(picker.value);
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
   select.addEventListener('change',()=>{
    const partId=select.value,price=attachmentPrice(partId);
    const stock=c.inventory.attachments[partId]??0;
    const acquire=price>0&&stock<1;
    if(acquire&&c.funds<price){
     window.alert('Not enough credits for this attachment.');
     select.value=current;return;
    }
    if(acquire&&!window.confirm('Buy and install '+
     (WEAPON_ATTACHMENTS[partId]?.name??partId)+' for '+price+' credits?')){
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
  }else this.preview=new CampaignKitPreview(preview,person.id,person.weapon,
   person.appearanceSeed,person.loadout,person.weaponConfiguration);
 }
 private importPicker(){
  const input=node('input','campaign-import');
  input.type='file';input.accept='.json,application/json';
  input.setAttribute('aria-label','Import campaign JSON save');
  input.addEventListener('change',()=>{
   const file=input.files?.[0];
   if(!file)return;
   void file.text().then(raw=>this.handlers.importSave(raw))
    .catch(()=>window.alert('Could not read campaign save file.'));
  });
  return input;
 }
 private contract(c:Contract){
  const card=node('article','campaign-contract');
  card.append(node('strong','',c.title));
  card.append(node('div','campaign-muted',c.region+' · '+['','LOW','MODERATE','HIGH'][c.risk]+' RISK'));
  if(c.followUpOf)card.append(node('div','campaign-note','FOLLOW-UP OPERATION'));
  card.append(node('p','',c.description));
  const row=node('div','campaign-contract-row');
  row.append(node('span','',c.reward+' CR · DEADLINE DAY '+c.deadline));
  row.append(button('BRIEF / DEPLOY',()=>this.handlers.chooseContract(c.id),'campaign-primary'));
  card.append(row);return card;
 }
}
