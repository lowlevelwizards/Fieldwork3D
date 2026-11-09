/** Campaign screens. Render only on navigation and state changes, never per frame. */
import type {CampaignState,Contract} from './campaign-state.ts';
import {SKILL_NAMES,WEAPON_PRICES,armorRepairCost,weaponServiceCost} from './campaign-state.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {sharedService} from './campaign-history.ts';
import {LOADOUT_SLOTS,itemsForSlot,itemDefinition} from './equipment-catalog.ts';
import {totalEquipmentMass,loadMobilityDescription,loadMovementScale,
 type LoadoutSlot} from './equipment-loadouts.ts';
import {CampaignKitPreview} from './equipment-preview.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {carryCapacityReport} from './equipment-carry-placement.ts';
import {WeaponWorkbenchPreview,type WeaponWorkbenchViewState}
 from './equipment-weapon-workbench.ts';
import type {WorkbenchSocket} from './equipment-weapon-workbench-layout.ts';
import {WEAPON_ATTACHMENT_SLOTS,WEAPON_ATTACHMENTS,resolveWeaponAssembly,
 weaponAttachmentAllowed,type WeaponAttachmentSlot} from './equipment-weapon-assemblies.ts';
import {FAMILY_PART_SLOTS,FAMILY_PARTS,
 compatibleFamilyPart,matchingFamilyPreset,proposeFamilyPartChange,type FamilyPartSlot}
 from './equipment-weapon-families.ts';
import {attachmentPrice} from './equipment-weapon-inventory.ts';
import {stageMagazines,magazinePlacementSummary,magazineSpace,
 type MagazineLocation} from './equipment-magazine-placement.ts';
import {kitMedicalSupplies,medicalSupplyCount} from './equipment-medical-supplies.ts';
import {promptFieldworkText,confirmFieldworkAction,showFieldworkNotice}
 from './ui/fieldwork-controls.ts';
import {createWeaponPresetBrowser} from './ui/weapon-preset-browser.ts';
import './campaign-style.css';
import {buildQuickLoadoutGroups,loadoutGroupForSlot,
 type QuickLoadoutGroup} from './ui/quick-loadout-groups.ts';
