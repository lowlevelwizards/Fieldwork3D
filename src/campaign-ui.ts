/** Campaign screens. Render only on navigation and state changes, never per frame. */
import type {CampaignState,Contract} from './campaign-state.ts';
import type {CampaignSlot} from './campaign-save-slots.ts';
import type {CampaignCreationDraft} from './campaign-creation.ts';
import {effectiveCampaignRules} from './campaign-rules.ts';
import {isDispatchPilot,mayChooseCampaignContent}
 from './dispatch-campaign-eligibility.ts';
import {campaignIncidentView} from './dispatch-incident-view.ts';
import {dispatchCaseDossier} from './dispatch-case-dossier.ts';
import {dispatchCaseCloseout} from './dispatch-case-closeout.ts';
import {historicalDispatchIncident} from './dispatch-incident-context.ts';
import {initialDispatchDepartment,dispatchStandingTier}
 from './dispatch-department.ts';
import {renderCampaignCreator} from './ui/campaign-creator.ts';
import {renderDispatchCampaignCreator} from './ui/dispatch-campaign-creator.ts';
import {effectiveDispatchSetup,currentDispatchReference,
 type DispatchCampaignDraft} from './dispatch-campaign-setup.ts';
import {factionReference} from './faction-reference-catalog.ts';
import {dispatchDepartmentView} from './dispatch-department-view.ts';
import {campaignWeaponQuote,CAMPAIGN_WEAPON_PLATFORMS}
 from './campaign-weapon-procurement.ts';
import {SKILL_NAMES,canAffordCampaignPurchase,
 armorRepairCost,weaponServiceCost,canApplyCampaignKitPreset}
 from './campaign-state.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {sharedService} from './campaign-history.ts';
import {LOADOUT_SLOTS,itemsForSlot,itemDefinition} from './equipment-catalog.ts';
import {totalEquipmentMass,loadMobilityDescription,loadMovementScale,
 type LoadoutSlot} from './equipment-loadouts.ts';
import {CampaignKitPreview,type EquipmentPreviewFocus} from './equipment-preview.ts';
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
import {createCampaignGearPicker} from './ui/campaign-gear-picker.ts';
import './campaign-style.css';
import {buildQuickLoadoutGroups,loadoutGroupForSlot,QUICK_LOADOUT_GROUPS,
 type QuickLoadoutGroup} from './ui/quick-loadout-groups.ts';