export type CampaignHandlers={
 newCampaign:()=>void;continueCampaign:()=>void;quickPlay:()=>void;
 openReplayLibrary:()=>void;
 chooseContract:(id:string)=>void;resumeContract:()=>void;
 buyAmmo:()=>void;buyMedical:()=>void;buyFlash:()=>void;
 resupply:(id:string)=>void;resupplyMedical:(id:string)=>void;
 treat:(id:string)=>void;
 recruit:()=>void;assignSlot:(slot:number,id:string)=>void;
 buyWeapon:(weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipWeapon:(id:string,weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipGear:(id:string,slot:LoadoutSlot,itemId:string)=>void;
 setWardrobe:(id:string,look:WardrobeOptions)=>void;
 openStudio:(id:string)=>void;
 openArsenal:(id:string)=>void;
 equipAttachment:(id:string,slot:WeaponAttachmentSlot,partId:string,acquire:boolean)=>void;
 equipWeaponPreset:(id:string,presetId:string)=>void;
 equipWeaponFamilyPart:(id:string,slot:FamilyPartSlot,partId:string)=>void;
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
 /** Temporary UI preference only; no Campaign save mutation. */
 private readonly expandedClassicWeaponControls=new Set<string>();
 private selectedMount:WeaponAttachmentSlot='optic';
 private selectedWorkbenchSocket:WorkbenchSocket|null=null;
 private lastArmoryRenderedId:string|null=null;
 private activeKitGroup:QuickLoadoutGroup='weapon';
 private readonly operatorViewAngles=new Map<string,number>();
 /** Keep orbit/zoom only across small cosmetic swaps; refit a new core. */
 private readonly weaponWorkbenchViews=new Map<string,{
  core:string;view:WeaponWorkbenchViewState
 }>();
 private workbenchCore:string|null=null;
 private disposePreview(){
  if(this.preview&&this.lastArmoryRenderedId)
   this.operatorViewAngles.set(this.lastArmoryRenderedId,this.preview.getAzimuth());
  this.preview?.dispose();this.preview=null;
  if(this.workbench&&this.lastArmoryRenderedId&&this.workbenchCore){
   const view=this.workbench.getViewState();
   if(view)this.weaponWorkbenchViews.set(this.lastArmoryRenderedId,{
    core:this.workbenchCore,view
   });
  }
  this.workbench?.dispose();this.workbench=null;}
 constructor(handlers:CampaignHandlers){
  this.handlers=handlers;
  this.root.setAttribute('aria-label','Fieldwork campaign');
  this.root.hidden=true;
  document.body.append(this.root);
 }
 hide(){this.disposePreview();this.root.hidden=true;this.armoryOperatorId=null;}
 entry(hasSave:boolean){
  this.armoryOperatorId=null;this.disposePreview();
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell campaign-landing');
  const hero=node('header','campaign-landing-hero');
  const masthead=node('div','campaign-landing-masthead');
  masthead.append(node('span','','FW / VERDIGRIS'),
   node('span','','FIELD OPERATIONS · 001'));
  const plan=node('div','campaign-landing-plan');
  plan.setAttribute('aria-hidden','true');
  // Decorative architectural schematic, never actual mission intelligence.
  plan.innerHTML=[
   '<svg viewBox="0 0 540 340" xmlns="http://www.w3.org/2000/svg" fill="none">',
   '<defs><pattern id="fw-landing-grid" width="22" height="22" patternUnits="userSpaceOnUse">',
   '<path d="M22 0H0V22" stroke="#8aa69a" stroke-opacity=".15" stroke-width=".7"/></pattern></defs>',
   '<rect width="540" height="340" fill="url(#fw-landing-grid)"/>',
   '<g transform="translate(83 24) rotate(-7 196 145)">',
   '<path d="M58 28H384V265H58Z" fill="#879c87" fill-opacity=".09" stroke="#718b7c" stroke-width="7"/>',
   '<path d="M190 28V113M190 154V265M58 137H120M160 137H315M355 137H384M287 28V89M287 119V137M286 137V213M286 246V265" stroke="#8ba594" stroke-width="5"/>',
   '<path d="M58 80H126V137M190 210H286M286 81H384" stroke="#607d72" stroke-width="4"/>',
   '<path d="M58 176V214M58 231V265M348 265H376" stroke="#b3b998" stroke-width="7"/>',
   '<path d="M190 112A42 42 0 0 1 232 154M315 137A40 40 0 0 1 355 177" stroke="#b0bd9c" stroke-width="1.5" stroke-dasharray="3 5"/>',
   '<path d="M58 265L18 296M384 137L425 137" stroke="#d6bc79" stroke-width="2" stroke-dasharray="5 5"/>',
   '<path d="M10 296H65M425 117V156" stroke="#d6bc79" stroke-width="2"/>',
   '<path d="M86 254L134 206L206 175L315 173" stroke="#d9cb8d" stroke-width="2.5" stroke-dasharray="7 5"/>',
   '<path d="M134 206L155 164L173 207Z" fill="#d0c28b" fill-opacity=".12" stroke="#cdbd80"/>',
   '<circle cx="86" cy="254" r="10" fill="#d9cb8d"/><circle cx="86" cy="254" r="19" stroke="#d9cb8d"/>',
   '<circle cx="111" cy="279" r="7" fill="#9aaca1"/><circle cx="136" cy="291" r="7" fill="#9aaca1"/>',
   '<circle cx="315" cy="173" r="5" fill="#d9cb8d"/>',
   '<g fill="#9ab09e" font-size="10" font-family="monospace" letter-spacing="2">',
   '<text x="71" y="61">01</text><text x="220" y="61">02</text><text x="320" y="164">03</text>',
   '<text x="218" y="234">04</text><text x="393" y="252">N</text></g></g></svg>'
  ].join('');
  const heroCopy=node('div','campaign-landing-copy');
  heroCopy.append(node('span','campaign-landing-kicker','TACTICAL / PERSISTENT / HUMAN'),
   node('h1','','FIELDWORK'),
   node('div','campaign-landing-subtitle','FIELD OPERATIONS'),
   node('p','','One unit. Every deployment leaves a history.'));
  hero.append(masthead,plan,heroCopy);
  const divider=node('div','campaign-landing-divider');
  divider.append(node('span','','SELECT OPERATION'),node('span','','01 — 02'));
  const actions=node('nav','campaign-landing-actions');
  actions.setAttribute('aria-label','Start playing');
  const campaignAction=button('',hasSave?
   this.handlers.continueCampaign:this.handlers.newCampaign,
   'campaign-landing-card campaign-landing-primary');
  campaignAction.append(node('span','campaign-landing-card-index','01 / CAMPAIGN'),
   node('strong','',hasSave?'CONTINUE CAMPAIGN':'NEW CAMPAIGN'),
   node('span','campaign-landing-card-caption',
    'Persistent operators, equipment and consequences.'),
   node('span','campaign-landing-arrow','↗'));
  const quickAction=button('',this.handlers.quickPlay,
   'campaign-landing-card campaign-landing-quick');
  quickAction.append(node('span','campaign-landing-card-index','02 / TACTICAL SANDBOX'),
   node('strong','','QUICK PLAY'),
   node('span','campaign-landing-card-caption',
    'Fresh mission. No campaign consequences.'),
   node('span','campaign-landing-arrow','↗'));
  actions.append(campaignAction,quickAction);
  const utility=node('div','campaign-landing-utility');
  if(hasSave){
   const fresh=button('',this.handlers.newCampaign,'campaign-landing-link');
   fresh.append(node('strong','','NEW CAMPAIGN'),
    node('span','','Start another unit'));
   utility.append(fresh);
  }
  const library=button('',this.handlers.openReplayLibrary,'campaign-landing-link');
  library.append(node('strong','','REPLAY LIBRARY'),
   node('span','','Watch recorded operations'));
  const arsenal=node('a','campaign-landing-link');
  arsenal.href='./arsenal.html';
  arsenal.append(node('strong','','ARSENAL'),
   node('span','','Weapon workbench'));
  utility.append(library,arsenal);
  const footer=node('footer','campaign-landing-footer');
  const labs=node('details','campaign-landing-labs');
  labs.append(node('summary','','LABS / DEVELOPMENT WORKBENCHES'));
  const labLinks=node('div','campaign-landing-lab-links');
  for(const [name,href] of [
   ['OPERATOR LAB','./operator-lab.html'],
   ['MAP LAB','./map-lab.html'],
   ['ASSET LAB','./asset-lab.html'],
   ['BRIEFING LAB','./briefing-lab.html'],
   ['POSE WORKBENCH','./pose-workbench.html']
  ]){
   const link=node('a','',name);link.href=href;labLinks.append(link);
  }
  labs.append(labLinks);
  const saves=node('details','campaign-save-management campaign-landing-saves');
  saves.append(node('summary','','MANAGE SAVES / IMPORT'));
  saves.append(node('p','campaign-note',
   'Import an exported campaign save to continue on this device.'));
  saves.append(this.importPicker());
  footer.append(labs,saves);
  const footnote=node('div','campaign-landing-footnote');
  footnote.append(node('span','','VERDIGRIS / FIELDWORK'),
   node('span','','QUICK PLAY RESETS HEALTH & EQUIPMENT'));
  main.append(hero,divider,actions,utility,footer,footnote);
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
    opt.value=weapon;opt.disabled=(weapon!==p.weapon&&c.inventory.weapons[weapon]<1)||
     ((weapon==='smg'||weapon==='shotgun')&&weapon!==p.weapon);
    weaponPick.append(opt);
   }
   weaponPick.value=p.weapon;weaponPick.disabled=!!c.activeContractId;
   weaponPick.addEventListener('change',()=>this.handlers.equipWeapon(p.id,
    weaponPick.value as 'carbine'|'smg'|'rifle'|'shotgun'));
   actions.append(button('LOADOUT',()=>{
    this.armoryOperatorId=p.id;this.home(c);
   },'campaign-primary'));
   const look=button('APPEARANCE',()=>this.handlers.openStudio(p.id));
   look.disabled=!!c.activeContractId;
   look.setAttribute('aria-label','Edit '+p.callsign+' appearance in Operator Studio');
   actions.append(look,weaponPick);
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
  for(const weapon of ['carbine','rifle'] as const){
   const stock=c.inventory.weapons[weapon],price=WEAPON_PRICES[weapon];
   const buy=button('BUY AR / AK '+weapon.toUpperCase()+' PLATFORM · '+price+' CR · '+stock+' STOCK',
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
  if(!sameOperator){this.activeKitGroup='weapon';this.selectedWorkbenchSocket=null;}
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
  const viewToggle=button(this.weaponView?'SHOW FULL OPERATOR':'CLASSIC SOCKET PREVIEW',()=>{
   this.weaponView=!this.weaponView;this.armory(c,id);
  });
  summary.append(preview,node('p','campaign-note',
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
  const appearance=button('APPEARANCE · OPEN STUDIO',()=>this.handlers.openStudio(id));
  rename.disabled=!!c.activeContractId;appearance.disabled=!!c.activeContractId;
  const arsenal=button('OPEN ARSENAL',()=>this.handlers.openArsenal(id));
  arsenal.disabled=!!c.activeContractId||!person.weaponConfiguration.build;
  identityActions.append(rename,appearance,arsenal);summary.append(identityActions);
  const readiness=node('details','campaign-readiness-details');
  readiness.append(node('summary','','READINESS DETAILS · ARMOR / AMMO / MOBILITY'));
  const carrying=carryCapacityReport(person.loadout,person.magazines);
  const carryItems=carrying.placements.filter(p=>p.kind!=='magazine');
  if(carryItems.length)readiness.append(node('p','campaign-note',
   'PHYSICAL CARRY · '+carryItems.map(p=>p.kind.toUpperCase()+' '+
    p.location.toUpperCase()+' / '+p.accessSeconds.toFixed(2)+'s ACCESS').join(' · ')));
  readiness.append(node('p','campaign-note',
   person.background+' · '+person.trait+' · '+person.missions+' OPERATIONS'));
  readiness.append(node('p','campaign-kit-metrics','MOBILITY · '+
   loadMobilityDescription(person.loadout,person.weaponConfiguration)+' · '+
   Math.round(loadMovementScale(person.loadout,person.weaponConfiguration)*100)+'% MOVEMENT SPEED'));
  readiness.append(node('div','campaign-kit-metrics',
   'PRIMARY · '+person.weapon.toUpperCase()+
   '    /    MAGAZINE · '+person.magazine+
   '    /    RESERVE · '+person.reserve));
  const firearm=c.inventory.serializedWeapons?.find(w=>w.id===person.weaponSerialId);
  if(firearm){
   const serviceCost=weaponServiceCost(firearm);
   const service=button('SERVICE WEAPON · '+serviceCost+' CR',
    ()=>this.handlers.serviceWeapon(person.id));
   service.disabled=!!c.activeContractId||serviceCost===0||c.funds<serviceCost;
   readiness.append(service);
   readiness.append(node('p','campaign-kit-metrics',
    'SERIAL · '+firearm.id+' · CONDITION '+firearm.condition+'% · '+
    firearm.roundsFired+' ROUNDS FIRED'));
   const recent=firearm.history.slice(-3).map(e=>
    'DAY '+e.day+' '+e.kind.toUpperCase()+
    (e.rounds?' · '+e.rounds+' RDS':'')).join(' / ');
   readiness.append(node('p','campaign-note',
    'WEAPON SERVICE LOG · '+(recent||'NO RECORDED EVENTS')));
  }
  const placed=person.weapon==='shotgun'?[]:
   stageMagazines(person.magazines,person.loadout);
  const magSlots=person.weapon==='shotgun'?null:
   magazinePlacementSummary(person.magazines,person.loadout);
  if(magSlots)readiness.append(node('p','campaign-kit-metrics',
   'MAGAZINES · CHEST '+magSlots.rig+' · BELT '+magSlots.belt+
   ' · POCKET '+magSlots.pocket+' · PACK '+magSlots.backpack+
   ' · STOWED '+magSlots.overflow));
  readiness.append(node('p','campaign-note',
   'Spare magazines can be individually placed below. Chest and belt magazines reload faster; backpack and overflow retrievals take longer.'));
  const maximum=initialArmorIntegrity(person.loadout);
  const repairCost=armorRepairCost(person);
  readiness.append(node('p','campaign-kit-metrics',
   'ARMOR · '+person.armorCondition.torso+'/'+maximum.torso+
   '     HELMET · '+person.armorCondition.head+'/'+maximum.head));
  const repair=button('REPAIR PROTECTION · '+repairCost+' CR',
   ()=>this.handlers.repairArmor(person.id));
  repair.disabled=!!c.activeContractId||repairCost===0||c.funds<repairCost;
  readiness.append(repair);
  const capacity=kitMedicalSupplies(person.loadout);
  readiness.append(node('p','campaign-kit-metrics',
   'FIELD MEDICAL · '+medicalSupplyCount(person.medicalSupplies)+' / '+
    medicalSupplyCount(capacity)+' · HQ RESERVE '+c.supplies.medical));
  readiness.append(node('p','campaign-kit-metrics',
   'WEAPON CONFIG · '+Object.values(person.weaponConfiguration.slots)
    .map(v=>v.replace(/^[^-]+-/,'')).join(' / ')));
  readiness.append(node('p','campaign-note',
   'Equipment is issued as a saved preparation kit. Carried weight now influences movement speed. Coarse armor coverage and durability are now simulated; detailed ballistic hitboxes, retrieval times, tools and attachment handling are still in development.'));
  readiness.append(node('p','campaign-note',
   'The preview uses the same 3D operator rig as the mission. Some equipment slots are metadata-only until their gameplay systems are implemented.'));
  summary.append(readiness);
  grid.append(summary);
  const editor=node('section','campaign-section campaign-kit-editor');
  const locked=!!c.activeContractId;
  const presets=node('details','campaign-kit-presets');
  presets.append(node('summary','','SAVED KIT PRESETS · '+c.kitPresets.length));
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
  presets.append(presetActions,node('p','campaign-note',
   'Presets save a configuration, not copies of purchased equipment. Applying one requires an available primary weapon.'));
  editor.append(presets);
  editor.append(node('h2','','LOADOUT'));
  if(locked)editor.append(node('p','campaign-note','ACTIVE DEPLOYMENT · KIT CHANGES LOCKED'));
  const grouped=buildQuickLoadoutGroups(editor,this.activeKitGroup,group=>{
   this.activeKitGroup=group;
  });
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
     option.disabled=(weapon!==person.weapon&&c.inventory.weapons[weapon]<1)||
       ((weapon==='smg'||weapon==='shotgun')&&weapon!==person.weapon);
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
   grouped.field(loadoutGroupForSlot(slot)).append(wrap);
  }
  // Cosmetics have one authoritative editor: Operator Studio.
  // Campaign equipment stock, purchase costs and protection remain here.
  // The family prototype sits above legacy accessory mounts: modular body
  // pieces never masquerade as a purchased optic, light or suppressor.
  const familySelectors=new Map<FamilyPartSlot,HTMLSelectElement>();
  const familyEditor=node('details','campaign-weapon-attachments');
  const build=person.weaponConfiguration.build;
  const legacyControls=node('details','campaign-legacy-weapons');
  legacyControls.open=!build||this.weaponView||
   this.expandedClassicWeaponControls.has(id);
  legacyControls.addEventListener('toggle',()=>{
   if(legacyControls.open)this.expandedClassicWeaponControls.add(id);
   else this.expandedClassicWeaponControls.delete(id);
  });
  legacyControls.append(node('summary','','ADVANCED · CLASSIC WEAPON CONTROLS'),
   node('p','campaign-note',
    'Use OPEN ARSENAL to build modular weapons. These direct controls remain available for unsupported weapons and troubleshooting.'),
   viewToggle);
  familyEditor.open=true;
  familyEditor.append(node('summary','','WEAPON FAMILY / MODULAR FURNITURE'));
  familyEditor.append(node('p','campaign-note',
   'Tap a weapon part to choose compatible replacements. Factory builds are starting points. Core changes keep what fits; incompatible pieces are shown before replacement. Your owned weapon and ammunition remain unchanged.'));
  const selectedFamilyPreset=build?matchingFamilyPreset(build):undefined;
  const factoryBrowser=createWeaponPresetBrowser({
   selectedId:selectedFamilyPreset?.id,selectedFamily:build?.family,
   availability:preset=>{
    if(locked)return 'Deployment locked';
    if(preset.weapon!==person.weapon&&(c.inventory.weapons[preset.weapon]??0)<1)
     return 'No '+preset.weapon+' currently owned';
    return null;
   },
   onSelect:presetId=>this.handlers.equipWeaponPreset(id,presetId)
  });
  familyEditor.append(factoryBrowser);
  if(build){
   familyEditor.append(node('p','campaign-kit-metrics',
    'PLATFORM · '+build.family.toUpperCase()+' · '+
    (selectedFamilyPreset?.name??'CUSTOM BUILD')));
   for(const slot of FAMILY_PART_SLOTS){
    const row=node('label','campaign-kit-row');
    const select=node('select','campaign-select');
    select.setAttribute('aria-label','Choose '+slot+' for '+person.callsign);
    const barrelLength=FAMILY_PARTS[build.parts.barrel]?.length;
    for(const part of Object.values(FAMILY_PARTS)){
     if(part.slot!==slot||part.family!==build.family)continue;
     const receiverId=slot==='receiver'?part.id:build.parts.receiver;
     if(!compatibleFamilyPart(receiverId,slot,part.id,person.weapon,
       barrelLength))continue;
     const option=node('option','',part.name);
     option.value=part.id;select.append(option);
    }
    select.value=build.parts[slot];select.disabled=locked;
    select.addEventListener('focus',()=>{
     const socket=('body-'+slot) as WorkbenchSocket;
     this.selectedWorkbenchSocket=socket;
     this.workbench?.showSocketChoices(socket,select);
    });
    select.addEventListener('change',async()=>{
     const proposed=proposeFamilyPartChange(build,person.weapon,slot,select.value);
     if(!proposed.valid){select.value=build.parts[slot];return;}
     const dependent=proposed.replacements.filter(change=>change.slot!==slot);
     if(dependent.length){
      const message=dependent.map(change=>
       FAMILY_PARTS[change.from]?.name+' → '+FAMILY_PARTS[change.to]?.name).join('; ');
      if(!await confirmFieldworkAction({
       title:'Replace incompatible parts?',
       message:'Changing '+slot+' also replaces: '+message,
       confirmLabel:'APPLY CHANGES'
      })){select.value=build.parts[slot];return;}
     }
     this.handlers.equipWeaponFamilyPart(id,slot,select.value);
    });
    familySelectors.set(slot,select);
    row.append(node('span','',slot.toUpperCase()),select);
    familyEditor.append(row);
   }
  }
  legacyControls.append(familyEditor);
  const mountSelectors=new Map<WeaponAttachmentSlot,HTMLSelectElement>();
  const attachments=node('details','campaign-weapon-attachments');
  attachments.append(node('summary','','SIGHTS / RAILS / ACCESSORIES'));
  attachments.append(node('p','campaign-note',
   'Factory parts are included. Additional modules are finite workshop stock; purchase and install before deployment.'));
  for(const slot of WEAPON_ATTACHMENT_SLOTS){
   if(build&&slot==='stock')continue;
   const row=node('label','campaign-kit-row');
   const title=node('span','',slot.toUpperCase());
   const select=node('select','campaign-select');
   select.setAttribute('aria-label','Select '+slot+' for '+person.callsign);
   const current=person.weaponConfiguration.slots[slot];
   for(const part of Object.values(WEAPON_ATTACHMENTS)){
    if(part.slot!==slot||!weaponAttachmentAllowed(person.weaponConfiguration,
      slot,part.id))continue;
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
    this.selectedWorkbenchSocket=slot;
    this.workbench?.showSocketChoices(slot,select);});
   select.addEventListener('change',async()=>{
    const partId=select.value,price=attachmentPrice(partId);
    const stock=c.inventory.attachments[partId]??0;
    const acquire=price>0&&stock<1;
    if(acquire&&c.funds<price){
     void showFieldworkNotice('Insufficient funds',
      'You do not have enough credits for this attachment.');
     select.value=current;this.workbench?.showSocketChoices(slot,select);return;
    }
    if(acquire&&!await confirmFieldworkAction({
     title:'Purchase and install attachment?',
     message:(WEAPON_ATTACHMENTS[partId]?.name??partId)+
      ' costs '+price+' credits. Confirm this armory purchase.',
     confirmLabel:'BUY & INSTALL'
    })){
     select.value=current;this.workbench?.showSocketChoices(slot,select);return;
    }
    this.handlers.equipAttachment(id,slot,partId,acquire);
   });
   row.append(title,select);attachments.append(row);
  }
  const gun=resolveWeaponAssembly(person.weaponConfiguration);
  attachments.append(node('p','campaign-kit-metrics',
   'WEAPON MASS · '+gun.massKg.toFixed(2)+' KG · BALANCE '+gun.balanceX.toFixed(1)+
   ' · MUZZLE EXTENSION '+(gun.muzzleX-19.5).toFixed(1)));
  legacyControls.append(attachments);
  grouped.field('weapon').append(legacyControls);
  if(placed.length){
   const magazines=node('details','campaign-magazines');
   magazines.append(node('summary','','MAGAZINE LOCATIONS · '+placed.length));
   magazines.append(node('p','campaign-note',
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
    row.append(picker);magazines.append(row);
   }
   grouped.field('carry').append(magazines);
  }
  grid.append(editor);main.append(grid);
  this.root.append(main);
  if(this.weaponView){
   this.workbench=new WeaponWorkbenchPreview(preview,person.weaponConfiguration,socket=>{
    const bodyPart=socket.startsWith('body-')?
     socket.slice(5) as FamilyPartSlot:null;
    const select=bodyPart?familySelectors.get(bodyPart):
     mountSelectors.get(socket as WeaponAttachmentSlot);
    if(!select)return;
    this.selectedWorkbenchSocket=socket;
    legacyControls.open=true;
    if(bodyPart)familyEditor.open=true;
    else{attachments.open=true;this.selectedMount=socket as WeaponAttachmentSlot;}
    // Mirror the existing options directly below the model. Keep
    // Campaign purchase confirmation and stock rules on the select handler.
    this.workbench?.showSocketChoices(socket,select);
   });
   const core=person.weapon+'|'+(person.weaponConfiguration.build?.parts.receiver??'legacy')+
    '|'+(person.weaponConfiguration.build?.parts.barrel??'none');
   this.workbenchCore=core;
   const savedView=this.weaponWorkbenchViews.get(id);
   if(savedView?.core===core)this.workbench.restoreViewState(savedView.view);
   const remembered=this.selectedWorkbenchSocket;
   const savedSelect=remembered?.startsWith('body-')?
    familySelectors.get(remembered.slice(5) as FamilyPartSlot):
    remembered?mountSelectors.get(remembered as WeaponAttachmentSlot):undefined;
   if(remembered&&savedSelect)
    this.workbench.showSocketChoices(remembered,savedSelect);
   else this.workbench.setActiveSlot(build?'body-receiver':this.selectedMount,false);
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