export type CampaignHandlers={
 newCampaign:()=>void;continueCampaign:()=>void;quickPlay:()=>void;training:()=>void;
 newSandbox:()=>void;continueSandbox:()=>void;
 newDispatch:()=>void;continueDispatch:()=>void;
 createSandbox:(draft:CampaignCreationDraft)=>Promise<boolean|null>;
 createDispatch:(draft:DispatchCampaignDraft)=>Promise<boolean|null>;
 exportDispatch:()=>void;
 exportSandbox:()=>void;showMenu:()=>void;
 openReplayLibrary:()=>void;openMenuStudio:()=>void;
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
 exportSave:()=>void;importSave:(raw:string,slot:CampaignSlot)=>void;retire:(id:string)=>void;
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
 private currentSlot:CampaignSlot='legacy';
 private lastEntry={legacy:false,sandbox:false,dispatch:false,active:'legacy' as CampaignSlot};
 private armoryOperatorId:string|null=null;
 private homeTab:'overview'|'personnel'|'contracts'|'logistics'|'chronicle'='overview';
 /** Keeps the selected case available while preparing squad or supplies. */
 private preparationContractId:string|null=null;
 private preview:CampaignKitPreview|null=null;
 private workbench:WeaponWorkbenchPreview|null=null;
 private weaponView=false;
 /** Temporary UI preference only; no Campaign save mutation. */
 private readonly expandedClassicWeaponControls=new Set<string>();
 /** UI-only disclosure preference, retained when supplies or treatment refreshes home. */
 private readonly expandedOperatorCare=new Set<string>();
 /** Preserve which operator rows are expanded across in-place campaign actions. */
 private readonly expandedOperatorTools=new Set<string>();
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
 entry(hasSave:boolean,sandboxHasSave=false,active:CampaignSlot='legacy',dispatchHasSave=false,
  initialPane:'main'|'new'='main',
  savedCampaigns:Partial<Record<CampaignSlot,CampaignState|null>>={}){
  this.lastEntry={legacy:hasSave,sandbox:sandboxHasSave,dispatch:dispatchHasSave,active};
  this.armoryOperatorId=null;this.disposePreview();
  this.root.hidden=false;this.root.replaceChildren();
  const slots:[
   CampaignSlot,string,boolean,()=>void
  ][]=[
   ['legacy','CLASSIC CAMPAIGN',hasSave,this.handlers.continueCampaign],
   ['sandbox','CLASSIC SANDBOX',sandboxHasSave,this.handlers.continueSandbox],
   ['dispatch','DISPATCH CAMPAIGN',dispatchHasSave,this.handlers.continueDispatch]
  ];
  const available=slots.filter(([, ,saved])=>saved);
  // Favor the actual active slot, not the historically first (legacy) handler.
  const selected=available.find(([slot])=>slot===active)??available[0];
  const selectedCampaign=selected?savedCampaigns[selected[0]]:null;
  const main=node('main','campaign-shell campaign-landing');
  main.setAttribute('aria-label','Fieldwork main menu');
  const subpage=node('section','campaign-shell campaign-landing campaign-landing-subpage');
  subpage.setAttribute('aria-label','Menu details');
  subpage.hidden=true;
  // Escape reverses local menu navigation without leaving the current game.
  subpage.addEventListener('keydown',event=>{
   if(event.key!=='Escape')return;
   const back=subpage.querySelector<HTMLButtonElement>('.campaign-landing-back');
   if(!back)return;
   event.preventDefault();back.click();
  });
  const showSubpage=(title:string,lead:string,trigger:HTMLElement,
   populate:(target:HTMLElement)=>void)=>{
   const back=button('BACK',()=>{subpage.hidden=true;main.hidden=false;
    trigger.focus({preventScroll:true});},'campaign-landing-back');
   const head=node('header','campaign-landing-subhead');
   head.append(back,node('h2','',title),node('p','',lead));
   const content=node('div','campaign-landing-subcontent');
   populate(content);
   subpage.replaceChildren(head,content);
   main.hidden=true;subpage.hidden=false;
   back.focus({preventScroll:true});
  };
  const option=(title:string,detail:string,action:()=>void)=>{
   const item=button('',action,'campaign-landing-option');
   item.append(node('strong','',title),node('span','',detail));
   item.setAttribute('aria-label',title+' — '+detail);
   return item;
  };
  const openNew=(trigger:HTMLElement)=>showSubpage('NEW CAMPAIGN',
   'Choose a setting, then configure the experience.',trigger,target=>{
    target.append(
     option('DISPATCH','Police tactical career, historical and creative profiles',
      this.handlers.newDispatch),
     option('CLASSIC CAMPAIGN','Original persistent Field Operations',
      this.handlers.newCampaign),
     option('CLASSIC SANDBOX','Original campaign with configurable mission rules',
      this.handlers.newSandbox));
   });
  const openSwitch=(trigger:HTMLElement)=>showSubpage('SWITCH CAMPAIGN',
   'Choose an existing local campaign. Nothing will be overwritten.',trigger,target=>{
    for(const [slot,label,saved,action] of slots){
     if(!saved)continue;
     target.append(option(label+(slot===active?' · ACTIVE':''),
      'Continue this saved campaign',action));
    }
   });
  const openTools=(trigger:HTMLElement)=>showSubpage('MORE',
   'Save management and development utilities.',trigger,target=>{
    const saves=node('details','campaign-landing-saves');
    saves.append(node('summary','','DATA & SAVES'));
    saves.append(node('p','campaign-note',
     'Import to a specific campaign slot. Existing saves are protected by confirmation.'));
    for(const [slot,label] of [
     ['legacy','CLASSIC CAMPAIGN'],['sandbox','CLASSIC SANDBOX'],
     ['dispatch','DISPATCH CAMPAIGN']
    ] as const){
     saves.append(node('p','campaign-note','IMPORT TO '+label));
     saves.append(this.importPicker(slot));
    }
    const labs=node('details','campaign-landing-labs');
    labs.append(node('summary','','DEVELOPER LABS'));
    const links=node('div','campaign-landing-lab-links');
    for(const [name,href] of [
     ['OPERATOR LAB','./operator-lab.html'],
     ['MAP LAB','./map-lab.html'],
     ['ASSET LAB','./asset-lab.html'],
     ['BRIEFING LAB','./briefing-lab.html'],
     ['POSE WORKBENCH','./pose-workbench.html']
    ]){
     const link=node('a','',name);link.href=href;links.append(link);
    }
    labs.append(links);target.append(saves,labs);
   });
  const hero=node('header','campaign-landing-hero');
  const plan=node('div','campaign-landing-plan');
  plan.setAttribute('aria-hidden','true');
  // Quiet architectural texture, not a pretend tactical route or mission intel.
  plan.innerHTML=[
   '<svg viewBox="0 0 540 340" xmlns="http://www.w3.org/2000/svg" fill="none">',
   '<defs><pattern id="fw-landing-grid" width="24" height="24" patternUnits="userSpaceOnUse">',
   '<path d="M24 0H0V24" stroke="#8aa69a" stroke-opacity=".1" stroke-width=".7"/></pattern></defs>',
   '<rect width="540" height="340" fill="url(#fw-landing-grid)"/>',
   '<g transform="translate(83 24) rotate(-7 196 145)" stroke-linecap="square">',
   '<path d="M58 28H384V265H58Z" fill="#879c87" fill-opacity=".045" stroke="#718b7c" stroke-width="6"/>',
   '<path d="M190 28V113M190 154V265M58 137H120M160 137H315M355 137H384M287 28V89M287 119V137M286 137V213M286 246V265" stroke="#809d8d" stroke-width="4"/>',
   '<path d="M58 80H126V137M190 210H286M286 81H384" stroke="#607d72" stroke-width="3"/>',
   '<path d="M58 176V214M58 231V265M348 265H376" stroke="#b1bdac" stroke-width="5"/>',
   '<path d="M190 112A42 42 0 0 1 232 154M315 137A40 40 0 0 1 355 177" stroke="#9cad91" stroke-opacity=".5" stroke-width="1.5"/>',
   '</g></svg>'
  ].join('');
  const copy=node('div','campaign-landing-copy');
  copy.append(node('h1','','FIELDWORK'),
   node('div','campaign-landing-subtitle','FIELD OPERATIONS'),
   node('p','campaign-landing-intro',
    'Plan your approach. Adapt to contact. Make every decision count.'));
  const more=button('MORE',()=>openTools(more),'campaign-landing-more');
  hero.append(plan,copy,more);
  const actions=node('nav','campaign-landing-actions');
  actions.setAttribute('aria-label','Play Fieldwork');
  const resume=node('div','campaign-landing-resume');
  let creationLauncher:HTMLButtonElement|null=null;
  const primary=button('',selected?selected[3]:()=>openNew(primary),
   'campaign-landing-card campaign-landing-primary');
  primary.append(node('span','campaign-landing-eyebrow',
   selected?'ACTIVE CAMPAIGN · '+selected[1]:'BEGIN FIELD OPERATIONS'),
   node('strong','',selected?'CONTINUE':'NEW CAMPAIGN'),
   node('span','campaign-landing-card-detail',
    selectedCampaign?'Day '+selectedCampaign.day+' · '+selectedCampaign.funds+' CR':
    selected?'Open your Operations Room':'Choose a campaign experience'));
  if(selectedCampaign){
   const recovering=selectedCampaign.operators.filter(o=>
    selectedCampaign.squadIds.includes(o.id)&&o.recoveryDays>0).length;
   if(selectedCampaign.activeContractId)
    primary.append(node('span','campaign-landing-status',
     'Deployment in progress'));
   else if(recovering)
    primary.append(node('span','campaign-landing-status is-warning',
     recovering+' assigned operator'+(recovering===1?'':'s')+' recovering'));
  }
  primary.setAttribute('aria-label',selected?
   'Continue '+selected[1]:'Create a new campaign');
  resume.append(primary);
  if(!selected)creationLauncher=primary;
  if(available.length>1){
   const switchButton=button('SWITCH',()=>openSwitch(switchButton),
    'campaign-landing-switch');
   switchButton.setAttribute('aria-label','Switch saved campaign');
   resume.append(switchButton);
  }
  const choices=node('div','campaign-landing-choices');
  if(selected){
   const create=option('NEW CAMPAIGN','Choose an experience',()=>openNew(create));
   create.classList.add('campaign-landing-card','campaign-landing-quick');
   creationLauncher=create;choices.append(create);
  }
  const quick=option('QUICK PLAY','Create a standalone operation',this.handlers.quickPlay);
  // Preserve the canonical control name for screen readers and browser tools.
  // Its visible subtitle still explains the action in the layout.
  quick.setAttribute('aria-label','QUICK PLAY');
  quick.classList.add('campaign-landing-card','campaign-landing-quick');
  choices.append(quick);
  const training=option('TRAINING','Killhouse · Range · Tactical trials',
   this.handlers.training);
  training.classList.add('campaign-landing-training');
  actions.append(resume,choices,training);
  const utility=node('nav','campaign-landing-utility');
  utility.setAttribute('aria-label','Creative tools and replays');
  const arsenal=node('a','campaign-landing-link','ARSENAL');
  arsenal.href='./arsenal.html';
  utility.append(arsenal,
   button('OPERATOR STUDIO',this.handlers.openMenuStudio,'campaign-landing-link'),
   button('REPLAYS',this.handlers.openReplayLibrary,'campaign-landing-link'));
  main.append(hero,actions,utility);
  this.root.append(main,subpage);
  if(initialPane==='new'&&creationLauncher)openNew(creationLauncher);
 }
 dispatchCreator(){
  this.disposePreview();this.armoryOperatorId=null;
  this.root.hidden=false;
  renderDispatchCampaignCreator(this.root,{
   hasDispatch:this.lastEntry.dispatch,
   onCancel:()=>this.entry(this.lastEntry.legacy,this.lastEntry.sandbox,
    this.lastEntry.active,this.lastEntry.dispatch,'new'),
   onExport:this.handlers.exportDispatch,
   onCreate:this.handlers.createDispatch
  });
 }
 creator(){
  this.disposePreview();this.armoryOperatorId=null;
  this.root.hidden=false;
  renderCampaignCreator(this.root,{
   hasSandbox:this.lastEntry.sandbox,
   onCancel:()=>this.entry(this.lastEntry.legacy,this.lastEntry.sandbox,this.lastEntry.active,this.lastEntry.dispatch,'new'),
   onExportSandbox:this.handlers.exportSandbox,
   onCreate:this.handlers.createSandbox
  });
 }
 home(c:CampaignState,slot?:CampaignSlot){
  // Preserve the user's place when a purchase or treatment refreshes this view.
  // Opening the campaign from a menu, briefing or loadout still starts at the top.
  const wasInOperations=!this.root.hidden&&
   !!this.root.querySelector('.campaign-tabs');
  const restoreScroll=wasInOperations?this.root.scrollTop:0;
  // Capture open, keyed disclosures before the DOM is replaced. This is UI
  // state only: supply, squad and treatment actions never mutate the save.
  const openWorkspaceDetails=wasInOperations?
   new Set(Array.from(this.root.querySelectorAll<HTMLDetailsElement>(
    'details[data-campaign-detail][open]')).map(el=>el.dataset.campaignDetail??'')):new Set<string>();
  const focusedControl=wasInOperations&&this.root.contains(document.activeElement)?
   document.activeElement as HTMLElement:null;
  const focusedLabel=focusedControl?.getAttribute('aria-label');
  if(slot)this.currentSlot=slot;
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
  const title=node('div','campaign-heading');
  title.append(node('div','campaign-eyebrow','FIELDWORK / VERDIGRIS'));
  title.append(node('h1','','OPERATIONS ROOM'));
  const rules=effectiveCampaignRules(c).mission;
  // Keep persistent setting and department metadata available without making
  // players read it above every campaign action on a phone.
  const campaignContext=node('details','campaign-context');
  campaignContext.dataset.campaignDetail='campaign-context';
  campaignContext.append(node('summary','',
   (this.currentSlot==='dispatch'?'DISPATCH':
    this.currentSlot==='sandbox'?'SANDBOX':'FIELD OPERATIONS')+
   ' · '+(c.name??'Original Campaign')));
  campaignContext.append(node('p','campaign-home-identity',
   (this.currentSlot==='dispatch'?
    factionReference(currentDispatchReference(c))?.name??'Dispatch':
    this.currentSlot==='sandbox'?'Sandbox Campaign':'Field Operations')));
  if(isDispatchPilot(c)){
   const identity=dispatchDepartmentView(c);
   campaignContext.append(node('p','campaign-home-identity',
    identity.preset+' · '+identity.period+' REFERENCE · '+identity.standingTier+
    ' '+identity.standing+'/100'));
  }
  title.append(campaignContext);
  const campaignMenuNav=node('nav','campaign-home-nav');
  const menuButton=button('MENU',this.handlers.showMenu);
  menuButton.setAttribute('aria-label','Open campaign menu');
  campaignMenuNav.append(menuButton);
  const resources=node('div','campaign-funds');
  resources.append(node('span','campaign-day','DAY '+c.day),
   node('span','campaign-credits',c.funds+' CR'));
  if(isDispatchPilot(c))
   resources.append(node('span','campaign-standing',
    'STANDING '+(c.dispatchDepartment?.standing??50)+'/100'));
  top.append(title,resources,campaignMenuNav);
  main.append(top);
  const grid=node('div','campaign-grid');
  const personnel=node('section','campaign-section');
  personnel.append(node('h2','','PERSONNEL'));
  const personnelWorkspace=node('div','campaign-personnel-workspace');
  const deployment=node('div','campaign-assignment');
  const deploymentHeading=node('div','campaign-assignment-heading');
  const headingCopy=node('div');
  headingCopy.append(node('h2','','DEPLOYMENT TEAM'),
   node('p','','Select four operators for your next mission.'));
  const readyAssigned=c.squadIds.filter(id=>{
   const o=c.operators.find(p=>p.id===id);
   return o&&o.recoveryDays===0&&o.status!=='lost'&&o.status!=='retired';
  }).length;
  const readinessCount=node('span','campaign-assignment-count',
   readyAssigned+' / 4 READY');
  deploymentHeading.append(headingCopy,readinessCount);
  deployment.append(deploymentHeading);
  const slotList=node('div','campaign-assignment-slots');
  for(let slot=0;slot<4;slot++){
   const operator=c.operators.find(p=>p.id===c.squadIds[slot]);
   const line=node('label','campaign-assignment-row');
   const slotHeading=node('div','campaign-assignment-slot-label');
   slotHeading.append(node('strong','','SLOT 0'+(slot+1)));
   if(operator){
    const state=operator.recoveryDays>0?
     'RECOVERING · '+operator.recoveryDays+' DAYS':'READY';
    slotHeading.append(node('small',operator.recoveryDays>0?
     'is-recovering':'is-ready',state));
   }else slotHeading.append(node('small','is-unfilled','UNASSIGNED'));
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
   line.append(slotHeading,picker);
   slotList.append(line);
  }
  deployment.append(slotList);
  personnelWorkspace.append(deployment);
  const rosterPanel=node('section','campaign-personnel-roster-panel');
  const activeOperators=c.operators.filter(p=>
   p.status!=='retired'&&p.status!=='lost').sort((a,b)=>{
    const ai=c.squadIds.indexOf(a.id),bi=c.squadIds.indexOf(b.id);
    return (ai<0?99:ai)-(bi<0?99:bi);
   });
  const rosterHeading=node('div','campaign-roster-heading');
  rosterHeading.append(node('h2','','ACTIVE ROSTER'),
   node('span','campaign-roster-count',
    activeOperators.length+' OPERATOR'+(activeOperators.length===1?'':'S')));
  rosterPanel.append(rosterHeading);
  const roster=node('div','campaign-roster');
  if(!activeOperators.length)roster.append(node('p','campaign-note',
   'No active operators. Recruit personnel to prepare your next deployment.'));
  const deployed=activeOperators.filter(p=>c.squadIds.includes(p.id));
  const reserves=activeOperators.filter(p=>!c.squadIds.includes(p.id));
  for(const p of activeOperators){
   if(p===deployed[0])
    roster.append(node('h3','campaign-roster-group-label',
     'DEPLOYMENT TEAM · '+deployed.length));
   if(p===reserves[0])
    roster.append(node('h3','campaign-roster-group-label',
     'RESERVES · '+reserves.length));
   const card=node('article','campaign-person');
   const tools=node('details','campaign-person-expand');
   tools.open=this.expandedOperatorTools.has(p.id);
   tools.addEventListener('toggle',()=>{
    if(tools.open)this.expandedOperatorTools.add(p.id);
    else this.expandedOperatorTools.delete(p.id);
   });
   const summary=node('summary','campaign-person-summary');
   summary.setAttribute('aria-label','Manage '+p.callsign+' operator record and equipment');
   const identity=node('span','campaign-person-head');
   const monogram=node('span','campaign-person-avatar',p.callsign.slice(0,2).toUpperCase());
   monogram.setAttribute('aria-hidden','true');
   const copy=node('span','campaign-person-identity');
   copy.append(node('strong','',p.callsign),node('span','',p.background));
   const status=node('span','campaign-person-state'+(p.recoveryDays?' is-recovering':''),
    p.recoveryDays?'RECOVERING · '+p.recoveryDays+' DAYS':
     c.squadIds.includes(p.id)?'ASSIGNED':'RESERVE');
   identity.append(monogram,copy,status);
   const performance=node('span','campaign-person-performance');
   performance.append(node('span','','HANDLING '+Math.round(p.skills.handling*100)+'/100'),
    node('span','',p.missions+' OPS'),node('span','',p.trait));
   summary.append(identity,performance);tools.append(summary);card.append(tools);
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
   const profile=button('VIEW PROFILE',()=>{
    const overlay=node('div','campaign-operator-profile-backdrop');
    const panel=node('section','campaign-operator-profile fw-sheet');
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    const heading=node('h2','',p.callsign+' / SERVICE DOSSIER');
    heading.id='campaign-operator-profile-heading';
    panel.setAttribute('aria-labelledby',heading.id);
    const dismiss=()=>{
     overlay.remove();
     if(profile.isConnected)profile.focus({preventScroll:true});
    };
    const close=button('CLOSE',dismiss,'campaign-operator-profile-close');
    const header=node('header','campaign-operator-profile-header');
    header.append(heading,close);
    const stats=node('div','campaign-operator-profile-stats');
    for(const [label,value] of [
     ['STATUS',p.recoveryDays?'RECOVERING · '+p.recoveryDays+' DAYS':
      c.squadIds.includes(p.id)?'ASSIGNED':'RESERVE'],
     ['PRIMARY',p.weapon.toUpperCase()],
     ['OPERATIONS',String(p.missions)]
    ] as const){
     const cell=node('div','campaign-operator-profile-stat');
     cell.append(node('small','',label),node('strong','',value));
     stats.append(cell);
    }
    details.open=true;
    panel.append(header,stats,details);
    const actions=node('div','campaign-operator-profile-actions');
    const loadout=button('OPEN LOADOUT',()=>{
     overlay.remove();this.armoryOperatorId=p.id;this.home(c);
    },'campaign-primary');
    const look=button('OPERATOR STUDIO',()=>{
     overlay.remove();this.handlers.openStudio(p.id);
    });
    look.disabled=!!c.activeContractId;
    actions.append(loadout,look);panel.append(actions);
    overlay.append(panel);this.root.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
    overlay.addEventListener('keydown',e=>{
     if(e.key==='Escape'){e.preventDefault();dismiss();return;}
     if(e.key!=='Tab')return;
     const items=Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not(:disabled),summary')).filter(el=>el.getClientRects().length>0);
     const first=items[0],last=items[items.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    });
    close.focus({preventScroll:true});
   },'campaign-person-profile');
   profile.setAttribute('aria-label','View '+p.callsign+' service dossier');
   const actions=node('div','campaign-person-actions');
   const care=node('details','campaign-person-care');
   care.open=this.expandedOperatorCare.has(p.id);
   care.addEventListener('toggle',()=>{
    if(care.open)this.expandedOperatorCare.add(p.id);
    else this.expandedOperatorCare.delete(p.id);
   });
   care.append(node('summary','','EQUIPMENT & CARE'));
   const careActions=node('div','campaign-person-care-actions');
   const weaponPick=node('select','campaign-select');
   weaponPick.setAttribute('aria-label','Select weapon for '+p.callsign);
   for(const weapon of ['carbine','smg','rifle','shotgun'] as const){
    const opt=node('option','',weapon.toUpperCase()+' · '+c.inventory.weapons[weapon]+' SPARE');
    opt.value=weapon;opt.disabled=(weapon!==p.weapon&&c.inventory.weapons[weapon]<1)||
     ((weapon==='smg'||weapon==='shotgun')&&weapon!==p.weapon)||
      (isDispatchPilot(c)&&weapon!==p.weapon&&
       !mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary'));
    weaponPick.append(opt);
   }
   weaponPick.value=p.weapon;weaponPick.disabled=!!c.activeContractId;
   weaponPick.addEventListener('change',()=>this.handlers.equipWeapon(p.id,
    weaponPick.value as 'carbine'|'smg'|'rifle'|'shotgun'));
   const loadoutButton=button('LOADOUT',()=>{
    this.armoryOperatorId=p.id;this.home(c);
   },'campaign-primary');
   loadoutButton.setAttribute('aria-label','Open '+p.callsign+' loadout');
   actions.append(loadoutButton);
   const look=button('APPEARANCE',()=>this.handlers.openStudio(p.id));
   look.disabled=!!c.activeContractId;
   look.setAttribute('aria-label','Edit '+p.callsign+' appearance in Operator Studio');
   actions.append(look);
   careActions.append(weaponPick);
   const resupply=button('RESUPPLY AMMO',()=>this.handlers.resupply(p.id));
   resupply.setAttribute('aria-label','Resupply ammunition for '+p.callsign);
   resupply.disabled=!!c.activeContractId||c.supplies.ammo===0;
   if(resupply.disabled)resupply.title=c.activeContractId?
    'Finish the current deployment before resupplying':
    'No ammunition available in Logistics';
   careActions.append(resupply);
   const med=kitMedicalSupplies(p.loadout);
   const replenish=button('REISSUE MEDICAL '+medicalSupplyCount(p.medicalSupplies)+
    '/'+medicalSupplyCount(med)+' · '+c.supplies.medical+' IN STOCK',
    ()=>this.handlers.resupplyMedical(p.id));
   replenish.setAttribute('aria-label','Reissue medical supplies for '+p.callsign);
   replenish.disabled=!!c.activeContractId||c.supplies.medical<1||
    medicalSupplyCount(p.medicalSupplies)>=medicalSupplyCount(med)||
    medicalSupplyCount(med)===0;
   if(replenish.disabled)replenish.title=c.activeContractId?
    'Finish the current deployment before reissuing supplies':
    c.supplies.medical<1?'No medical kits available in Logistics':
    medicalSupplyCount(med)===0?'This loadout has no medical supplies to replenish':
    'Medical supplies already full';
   careActions.append(replenish);
   if(p.recoveryDays>0){
    const treat=button(
     'TREAT · '+p.recoveryDays+' → '+Math.max(0,p.recoveryDays-2)+' DAYS',
     ()=>this.handlers.treat(p.id));
    treat.setAttribute('aria-label','Treat '+p.callsign);
    treat.disabled=!!c.activeContractId||c.supplies.medical<1;
    if(treat.disabled)treat.title=c.activeContractId?
     'Finish the current deployment before treatment':
     'Buy medical kits in Logistics to treat this operator';
    careActions.append(treat);
   }
   if(!c.squadIds.includes(p.id)&&
    c.operators.filter(o=>o.status==='available'||o.status==='reserve').length>4)
   {
    const retire=button('RETIRE',()=>this.handlers.retire(p.id));
    retire.setAttribute('aria-label','Retire '+p.callsign);
    careActions.append(retire);
   }
   care.append(careActions);
   tools.append(profile,actions,care);
   roster.append(card);
  }
  rosterPanel.append(roster);
  personnelWorkspace.append(rosterPanel);
  personnel.append(personnelWorkspace);
  const logistics=node('section','campaign-section');
  logistics.append(node('h2','','SUPPLIES & LOGISTICS'));
  const logisticsWorkspace=node('div','campaign-logistics-workspace');
  const supplyPanel=node('section','campaign-logistics-supply-panel');
  supplyPanel.append(node('h2','','RESERVE SUPPLIES'));
  const stock=node('div','campaign-logistics-stats');
  for(const [count,label] of [
   [c.supplies.ammo,'ROUNDS'],
   [c.supplies.medical,'MEDICAL KITS'],
   [c.supplies.flash,'FLASHBANGS']
  ] as const){
   const fact=node('div','campaign-logistics-stat');
   if(count===0||(label==='ROUNDS'&&count<60))
    fact.classList.add('is-low');
   fact.append(node('strong','',String(count)),node('span','',label));
   stock.append(fact);
  }
  supplyPanel.append(stock,node('h3','campaign-logistics-buy-heading',
   'REPLENISH RESERVES'));
  const purchases=node('div','campaign-purchases');
  for(const [label,cost,action] of [
   ['60 ROUNDS',120,this.handlers.buyAmmo],
   ['MEDICAL KIT',170,this.handlers.buyMedical],
   ['2 FLASHBANGS',150,this.handlers.buyFlash]
  ] as const){
   const price=isDispatchPilot(c)&&effectiveDispatchSetup(c).economy==='unlimited'?
    'NO CHARGE':cost+' CR';
   const item=node('div','campaign-supply-offer');
   const desc=node('div','campaign-supply-offer-title');
   desc.append(node('strong','',label),node('span','',price));
   const buy=button('BUY',action);
   buy.setAttribute('aria-label','Buy '+label+' for '+price);
   buy.disabled=!canAffordCampaignPurchase(c,cost)||
    (label==='2 FLASHBANGS'&&(!!c.activeContractId||c.supplies.flash>998));
   if(buy.disabled){
    const why=label==='2 FLASHBANGS'&&!!c.activeContractId?
     'Unavailable during an active deployment':
     label==='2 FLASHBANGS'&&c.supplies.flash>998?
      'Flashbang reserve at capacity':'Insufficient campaign funds';
    buy.title=why;
    buy.setAttribute('aria-description',why);
   }
   item.append(desc,buy);purchases.append(item);
  }
  supplyPanel.append(purchases);
  logisticsWorkspace.append(supplyPanel);
  const inventory=node('div','campaign-armory');
  inventory.append(node('h2','','FIELD ARMORY'));
  const offerings=isDispatchPilot(c)?CAMPAIGN_WEAPON_PLATFORMS:
   (['carbine','rifle'] as const);
  for(const weapon of offerings){
   const quote=campaignWeaponQuote(c,weapon);
   const row=node('div','campaign-procurement-item');
   const heading=node('div','campaign-procurement-heading');
   heading.append(node('strong','',weapon.toUpperCase()+' PLATFORM'),
    node('small','',quote.priceLabel));
   const metrics=node('small','campaign-procurement-metrics',
    quote.stock+' SPARE IN ARMORY · '+quote.issued+' ISSUED');
   const eligibility=node('details','campaign-procurement-eligibility');
   eligibility.dataset.campaignDetail='weapon:'+weapon;
   const eligibilitySummary=node('summary','',
    quote.canPurchase?'PURCHASE ELIGIBILITY':'UNAVAILABLE · VIEW REQUIREMENTS');
   eligibilitySummary.setAttribute('aria-label',
    (quote.canPurchase?'Purchase eligibility':'Purchase restrictions')+
    ' for '+weapon.toUpperCase()+' platform');
   eligibility.append(eligibilitySummary);
   const status=node('p','campaign-procurement-status',quote.authorization);
   const reasonId='campaign-procurement-reason-'+weapon;
   status.id=reasonId;
   eligibility.append(status);
   const buy=button('PURCHASE '+weapon.toUpperCase(),()=>this.handlers.buyWeapon(weapon));
   buy.disabled=!quote.canPurchase;
   buy.title=quote.authorization;
   buy.setAttribute('aria-describedby',reasonId);
   row.append(heading,metrics,buy,eligibility);inventory.append(row);
  }
  logisticsWorkspace.append(inventory);
  logistics.append(logisticsWorkspace);
  const recruit=button('RECRUIT OPERATOR · '+
   (isDispatchPilot(c)&&effectiveDispatchSetup(c).economy==='unlimited'?
    'NO CHARGE':'450 CR'),this.handlers.recruit);
  recruit.disabled=c.operators.length>=32||c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').length>=8||
   !canAffordCampaignPurchase(c,450)||!!c.activeContractId;
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
   jobs.append(node('p','campaign-note','Deployment committed: '+campaignIncidentView(c,accepted).title+' / '+accepted.region));
   jobs.append(node('p','campaign-note','Continuing after reopening starts the same contract at planning.'));
   jobs.append(button('CONTINUE DEPLOYMENT',this.handlers.resumeContract,'campaign-primary'));
  }else{
   const openContracts=c.contracts.filter(k=>
    k.status==='available'&&k.deadline>=c.day);
   if(!openContracts.length){
    const empty=node('div','campaign-contract-empty');
    empty.append(node('strong','','NO ACTIVE CASES'),
     node('p','campaign-note',
      'No assignments are currently available. You can review the squad, supplies, or service history.'));
    const links=node('div','campaign-contract-empty-actions');
    links.append(
     button('REVIEW SQUAD',()=>activateTab('personnel')),
     button('CHECK SUPPLIES',()=>activateTab('logistics')));
    empty.append(links);jobs.append(empty);
   }else{
    const sorted=[...openContracts].sort((a,b)=>
     a.deadline-b.deadline||a.id.localeCompare(b.id));
    const visible=sorted.slice(0,3);
    jobs.append(node('p','campaign-contract-board-summary',
     'SHOWING '+visible.length+' OF '+openContracts.length+
     ' OPEN CASE'+(openContracts.length===1?'':'S')+' · EARLIEST DEADLINE FIRST'));
    const board=node('div','campaign-contract-board');
    for(const contract of visible)board.append(this.contract(contract,c));
    jobs.append(board);
    if(sorted.length>visible.length){
     const more=node('details','campaign-contract-more');
     more.dataset.campaignDetail='more-cases';
     more.append(node('summary','',
      'VIEW '+(sorted.length-visible.length)+' ADDITIONAL CASES'));
     const remaining=node('div','campaign-contract-board');
     for(const contract of sorted.slice(visible.length))
      remaining.append(this.contract(contract,c));
     more.append(remaining);jobs.append(more);
    }
   }
  }
  grid.append(jobs);
  let serviceRecord:HTMLElement|null=null;
  if(isDispatchPilot(c)){
   const dept=c.dispatchDepartment??initialDispatchDepartment();
   const record=node('details','campaign-section campaign-dispatch-service');
   record.dataset.campaignDetail='service-record';
   record.append(node('summary','','DEPARTMENT SERVICE RECORD · '+dept.standing+'/100'));
   record.append(node('p','campaign-note',
    'OPERATIONAL STANDING · '+dept.standing+' / 100 · '+
    dispatchStandingTier(dept.standing)));
   record.append(node('p','campaign-note',
    'RESPONSES '+dept.responses+' · COMPLETED '+dept.successful+
    ' · DOCUMENTED REVIEWS '+dept.reviewed+' · HARM INCIDENTS '+
    dept.harmResponses));
   record.append(node('p','campaign-note',
    'RECORDED SURRENDERS '+dept.surrenders+
    ' · SUPPLEMENTAL OPERATING SUPPORT '+dept.operatingSupport+' CR'));
   if(dept.recognitions.length)record.append(node('p','campaign-note',
    'SERVICE RECOGNITIONS · '+dept.recognitions.join(' · ')));
   if(!c.dispatchDepartment)record.append(node('p','campaign-note',
    'PRE-D11 DISPATCH SAVE · service tracking begins after the next resolved operation.'));
   record.append(node('p','campaign-note',
    'Standing reflects operational results, not a legal finding. '+
    'Unreviewed incidents are not counted as civilian-harm-free.'));
   serviceRecord=record;
  }
  main.append(grid);
  const chronicle=node('section','campaign-section campaign-chronicle');
  chronicle.append(node('h2','','UNIT CHRONICLE'));
  if(c.history.length===0)chronicle.append(node('p','campaign-note',
   'Your unit history will appear here after its first operation.'));
  const recentReports=c.history.slice(-8).reverse();
  const operationBoard=node('div','campaign-operation-board');
  const renderOperation=(report:(typeof c.history)[number])=>{
   const contract=c.contracts.find(k=>k.id===report.contractId);
   const incident=historicalDispatchIncident(c,report);
   const fallback=isDispatchPilot(c)?
    'UNCLASSIFIED DISPATCH OPERATION · '+report.contractId.toUpperCase():'Operation';
   const article=node('article','campaign-operation-record');
   const heading=node('div','campaign-operation-record-heading');
   const identity=node('div','campaign-operation-record-identity');
   identity.append(node('small','','DAY '+report.day),
    node('strong','',incident?.title??(contract?
     campaignIncidentView(c,contract).title:fallback)));
   heading.append(identity,node('span','campaign-operation-outcome',report.outcome.toUpperCase()));
   article.append(heading);
   const facts=node('div','campaign-operation-facts');
   facts.append(node('span','','GRADE '+report.grade),
    node('span','',report.participatingIds.length+' OPERATORS'));
   article.append(facts);
   // Technical references and after-action evidence remain accessible
   // without forcing eight separate expanded report bodies into the log.
   const recordDetail=node('details','campaign-operation-detail');
   recordDetail.dataset.campaignDetail='operation:'+report.id;
   const recordSummary=node('summary','','OPERATION DETAILS');
   recordSummary.setAttribute('aria-label',
    'Operation details: '+(incident?.title??(contract?
     campaignIncidentView(c,contract).title:fallback))+' · DAY '+report.day);
   recordDetail.append(recordSummary);
   const involved=report.participatingIds.map(id=>
    c.operators.find(o=>o.id===id)?.callsign??id);
   recordDetail.append(node('p','campaign-operation-participants',
    'PARTICIPATING · '+(involved.join(' · ')||'NONE RECORDED')));
   if(incident)recordDetail.append(node('small','campaign-operation-reference',incident.reference));
   if(incident&&(report.dispatchForce||report.dispatchCareer)){
    const detail=node('details','campaign-operation-evidence');
    detail.append(node('summary','','AFTER-ACTION RECORD'));
    if(report.dispatchForce)detail.append(node('p','campaign-note',
     (report.dispatchForce.blueCivilianInjured+report.dispatchForce.blueCivilianDown>0?
      'CIVILIAN HARM RECORDED':'NO SQUAD CIVILIAN HARM RECORDED')+
      ' · '+report.dispatchForce.surrenders+' SURRENDERS'));
    if(report.dispatchCareer)detail.append(node('p','campaign-note',
     'STANDING '+(report.dispatchCareer.standingDelta>0?'+':'')+
     report.dispatchCareer.standingDelta+' → '+report.dispatchCareer.standingAfter+
     ' · SUPPORT +'+report.dispatchCareer.operatingSupport+' CR'));
    recordDetail.append(detail);
   }
   article.append(recordDetail);
   return article;
  };
  for(const report of recentReports)operationBoard.append(renderOperation(report));
  if(recentReports.length){
   chronicle.append(node('p','campaign-operation-count',
    'LATEST '+recentReports.length+' OF '+c.history.length+' RECORDED OPERATION'+
    (c.history.length===1?'':'S')),operationBoard);
  }
  if(c.history.length>recentReports.length){
   const older=node('details','campaign-operation-more');
   older.dataset.campaignDetail='more-history';
   older.append(node('summary','',
    'VIEW '+(c.history.length-recentReports.length)+' EARLIER OPERATION'+
    (c.history.length-recentReports.length===1?'':'S')));
   const olderBoard=node('div','campaign-operation-board');
   older.append(olderBoard);
   // Build older cards only when requested. Large campaigns keep a light first view.
   older.addEventListener('toggle',()=>{
    if(!older.open||olderBoard.childElementCount)return;
    for(const report of c.history.slice(0,-8).reverse())
     olderBoard.append(renderOperation(report));
   });
   chronicle.append(older);
  }
  if(isDispatchPilot(c)){
   // Recent linked operations are optional, compact, and derived from real reports.
   const linked=c.contracts.filter(k=>k.followUpOf&&
    c.history.some(report=>report.contractId===k.id)).slice(-8).reverse();
   if(linked.length){
    const trail=node('details','campaign-case-history');
    trail.dataset.campaignDetail='related-cases';
    trail.append(node('summary','',
     'RELATED CASE HISTORY · '+linked.length+' RECENT OPERATION'+
     (linked.length===1?'':'S')));
    for(const operation of linked){
     const dossier=dispatchCaseDossier(c,operation);
     const report=c.history.find(row=>row.contractId===operation.id);
     const prior=dossier?.related.at(-1);
     trail.append(node('p','campaign-note',
      'DAY '+(report?.day??'?')+' · '+campaignIncidentView(c,operation).title+
      ' · '+(report?.outcome.toUpperCase()??'OUTCOME UNRECORDED')+
      ' · PRIOR: '+(prior?.title??'RECORD UNAVAILABLE')+
      ' ('+(prior?.outcome.toUpperCase()??'UNKNOWN')+')'));
    }
    chronicle.append(trail);
   }
   // A read-only comparison of reported leads and settled outcome evidence.
   // Closed by default: the primary eight-operation log stays compact.
   const closeouts=c.history.slice(-4).reverse()
    .map(report=>dispatchCaseCloseout(c,report))
    .filter((entry):entry is NonNullable<typeof entry>=>!!entry);
   if(closeouts.length){
    const notes=node('details','campaign-case-history');
    notes.dataset.campaignDetail='closeout-notes';
    notes.append(node('summary','',
     'OPERATION CLOSEOUT NOTES · '+closeouts.length+' RECENT'));
    for(const entry of closeouts){
     const item=node('div','campaign-case-closeout');
     item.append(node('strong','',
      'DAY '+entry.day+' · '+entry.title));
     item.append(node('p','campaign-note',
      'REPORTED / UNCONFIRMED · '+entry.reported));
     item.append(node('p','campaign-note',
      'RECORDED OUTCOME · '+entry.recorded));
     item.append(node('p','campaign-note',
      'FORCE EVIDENCE · '+entry.forceEvidence));
     item.append(node('p','campaign-note',
      'CASE RELATIONSHIP · '+entry.relationship));
     notes.append(item);
    }
    chronicle.append(notes);
   }
   const awarded=c.history.slice(-8).flatMap(h=>
    h.dispatchCareer?.recognitions.map(name=>({
     id:h.id,name,day:h.day
    }))??[]);
   for(const earned of awarded.slice(-3).reverse())
    chronicle.append(node('p','campaign-note',
     'DAY '+earned.day+' · UNIT RECOGNITION: '+earned.name));
  }
  const highlights=c.journal.filter(e=>
   ['wounded','first-deployment','first-success','objective','intel','down','distinction']
    .includes(e.kind)).slice(-6).reverse();
  if(highlights.length){
   const timeline=node('details','campaign-career-timeline');
   timeline.dataset.campaignDetail='personnel-milestones';
   timeline.append(node('summary','',
    'PERSONNEL MILESTONES · '+highlights.length+' RECENT · DAY '+highlights[0].day));
   const entries=node('div','campaign-career-events');
   for(const event of highlights){
    const person=c.operators.find(o=>o.id===event.operatorId);
    const item=node('article','campaign-career-event');
    item.dataset.kind=event.kind;
    const date=node('span','campaign-career-day','DAY '+event.day);
    const body=node('div','campaign-career-content');
    body.append(node('strong','',person?.callsign??event.operatorId),
     node('p','',event.detail));
    item.append(date,body);entries.append(item);
   }
   timeline.append(entries);chronicle.append(timeline);
  }
  const retirees=c.operators.filter(o=>
   o.status==='retired'||o.status==='lost');
  if(retirees.length){
   const archive=node('section','campaign-career-archive');
   archive.append(node('h3','','SERVICE ARCHIVE'));
   for(const operator of retirees){
    const record=node('article','campaign-archive-record');
    record.dataset.status=operator.status;
    const identity=node('div','campaign-archive-identity');
    identity.append(node('strong','',operator.callsign),
     node('span','',operator.status.toUpperCase()));
    const metrics=node('div','campaign-archive-metrics');
    metrics.append(node('span','',operator.missions+' DEPLOYMENTS'),
     node('span','',operator.successful+' SUCCESSES'));
    record.append(identity,metrics);archive.append(record);
   }
   chronicle.append(archive);
  }
  if(serviceRecord)chronicle.append(serviceRecord);
  grid.append(chronicle);
  const footer=node('div','campaign-footer');
  const utilities=node('details','campaign-overview-utilities');
  utilities.dataset.campaignDetail='save-utilities';
  utilities.append(node('summary','','SAVES & OTHER MODES'));
  const utilityContent=node('div','campaign-overview-utility-content');
  utilityContent.append(
   node('p','campaign-note','INTELLIGENCE · '+rules.intel.toUpperCase()+
    ' / MAP SCALE · '+rules.scale.toUpperCase()),
   button('EXPORT CAMPAIGN SAVE',this.handlers.exportSave),
   node('p','campaign-note','IMPORT CAMPAIGN SAVE'),
   this.importPicker(),
   button('QUICK PLAY (NO CAMPAIGN PROGRESS)',this.handlers.quickPlay));
  utilities.append(utilityContent);footer.append(utilities);
  const overview=node('section','campaign-section campaign-overview');
  overview.append(node('h2','','OPERATIONS DASHBOARD'));
  // The first viewport describes a decision instead of showing a lone button.
  const availableContracts=c.contracts.filter(k=>
   k.status==='available'&&k.deadline>=c.day);
  const leadCase=[...availableContracts].sort((a,b)=>
   a.deadline-b.deadline||a.id.localeCompare(b.id))[0];
  const nextCard=node('section','campaign-next-action');
  nextCard.append(node('div','campaign-next-action-eyebrow',
   accepted?'DEPLOYMENT IN PROGRESS':
    leadCase?'EARLIEST DEADLINE · '+availableContracts.length+' OPEN':'NO OPEN ASSIGNMENTS'));
  if(accepted){
   const current=campaignIncidentView(c,accepted);
   nextCard.append(node('h3','',current.title),
    node('p','campaign-note',
     accepted.region+' · Assignment accepted · Return to mission planning'));
  }else{
   nextCard.append(node('h3','',
    leadCase?campaignIncidentView(c,leadCase).title:'NO OPEN CONTRACTS'),
    node('p','campaign-note',leadCase?
     leadCase.region+' · '+leadCase.reward+' CR · DUE DAY '+leadCase.deadline:
     'No current assignments to accept. Review records or prepare the team.'));
  }
  const nextAction=accepted?
   button('CONTINUE DEPLOYMENT · '+campaignIncidentView(c,accepted).title.toUpperCase(),
    this.handlers.resumeContract,'campaign-primary'):
   availableContracts.length?
    button('BROWSE CONTRACTS · '+availableContracts.length+' AVAILABLE',
     ()=>activateTab('contracts'),'campaign-primary'):
    button('REVIEW SQUAD & READINESS',
     ()=>activateTab('personnel'),'campaign-primary');
  nextAction.classList.add('campaign-overview-primary-action');
  nextCard.append(nextAction);
  overview.append(nextCard);
  if(isDispatchPilot(c)){
   const identity=dispatchDepartmentView(c);
   const department=node('details','campaign-department-identity');
   department.dataset.campaignDetail='department-profile';
   department.append(node('summary','campaign-department-summary',
    'DEPARTMENT PROFILE · '+identity.standing+'/100 · '+identity.standingTier));
   department.append(node('div','campaign-department-eyebrow',
    'DISPATCH · '+identity.organization.toUpperCase()),
    node('h3','',identity.unit),
    node('p','campaign-note',
     identity.preset+' · '+identity.period+' REFERENCE · '+
     identity.scope+' · '+identity.access));
   const service=node('div','campaign-department-facts');
   for(const [label,value] of [
    ['STANDING',identity.standing+' / 100 · '+identity.standingTier],
    ['RESPONSES',String(identity.responses)],
    ['PROCUREMENT',identity.economy]
   ] as const){
    const entry=node('div','campaign-department-fact');
    entry.append(node('small','',label),node('strong','',value));
    service.append(entry);
   }
   department.append(service);
   const progress=node('div','campaign-department-chapter');
   progress.append(node('strong','',identity.chapterLabel),
    node('p','campaign-note',identity.chapterDetail));
   if(identity.chapterGoal!==null){
    const meter=node('progress','');
    meter.max=identity.chapterGoal;meter.value=identity.chapterProgress;
    meter.setAttribute('aria-label','Completed responses toward the 2015 chapter');
    progress.append(meter,node('small','',
     identity.chapterProgress+' / '+identity.chapterGoal+' COMPLETED RESPONSES'));
   }else if(identity.chapterJustUnlocked){
    progress.append(node('small','','CHAPTER MILESTONE REACHED'));
   }
   department.append(progress);
   overview.append(department);
  }
  const stats=node('div','campaign-overview-stats');
  const available=c.operators.filter(o=>
   (o.status==='available'||o.status==='reserve')&&o.recoveryDays===0).length;
  for(const [value,label] of [
   [String(available),'READY'],[String(c.squadIds.length),'ASSIGNED'],
   [String(c.contracts.filter(k=>k.status==='available'&&k.deadline>=c.day).length),'CONTRACTS']
  ]){
   const stat=node('div','campaign-stat');
   stat.append(node('strong','',value),node('span','',label));stats.append(stat);
  }
  overview.append(stats);
  const suppliesSummary=node('p','campaign-note',
   'SUPPLIES · '+c.supplies.ammo+' ROUNDS · '+c.supplies.medical+
   ' MEDICAL KITS · '+c.supplies.flash+' FLASHBANGS');
  overview.append(suppliesSummary);
  const readiness=node('div','campaign-readiness');
  readiness.append(node('h2','','DEPLOYMENT READINESS'));
  const assigned=c.operators.filter(o=>c.squadIds.includes(o.id));
  const recovering=assigned.filter(o=>o.recoveryDays>0);
  // Callsigns are shown in Squad; keep the home readiness view actionable.
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
    activateTab(check.action)
   },'campaign-readiness-warning');
   readiness.append(item);
  }
  if(!checks.some(check=>check.attention)){
   readiness.append(node('p','campaign-readiness-ok',
    'SQUAD ASSIGNED · BASE RESERVES AVAILABLE'));
  }
  overview.append(readiness);
  const shortcuts=node('div','campaign-overview-actions');
  for(const [tab,label] of [
   ['personnel','MANAGE PERSONNEL'],
   ['logistics','SUPPLIES & ARMORY']
  ] as const){
   shortcuts.append(button(label,()=>{
    activateTab(tab)
   }));
  }
  // Keep action and readiness together in both DOM order and screen layout.
  // Supplementary status, shortcuts and department details form a separate area.
  const workspace=node('div','campaign-overview-workspace');
  const priority=node('div','campaign-overview-priority');
  const support=node('div','campaign-overview-support');
  priority.append(nextCard,readiness);
  support.append(stats,suppliesSummary,shortcuts);
  const department=overview.querySelector<HTMLElement>('.campaign-department-identity');
  if(department)support.append(department);
  workspace.append(priority,support);
  overview.append(workspace,footer);
  grid.append(overview,logistics);
  const sections={
   overview,personnel,contracts:jobs,logistics,chronicle
  } as const;
  if(this.preparationContractId){
   const pending=c.contracts.find(k=>k.id===this.preparationContractId&&
    k.status==='available'&&k.deadline>=c.day);
   if(pending){
    for(const section of [personnel,logistics]){
     const returnBanner=node('div','campaign-preparation-return');
     const returnButton=button(
      'RETURN TO CASE · '+campaignIncidentView(c,pending).title,
      ()=>{
       this.preparationContractId=null;
       this.homeTab='contracts';
       this.home(c);
       this.root.scrollTop=0;
       this.reviewContract(pending,c);
      },'campaign-primary');
     returnBanner.append(returnButton);
     section.insertBefore(returnBanner,section.firstChild);
    }
   }else this.preparationContractId=null;
  }
  const nav=node('nav','campaign-tabs');
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Operations Room sections');
  const tabOrder=['overview','personnel','contracts','logistics','chronicle'] as const;
  // Keep the five already-built sections alive while changing only visibility.
  // This avoids rebuilding every roster, contract and logistics control per tap.
  const activateTab=(tab:typeof tabOrder[number])=>{
   if(this.homeTab===tab)return;
   this.homeTab=tab;
   for(const [id,panel] of Object.entries(sections))
    panel.hidden=id!==tab;
   for(const trigger of nav.querySelectorAll<HTMLButtonElement>('.campaign-tab')){
    const selected=trigger.id==='campaign-tab-'+tab;
    trigger.setAttribute('aria-selected',String(selected));
    trigger.tabIndex=selected?0:-1;
   }
   this.root.scrollTop=0;
  };
  nav.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const tabs=Array.from(nav.querySelectorAll<HTMLButtonElement>('.campaign-tab'));
   const current=tabs.indexOf(document.activeElement as HTMLButtonElement);
   if(current<0)return;
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
    (current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   event.preventDefault();
   tabs[next].focus({preventScroll:true});
   tabs[next].click();
  });
  // Counts come from the same campaign snapshot as the visible panel.
  // They are navigation hints, not a second contract/record source of truth.
  const openCaseCount=c.contracts.filter(k=>
   k.status==='available'&&k.deadline>=c.day).length;
  const recordedOperationCount=c.history.length;
  for(const [tab,label,accessible] of [
   ['overview','Ops','Overview'],['personnel','Squad','Personnel'],
   ['contracts','Cases','Contracts'],['logistics','Supply','Logistics'],
   ['chronicle','Records','Chronicle']
  ] as const){
   const panel=sections[tab];
   panel.id='campaign-panel-'+tab;panel.setAttribute('role','tabpanel');
   panel.hidden=this.homeTab!==tab;
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
   trigger.setAttribute('aria-selected',String(this.homeTab===tab));
   trigger.setAttribute('aria-controls',panel.id);
   // One tab is in the sequential Tab order; arrows move between the others.
   trigger.tabIndex=this.homeTab===tab?0:-1;
   panel.setAttribute('aria-labelledby',trigger.id);
   nav.append(trigger);
  }
  main.insertBefore(nav,grid);
  this.root.append(main);
  // The same disclosure identities survive in-place rerenders. Native details
  // keep their own keyboard behavior; re-open only items the user had expanded.
  for(const detail of this.root.querySelectorAll<HTMLDetailsElement>(
   'details[data-campaign-detail]')){
   detail.open=openWorkspaceDetails.has(detail.dataset.campaignDetail??'');
  }
  if(restoreScroll>0)this.root.scrollTop=restoreScroll;
  // Purchases, treatment and assignments rebuild this view. Return keyboard
  // focus to the same named control without jumping the saved scroll position.
  if(focusedLabel){
   const restored=Array.from(this.root.querySelectorAll<HTMLElement>('[aria-label]'))
    .find(control=>control.getAttribute('aria-label')===focusedLabel&&
     !control.matches(':disabled'));
   (restored??nav.querySelector<HTMLElement>('[aria-selected="true"]'))
    ?.focus({preventScroll:true});
  }
 }
 private armory(c:CampaignState,id:string){
  const sameOperator=this.lastArmoryRenderedId===id;
  const restoreScroll=sameOperator?this.root.scrollTop:0;
  const previousFocus=this.root.contains(document.activeElement)?
    document.activeElement?.getAttribute('aria-label'):null;
  // The same operator keeps one preview renderer while HTML controls refresh.
  const retainOperatorPreview=sameOperator&&!this.weaponView&&!!this.preview?.isReady();
  if(!retainOperatorPreview)this.disposePreview();
  if(!sameOperator){this.activeKitGroup='weapon';this.selectedWorkbenchSocket=null;}
  this.lastArmoryRenderedId=id;
  const person=c.operators.find(o=>o.id===id);
  if(!person){this.armoryOperatorId=null;this.home(c);return;}
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell campaign-wide campaign-armory-screen');
  const top=node('div','campaign-head campaign-armory-head');
  const identity=node('div');
  identity.append(node('div','campaign-eyebrow','PERSONNEL / FIELD ARMORY'),
   node('h1','',person.callsign+' / EQUIPMENT'));
  top.append(button('← OPERATIONS',()=>{
   this.armoryOperatorId=null;this.home(c);
  },'campaign-armory-back'),identity);
  main.append(top);
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
  const viewToggle=button(this.weaponView?'RETURN TO OPERATOR':'INSPECT WEAPON MODEL',()=>{
   this.weaponView=!this.weaponView;this.armory(c,id);
  });
  summary.append(preview,node('p','campaign-note campaign-preview-hint',
   this.weaponView?'DRAG TO ROTATE · TAP A MOUNT TO SELECT ITS SLOT':'DRAG THE SOLDIER TO ROTATE'));
  const identityActions=node('div','campaign-kit-actions');
  const rename=button('EDIT CALLSIGN',async()=>{
   const name=await promptFieldworkText({
    title:'Edit operator callsign',label:'CALLSIGN',value:person.callsign,
    maxLength:24,confirmLabel:'SAVE CALLSIGN'
   });
   if(name!==null&&name!==person.callsign)this.handlers.renameOperator(id,name);
  });
  const appearance=button('APPEARANCE · OPEN STUDIO',()=>this.handlers.openStudio(id));
  rename.disabled=!!c.activeContractId;
  appearance.disabled=!!c.activeContractId;
  const arsenal=button('OPEN ARSENAL · FULL WORKBENCH',
   ()=>this.handlers.openArsenal(id),'campaign-primary campaign-kit-arsenal-launch');
  arsenal.disabled=!!c.activeContractId||!person.weaponConfiguration.build||
   (isDispatchPilot(c)&&effectiveDispatchSetup(c).equipmentScope!=='global');
  if(arsenal.disabled)arsenal.title='Arsenal restricted for this campaign or deployment';
  identityActions.append(rename,appearance);summary.append(identityActions);
  const maximum=initialArmorIntegrity(person.loadout);
  const repairCost=armorRepairCost(person);
  const firearm=c.inventory.serializedWeapons?.find(w=>w.id===person.weaponSerialId);
  const serviceCost=firearm?weaponServiceCost(firearm):0;
  const stats=node('div','campaign-kit-at-a-glance');
  for(const [name,value] of [
   ['LOAD',totalEquipmentMass(person.loadout,person.weaponConfiguration).toFixed(2)+' KG'],
   ['MOBILITY',Math.round(loadMovementScale(person.loadout,person.weaponConfiguration)*100)+'%'],
   ['ARMOR',person.armorCondition.torso+'/'+maximum.torso],
   ['HELMET',person.armorCondition.head+'/'+maximum.head],
   ['AMMO',person.magazine+' + '+person.reserve]
  ]){
   const metric=node('div','campaign-kit-stat');
   metric.append(node('small','',name),node('strong','',value));stats.append(metric);
  }
  summary.append(stats);
  const maintenance=node('div','campaign-kit-maintenance');
  if(repairCost>0){
   const repair=button('REPAIR PROTECTION · '+repairCost+' CR',
    ()=>this.handlers.repairArmor(person.id));
   repair.disabled=!!c.activeContractId||c.funds<repairCost;
   if(repair.disabled)repair.title=c.activeContractId?
    'Locked during deployment':'Insufficient credits';
   maintenance.append(repair);
  }
  if(firearm&&serviceCost>0){
   const service=button('SERVICE WEAPON · '+serviceCost+' CR',
    ()=>this.handlers.serviceWeapon(person.id));
   service.disabled=!!c.activeContractId||c.funds<serviceCost;
   if(service.disabled)service.title=c.activeContractId?
    'Locked during deployment':'Insufficient credits';
   maintenance.append(service);
  }
  if(maintenance.childElementCount)summary.append(maintenance);
  const readiness=node('details','campaign-readiness-details');
  readiness.append(node('summary','','SERVICE RECORD & DETAILED READINESS'));
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
  if(firearm){
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
  readiness.append(node('p','campaign-kit-metrics',
   'ARMOR · '+person.armorCondition.torso+'/'+maximum.torso+
   '     HELMET · '+person.armorCondition.head+'/'+maximum.head));
  const capacity=kitMedicalSupplies(person.loadout);
  readiness.append(node('p','campaign-kit-metrics',
   'FIELD MEDICAL · '+medicalSupplyCount(person.medicalSupplies)+' / '+
    medicalSupplyCount(capacity)+' · HQ RESERVE '+c.supplies.medical));
  readiness.append(node('p','campaign-kit-metrics',
   'WEAPON CONFIG · '+Object.values(person.weaponConfiguration.slots)
    .map(v=>v.replace(/^[^-]+-/,'')).join(' / ')));
  summary.append(readiness);
  grid.append(summary);
  const editor=node('section','campaign-section campaign-kit-editor');
  const locked=!!c.activeContractId;
  const dispatchPilot=isDispatchPilot(c)&&
   effectiveDispatchSetup(c).equipmentScope!=='global';
  if(dispatchPilot)editor.append(node('p','campaign-note campaign-kit-access',
   'DISPATCH PILOT · CURATED EQUIPMENT ACCESS'));
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
   option.value=preset.id;
   if(dispatchPilot&&!canApplyCampaignKitPreset(c,id,preset.id))option.disabled=true;
   picker.append(option);
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
  load.disabled=locked||c.kitPresets.length===0||
   (dispatchPilot&&!c.kitPresets.some(p=>canApplyCampaignKitPreset(c,id,p.id)));
  picker.addEventListener('change',()=>{
   load.disabled=locked||!picker.value||!canApplyCampaignKitPreset(c,id,picker.value);
  });
  remove.disabled=locked||c.kitPresets.length===0;
  presetActions.append(picker,load,remove);
  presets.append(presetActions,node('p','campaign-note',
   dispatchPilot?'Dispatch validates every saved kit item and prevents unsupported weapon changes. Existing inventory is preserved.':
   'Presets save a configuration, not copies of purchased equipment. Applying one requires an available primary weapon.'));
  editor.append(node('h2','','EQUIPMENT'));
  if(locked)editor.append(node('p','campaign-note','ACTIVE DEPLOYMENT · KIT CHANGES LOCKED'));
  const categoryBar=node('div','campaign-kit-categories');
  categoryBar.setAttribute('role','tablist');
  categoryBar.setAttribute('aria-label','Equipment categories');
  const categoryTabs=new Map<QuickLoadoutGroup,HTMLButtonElement>();
  const setCategory=(group:QuickLoadoutGroup)=>{
   this.activeKitGroup=group;
   const focus:Record<QuickLoadoutGroup,EquipmentPreviewFocus>={
    weapon:'weapon',protection:'torso',carry:'carry',
    utilities:'carry',issued:'full'
   };
   this.preview?.focusOn(focus[group]);
   for(const [key,control] of categoryTabs){
    control.setAttribute('aria-selected',String(key===group));
    control.tabIndex=key===group?0:-1;
   }
  };
  const grouped=buildQuickLoadoutGroups(editor,this.activeKitGroup,setCategory);
  for(const definition of QUICK_LOADOUT_GROUPS){
   const group=definition.id;
   const select=button(definition.title,()=>{
    grouped.group[group].open=true;
    setCategory(group);
   },'campaign-kit-category');
   select.setAttribute('role','tab');
   select.setAttribute('aria-controls','campaign-kit-section-'+group);
   select.setAttribute('aria-selected',String(group===this.activeKitGroup));
   select.tabIndex=group===this.activeKitGroup?0:-1;
   grouped.group[group].id='campaign-kit-section-'+group;
   grouped.group[group].setAttribute('role','tabpanel');
   grouped.group[group].setAttribute('aria-label',definition.title+' equipment');
   categoryTabs.set(group,select);categoryBar.append(select);
  }
  categoryBar.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const keys=QUICK_LOADOUT_GROUPS.map(g=>g.id);
   const index=keys.indexOf(this.activeKitGroup);
   const next=event.key==='Home'?0:event.key==='End'?keys.length-1:
    (index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
   event.preventDefault();categoryTabs.get(keys[next])?.click();
   categoryTabs.get(keys[next])?.focus({preventScroll:true});
  });
  editor.insertBefore(categoryBar,grouped.group.weapon);
  for(const slot of LOADOUT_SLOTS){
   const row=node('div','campaign-kit-row');
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
       ((weapon==='smg'||weapon==='shotgun')&&weapon!==person.weapon&&
        !isDispatchPilot(c))||
       (dispatchPilot&&weapon!==person.weapon&&
        !mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary'));
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
     option.value=item.id;
     if(dispatchPilot&&item.id!==person.loadout.slots[slot]&&
       !mayChooseCampaignContent(c,'equipment',item.id,slot))option.disabled=true;
     select.append(option);
    }
    select.value=person.loadout.slots[slot];
    select.addEventListener('change',()=>this.handlers.equipGear(
     id,slot,select.value));
   }
   select.disabled=locked;
   select.classList.add('campaign-kit-native-select');
   const picker=createCampaignGearPicker(select,slot.replace(/-/g,' '));
   picker.addEventListener('click',()=>{
    const focus:EquipmentPreviewFocus=slot==='head'?'head':
     slot==='armor'?'torso':slot==='primary'?'weapon':
     slot==='rig'||slot==='belt'||slot==='backpack'?'carry':'full';
    this.preview?.focusOn(focus);
   });
   row.append(title,select,picker);
   const selected=itemDefinition(person.loadout.slots[slot]);
   const info=node('small','campaign-kit-description',selected?.description??'');
   const wrap=node('div','campaign-kit-choice');
   wrap.append(row,info);
   grouped.field(loadoutGroupForSlot(slot)).append(wrap);
  }
  const workbenchEntry=node('section','campaign-kit-workbench-entry');
  workbenchEntry.append(node('strong','','MODULAR WEAPON WORKBENCH'));
  workbenchEntry.append(node('p','campaign-note',arsenal.disabled?
   locked?'Finish the active deployment to edit your weapon.':
   dispatchPilot?'Advanced weapon editing is restricted in this Dispatch campaign.':
   'This issued weapon does not have a modular workbench.':
   'Inspect the weapon and change compatible parts in the dedicated Arsenal.'));
  workbenchEntry.append(arsenal);
  grouped.field('weapon').append(workbenchEntry);
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
  legacyControls.append(node('summary','','LEGACY WEAPON CONTROLS · TROUBLESHOOTING'),
   node('p','campaign-note',
    'Direct configuration remains available for unsupported weapons. Use the dedicated Arsenal for modular builds.'),
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
    if(dispatchPilot&&!mayChooseCampaignContent(c,'weapon-preset',preset.id))
     return 'Not offered by Dispatch pilot';
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
     if(part.slot!==slot)continue;
      if(part.id==='fnc-mag30'&&build.parts[slot]!=='fnc-mag30')continue;
      if(part.family!==build.family&&!(slot==='magazine'&&
       build.family==='fnc'&&part.family==='ar'))continue;
     const receiverId=slot==='receiver'?part.id:build.parts.receiver;
     if(!compatibleFamilyPart(receiverId,slot,part.id,person.weapon,
       barrelLength))continue;
     const option=node('option','',part.name);
     option.value=part.id;select.append(option);
    }
    select.value=build.parts[slot];select.disabled=locked||dispatchPilot;
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
   select.value=current;select.disabled=locked||dispatchPilot;
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
  editor.append(presets);
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
   if(retainOperatorPreview&&this.preview){
    this.preview.attachHost(preview);
    this.preview.updateEquipment(person.weapon,person.appearanceSeed,person.loadout,
     person.weaponConfiguration,person.magazines,person.wardrobe);
   }else{
    this.preview=new CampaignKitPreview(preview,person.id,person.weapon,
     person.appearanceSeed,person.loadout,person.weaponConfiguration,
     person.magazines,person.wardrobe);
    const azimuth=this.operatorViewAngles.get(id);
    if(azimuth!==undefined)this.preview.setAzimuth(azimuth);
   }
  }
  this.root.scrollTop=restoreScroll;
  if(previousFocus){
   const restored=Array.from(this.root.querySelectorAll<HTMLElement>('[aria-label]'))
    .find(el=>el.getAttribute('aria-label')===previousFocus);
   restored?.focus({preventScroll:true});
  }
 }
 private importPicker(slot:CampaignSlot=this.currentSlot){
  const input=node('input','campaign-import');
  input.type='file';input.accept='.json,application/json';
  input.setAttribute('aria-label','Import '+slot+' campaign JSON save');
  input.addEventListener('change',()=>{
   const file=input.files?.[0];
   if(!file)return;
   void file.text().then(raw=>this.handlers.importSave(raw,slot))
    .catch(()=>{void showFieldworkNotice('Import failed',
     'Could not read the selected campaign save file.');});
  });
  return input;
 }
 private contract(c:Contract,campaign:CampaignState){
  const view=campaignIncidentView(campaign,c);
  const dossier=dispatchCaseDossier(campaign,c);
  const card=node('article','campaign-contract');
  const head=node('div','campaign-contract-head');
  const identity=node('div','campaign-contract-identity');
  identity.append(node('strong','',view.title));
  // Technical case references are discoverable under CASE INFORMATION.
  const risk=node('span','campaign-contract-risk',
   ['','LOW','MODERATE','HIGH'][c.risk]+' RISK');
  risk.dataset.level=String(c.risk);
  head.append(identity,risk);card.append(head);
  const location=node('div','campaign-contract-location',c.region);
  card.append(location);
  // Keep contract choice concise. The actionable comparison facts remain
  // visible; technical reference, incident text and prior-response specifics
  // are available without committing to a briefing.
  if(c.followUpOf)card.append(node('div','campaign-contract-related',
   dossier?.relatedLabel??'FOLLOW-UP OPERATION'));
  const intelligence=node('details','campaign-contract-intelligence');
  intelligence.dataset.campaignDetail='case:'+c.id;
  const caseSummary=node('summary','','CASE INFORMATION');
  caseSummary.setAttribute('aria-label','Case information: '+view.title+' · '+c.region);
  intelligence.append(caseSummary);
  if(isDispatchPilot(campaign)){
   intelligence.append(node('small','campaign-contract-reference',view.reference));
   if(c.dispatchCase)intelligence.append(node('p','campaign-contract-emphasis',
    c.dispatchCase.archetype.replace(/-/g,' ').toUpperCase()));
  }
  if(dossier)intelligence.append(node('p','campaign-contract-emphasis',
   dossier.situation.emphasis+' · '+dossier.situation.siteScale));
  if(c.followUpOf){
   const last=dossier?.related.at(-1);
   if(last&&last.outcome!=='unknown')
    intelligence.append(node('p','campaign-contract-prior',
     'PRIOR RESPONSE · '+last.title+' · '+last.outcome.toUpperCase()));
  }
  intelligence.append(node('p','campaign-contract-description',view.description));
  card.append(intelligence);
  const terms=node('div','campaign-contract-terms');
  const reward=node('div','campaign-contract-term');
  reward.append(node('small','','REWARD'),node('strong','',c.reward+' CR'));
  const deadline=node('div','campaign-contract-term');
  const daysLeft=Math.max(0,c.deadline-campaign.day);
  const dueLabel=daysLeft===0?'DUE TODAY':
   daysLeft===1?'1 DAY LEFT':daysLeft+' DAYS LEFT';
  const due=node('small','campaign-contract-due'+
   (daysLeft<=1?' is-urgent':''),dueLabel);
  deadline.append(node('small','','DEADLINE'),node('strong','','DAY '+c.deadline),due);
  terms.append(reward,deadline);card.append(terms);
  card.append(button('REVIEW DEPLOYMENT',()=>this.reviewContract(c,campaign),
   'campaign-primary campaign-contract-review'));
  return card;
 }
 /** Review only information the contract already reveals. Acceptance is a separate action. */
 private reviewContract(contract:Contract,campaign:CampaignState){
  const view=campaignIncidentView(campaign,contract);
  const dossier=dispatchCaseDossier(campaign,contract);
  const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overlay=node('div','campaign-preflight-backdrop');
  const panel=node('section','campaign-preflight fw-sheet');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  const heading=node('h2','',view.title);
  heading.id='campaign-preflight-title';
  panel.setAttribute('aria-labelledby',heading.id);
  panel.append(node('div','campaign-eyebrow',view.category+' / PREDEPLOYMENT REVIEW'),heading);
  const info=node('div','campaign-preflight-fields');
  const primaryInfo=node('div','campaign-preflight-primary');
  const add=(label:string,value:string,primary=false)=>{
   const section=node('div','campaign-preflight-field');
   section.append(node('span','',label),node('p','',value));
   (primary?primaryInfo:info).append(section);
  };
  if(dossier){
   add('REPORTED LEAD · UNCONFIRMED',dossier.lead,true);
   add('TACTICAL OBJECTIVE',dossier.objective,true);
   add('ASSIGNMENT CONTEXT',dossier.context);
   add('OPERATIONAL EMPHASIS',
    dossier.situation.emphasis+' · '+dossier.situation.siteScale);
  }else add('OBJECTIVE',view.description,true);
  if(isDispatchPilot(campaign))add('CALL REFERENCE',view.reference);
  if(isDispatchPilot(campaign)&&contract.dispatchCase)
   add('PROPERTY TYPE',contract.dispatchCase.archetype.replace(/-/g,' ').toUpperCase());
  add('ASSIGNMENT',contract.kind.replace(/-/g,' ').toUpperCase());
  if(dossier){
   add('ASSIGNMENT TERMS',dossier.situation.due+' · '+contract.reward+' CR');
   add('RISK ASSESSMENT',dossier.situation.riskAssessment);
  }else{
   add('LOCATION',contract.region);
   add('RISK',['','LOW','MODERATE','HIGH'][contract.risk]);
   add('REWARD / DEADLINE',contract.reward+' CR · DAY '+contract.deadline);
  }
  add('INTELLIGENCE',dossier?.intelligence??{
   unknown:'Site layout and threats are unknown until discovered',
   scouted:'Exterior intelligence available; interior remains uncertain',
   'floor-plan':'Floor plan known; hostile positions remain unknown'
  }[contract.intel]);
  if(dossier){
   if(contract.followUpOf){
    add('RELATED RESPONSE HISTORY',dossier.related.length?
     dossier.related.map(row=>row.title+' · '+
      (row.outcome==='unknown'?'RECORD UNAVAILABLE':
       row.outcome==='unrecorded'?'OUTCOME UNRECORDED':
       row.outcome.toUpperCase()+(row.grade?' · '+row.grade:'')))
      .join(' / '):'Earlier link unavailable');
   }
   add('REPORTING LIMITS',dossier.uncertainty);
  }
  const caseFacts=node('div','campaign-preflight-keyfacts');
  for(const [label,value] of [
   ['AREA',contract.region],
   ['RISK',['','LOW','MODERATE','HIGH'][contract.risk]],
   ['REWARD',contract.reward+' CR'],
   ['DEADLINE','DAY '+contract.deadline]
  ] as const){
   const fact=node('div','campaign-preflight-keyfact');
   fact.append(node('small','',label),node('strong','',value));
   caseFacts.append(fact);
  }
  panel.append(primaryInfo,caseFacts);
  const extra=node('details','campaign-preflight-extra');
  extra.append(node('summary','','CASE INTELLIGENCE & TERMS'),info);
  panel.append(extra);
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
   const repairActions=node('div','campaign-preflight-fix-actions');
   const needsSquad=assigned.length<4||assigned.some(p=>p.recoveryDays>0);
   const needsSupply=campaign.supplies.ammo<60||campaign.supplies.medical===0;
   const fix=(tab:'personnel'|'logistics')=>{
    dismiss();
    this.preparationContractId=contract.id;
    this.homeTab=tab;
    this.home(campaign);
    // A targeted prep shortcut should land at the start of its new section.
    this.root.scrollTop=0;
   };
   if(needsSquad)repairActions.append(button('REVIEW SQUAD',()=>fix('personnel')));
   if(needsSupply)repairActions.append(button('CHECK LOGISTICS',()=>fix('logistics')));
   warnings.append(repairActions);
   // A warning must be seen before the full squad roster on a phone; retain
   // the existing squad details immediately afterwards for an informed choice.
   panel.insertBefore(warnings,roster);
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
   if(e.key==='Escape'){e.preventDefault();dismiss();return;}
   if(e.key!=='Tab')return;
   // The sheet may include case intelligence and squad/supply repair actions.
   // Trap the actual visible controls, not just Cancel and Deploy, so keyboard
   // navigation cannot escape a modal with extra interactive content.
   const focusable=Array.from(panel.querySelectorAll<HTMLElement>(
    'button:not(:disabled),summary,a[href],select:not(:disabled),[tabindex]:not([tabindex="-1"])'
   )).filter(el=>el.getClientRects().length>0);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(!first||!last)return;
   const active=document.activeElement;
   if(e.shiftKey&&(active===first||!panel.contains(active))){
    e.preventDefault();last.focus({preventScroll:true});
   }else if(!e.shiftKey&&(active===last||!panel.contains(active))){
    e.preventDefault();first.focus({preventScroll:true});
   }
  });
  actions.append(cancel,deploy);
  panel.append(actions);
  overlay.append(panel);
  document.body.append(overlay);
  cancel.focus({preventScroll:true});
 }
}
