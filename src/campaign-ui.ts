import {uiNode as node,uiButton as button} from './ui/dom-elements.ts';
/** Campaign screens. Render only on navigation and state changes, never per frame. */
import {SQUAD_IDENTIFICATION_COLORS,type CampaignState,type Contract}
 from './campaign-state.ts';
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
import {createOutfitterGallery} from './ui/campaign-outfitter-gallery.ts';
import {fieldworkSelect} from './ui/fieldwork-select.ts';
import './ui/campaign-outfitter-gallery.css';
import {attachCarryGearChangePreview} from './ui/carry-gear-change-controls.ts';
import {CarryKitUndoHistory,captureCarryUndo,type CarryUndoSnapshot} from './equipment-carry-undo.ts';
import {quoteCarryGearChange} from './equipment-carry-gear-change.ts';
import {quoteOneMagazineMove} from './equipment-magazine-transfer.ts';
import {quoteCarryLayoutCopy} from './equipment-carry-layout-copy.ts';
import type {CarryGearSlot} from './equipment-carry-gear-change.ts';
import {createFieldGadgetEditor} from './ui/field-gadget-editor.ts';
import {createLoadoutSquadRail} from './ui/loadout-squad-rail.ts';
import {fieldQuantity,initialFieldInventory,type FieldInventory} from './equipment-field-inventory.ts';
import {quoteCampaignSquadRefill,quoteCampaignOperatorRefill}
 from './equipment-campaign-squad-refill.ts';
import {FIELD_STOCK_PACKS,FIELD_STOCK_LIMIT}
 from './equipment-campaign-field-stock.ts';
import {FieldInventoryUndoHistory} from './equipment-field-undo.ts';
import {campaignIntelBalance,contractObjectiveIntel,campaignSquadPresent} from './campaign-state.ts';
import {projectOperationsSummary} from './ui/campaign/operations-summary.ts';
import './campaign-style.css';
import './ui/campaign-uxr-workspaces.css';
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
 reconContract:(id:string)=>void;
 buyAmmo:()=>void;buyMedical:()=>void;buyFlash:()=>void;
 buyWedges:()=>void;buyCuffs:()=>void;
 resupply:(id:string)=>void;resupplyMedical:(id:string)=>void;
 resupplySquad:()=>void;resupplyField:(id:string)=>void;
 treat:(id:string)=>void;
 recruit:()=>void;assignSlot:(slot:number,id:string)=>void;
 buyWeapon:(weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipWeapon:(id:string,weapon:'carbine'|'smg'|'rifle'|'shotgun')=>void;
 equipGear:(id:string,slot:LoadoutSlot,itemId:string)=>void;
 equipCarryGear:(id:string,slot:CarryGearSlot,itemId:string)=>void;
 undoCarryGear:(id:string,expected:CarryUndoSnapshot,before:CarryUndoSnapshot)=>void;
 equipFieldInventory:(id:string,inventory:FieldInventory)=>void;
 copyFieldInventory:(sourceId:string,targetId:string)=>void;
 copyCarryLayout:(sourceId:string,targetId:string)=>void;
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
 setOperatorColor:(id:string,color:string)=>void;
 cycleAppearance:(id:string)=>void;
 exportSave:()=>void;importSave:(raw:string,slot:CampaignSlot)=>void;retire:(id:string)=>void;
};
export class CampaignScreen{
 readonly root=node('section','campaign-screen');
 private readonly handlers:CampaignHandlers;
 private currentSlot:CampaignSlot='legacy';
 private lastEntry={legacy:false,sandbox:false,dispatch:false,active:'legacy' as CampaignSlot};
 private armoryOperatorId:string|null=null;
 private homeTab:'overview'|'personnel'|'contracts'|'logistics'|'chronicle'='overview';
 private selectedSquadOperatorId:string|null=null;
 private selectedCaseId:string|null=null;
 private selectedSupplyIndex=0;
 private selectedRecordId:string|null=null;
 /** Keeps the selected case available while preparing squad or supplies. */
 private preparationContractId:string|null=null;
 private preview:CampaignKitPreview|null=null;
 private outfitterGallery:ReturnType<typeof createOutfitterGallery>|null=null;
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
 /** Presentation-only armory workspace; no changes to authoritative kit. */
 private activeKitWorkspace:'equipment'|'physical'|'readiness'='equipment';
 private activeBenchSlot:LoadoutSlot='primary';
 private previewDocked=false;
 private showKitPresets=false;
 private readonly fieldUndo=new FieldInventoryUndoHistory();
 private readonly carryUndo=new CarryKitUndoHistory();
 /** Focus after authorized one-piece placement, never persisted. */
 private pendingKitFocusLabel:string|null=null;
 /** Snapshot of successfully rendered Campaign equipment; never a pending draft. */
 private lastRenderedKit:{
  operatorId:string;slots:Record<LoadoutSlot,string>;weapon:string;
  mass:number;mobility:number
 }|null=null;
 private readonly operatorViewAngles=new Map<string,number>();
 /** Persistent UI state across rerenders; not part of the loadout. */
 private readonly outfitterSelected=new Map<string,Map<string,string>>();
 private readonly outfitterScroll=new Map<string,Map<string,number>>();
 private inspectionWeaponVisible=true;
 /** Keep orbit/zoom only across small cosmetic swaps; refit a new core. */
 private readonly weaponWorkbenchViews=new Map<string,{
  core:string;view:WeaponWorkbenchViewState
 }>();
 private workbenchCore:string|null=null;
 private workbenchVisualKey:string|null=null;
 private disposeGallery(){
  this.outfitterGallery?.dispose();this.outfitterGallery=null;
 }
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
  this.workbench?.dispose();this.workbench=null;
  this.workbenchCore=null;this.workbenchVisualKey=null;}
 constructor(handlers:CampaignHandlers){
  this.handlers=handlers;
  this.root.setAttribute('aria-label','Fieldwork campaign');
  this.root.hidden=true;
  document.body.append(this.root);
 }
 hide(){this.disposeGallery();this.disposePreview();this.root.hidden=true;this.armoryOperatorId=null;}
 entry(hasSave:boolean,sandboxHasSave=false,active:CampaignSlot='legacy',dispatchHasSave=false,
  initialPane:'main'|'new'='main',
  savedCampaigns:Partial<Record<CampaignSlot,CampaignState|null>>={}){
  this.lastEntry={legacy:hasSave,sandbox:sandboxHasSave,dispatch:dispatchHasSave,active};
  this.armoryOperatorId=null;this.disposeGallery();this.disposePreview();
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
  this.disposeGallery();this.disposePreview();
  this.lastArmoryRenderedId=null;
  this.root.hidden=false;this.root.replaceChildren();
  // UXR-01 theme study: query-only visual trial, never a saved campaign setting.
  const trial=new URLSearchParams(window.location.search).get('uxTheme');
  this.root.dataset.fwTheme=trial==='cold'||trial==='ledger'?trial:'industrial';
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
  const slotList=node('div','campaign-assignment-slots campaign-uxr-squad-grid');
  const assignmentPicker=node('div','campaign-uxr-assignment-picker');
  assignmentPicker.hidden=true;
  const validOperators=c.operators.filter(p=>p.status!=='retired'&&p.status!=='lost');
  const selectedId=validOperators.find(p=>p.id===this.selectedSquadOperatorId)?.id
   ??validOperators.find(p=>c.squadIds.includes(p.id))?.id
   ??validOperators[0]?.id??'';
  this.selectedSquadOperatorId=selectedId||null;
  const selectOperator=(id:string)=>{
   this.selectedSquadOperatorId=id;
   for(const card of roster.querySelectorAll<HTMLElement>('.campaign-person')){
    const active=card.dataset.operatorId===id;
    card.hidden=!active;
    if(active){
     const details=card.querySelector<HTMLDetailsElement>('.campaign-person-expand');
     if(details)details.open=true;
    }
   }
   for(const tile of slotList.querySelectorAll<HTMLElement>('.campaign-uxr-slot'))
    tile.dataset.selected=String(tile.dataset.operatorId===id);
   for(const tile of reserveRail.querySelectorAll<HTMLElement>('.campaign-uxr-reserve'))
    tile.dataset.selected=String(tile.dataset.operatorId===id);
  };
  const showSlotPicker=(slot:number)=>{
   if(c.activeContractId)return;
   assignmentPicker.replaceChildren();
   assignmentPicker.hidden=false;
   const header=node('div','campaign-uxr-picker-heading');
   header.append(node('strong','','REPLACE SLOT 0'+(slot+1)),
    button('CLOSE',()=>{assignmentPicker.hidden=true;},'campaign-uxr-picker-close'));
   assignmentPicker.append(header);
   const options=node('div','campaign-uxr-picker-options');
   const candidates=[...validOperators].sort((a,b)=>
    Number(a.recoveryDays>0)-Number(b.recoveryDays>0)||
    a.callsign.localeCompare(b.callsign));
   for(const p of candidates){
    const state=p.recoveryDays>0?'RECOVERING · '+p.recoveryDays+' DAYS':
     c.squadIds.includes(p.id)?'CURRENTLY ASSIGNED':'READY';
    const choice=button(p.callsign+' · '+state,()=>{
     assignmentPicker.hidden=true;
     this.handlers.assignSlot(slot,p.id);
    },'campaign-uxr-picker-choice');
    choice.disabled=p.id===c.squadIds[slot];
    choice.setAttribute('aria-label','Assign '+p.callsign+' to slot '+(slot+1)+
     (p.recoveryDays>0?' · recovering':''));
    options.append(choice);
   }
   assignmentPicker.append(options);
  };
  for(let slot=0;slot<4;slot++){
   const operator=validOperators.find(p=>p.id===c.squadIds[slot]);
   const tile=node('div','campaign-uxr-slot');
   tile.dataset.operatorId=operator?.id??'';
   tile.dataset.selected=String(operator?.id===selectedId);
   const inspect=button('',()=>{
    if(operator)selectOperator(operator.id);
    else showSlotPicker(slot);
   },'campaign-uxr-slot-main');
   inspect.setAttribute('aria-label',operator?
    'Inspect '+operator.callsign+' · squad slot '+(slot+1):
    'Choose operator for empty squad slot '+(slot+1));
   const top=node('div','campaign-uxr-slot-top');
   top.append(node('span','','0'+(slot+1)),
    node('span',operator?.recoveryDays?'campaign-uxr-slot-recovering':'',
     !operator?'EMPTY':operator.recoveryDays?
      operator.recoveryDays+'D RECOVERY':'READY'));
   // Static, allocation-free silhouette until an existing cached rig
   // thumbnail is available; never create four live WebGL renderers.
   const avatar=node('div','campaign-uxr-slot-avatar');
   avatar.setAttribute('aria-hidden','true');
   if(operator){
    const paletteIndex=c.operators.findIndex(p=>p.id===operator.id);
    avatar.style.setProperty('--uxr-operator-color',operator.squadColor??
     SQUAD_IDENTIFICATION_COLORS[Math.max(0,paletteIndex)%SQUAD_IDENTIFICATION_COLORS.length]);
    avatar.append(node('span','campaign-uxr-silhouette-head'),
     node('span','campaign-uxr-silhouette-body'),
     node('span','campaign-uxr-silhouette-shoulder'));
   }else avatar.textContent='+';
   inspect.append(top,avatar,node('strong','',operator?.callsign??'UNASSIGNED'),
    node('small','',operator?operator.weapon.toUpperCase():'SELECT OPERATOR'));
   const change=button('CHANGE',()=>showSlotPicker(slot),'campaign-uxr-slot-change');
   change.disabled=!!c.activeContractId;
   change.setAttribute('aria-label','Change squad slot '+(slot+1));
   tile.append(inspect,change);slotList.append(tile);
  }
  deployment.append(slotList,assignmentPicker);
  personnelWorkspace.append(deployment);
  const rosterPanel=node('section','campaign-personnel-roster-panel');
  const activeOperators=c.operators.filter(p=>
   p.status!=='retired'&&p.status!=='lost').sort((a,b)=>{
    const ai=c.squadIds.indexOf(a.id),bi=c.squadIds.indexOf(b.id);
    return (ai<0?99:ai)-(bi<0?99:bi);
   });
  const rosterHeading=node('div','campaign-roster-heading');
  rosterHeading.append(node('h2','','OPERATOR DETAIL'),
   node('span','campaign-roster-count',
    activeOperators.length+' OPERATOR'+(activeOperators.length===1?'':'S')));
  rosterPanel.append(rosterHeading);
  const reserveRail=node('div','campaign-uxr-reserves');
  const reserves=activeOperators.filter(p=>!c.squadIds.includes(p.id));
  const reserveHeading=node('div','campaign-uxr-reserve-heading');
  reserveHeading.append(node('strong','','RESERVES'),
   node('span','',reserves.length+' AVAILABLE ON ROSTER'));
  reserveRail.append(reserveHeading);
  const reserveTiles=node('div','campaign-uxr-reserve-tiles');
  for(const p of reserves){
   const reserve=button('',()=>selectOperator(p.id),'campaign-uxr-reserve');
   reserve.dataset.operatorId=p.id;
   reserve.dataset.selected=String(p.id===selectedId);
   reserve.setAttribute('aria-label','Inspect reserve '+p.callsign+
    (p.recoveryDays?' · recovering '+p.recoveryDays+' days':' · ready'));
   reserve.append(node('span','campaign-uxr-reserve-avatar',p.callsign.slice(0,2).toUpperCase()),
    node('strong','',p.callsign),
    node('small','',p.recoveryDays?p.recoveryDays+'D RECOVERY':'READY'));
   reserveTiles.append(reserve);
  }
  reserveRail.append(reserveTiles);
  rosterPanel.append(reserveRail);
  const roster=node('div','campaign-roster campaign-uxr-inspector');
  if(!activeOperators.length)roster.append(node('p','campaign-note',
   'No active operators. Recruit personnel to prepare your next deployment.'));
  for(const p of activeOperators){
   const card=node('article','campaign-person');
   card.dataset.operatorId=p.id;
   card.hidden=p.id!==selectedId;
   const tools=node('details','campaign-person-expand');
   tools.open=this.expandedOperatorTools.has(p.id)||p.id===selectedId;
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
   const refill=quoteCampaignOperatorRefill(c,p.id);
   const resupply=button('REFILL '+(refill?.roundsIssued??0)+' ROUNDS · '+
     (refill?.roundsWanted??0)+' NEEDED',()=>this.handlers.resupply(p.id));
   resupply.setAttribute('aria-label','Resupply ammunition for '+p.callsign);
   resupply.disabled=!!c.activeContractId||!refill?.roundsIssued;
   if(resupply.disabled)resupply.title=c.activeContractId?
    'Finish the current deployment before resupplying':
    refill?.roundsWanted===0?'Ammunition already full':
    'Insufficient ammunition in Logistics';
   careActions.append(resupply);
   const med=kitMedicalSupplies(p.loadout);
   const replenish=button('MEDICAL '+medicalSupplyCount(p.medicalSupplies)+
    '/'+medicalSupplyCount(med)+' · '+(refill?.medicalIssued??0)+
    ' HQ PACK',
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
  // UXR-06: five resource selectors, only one purchasing decision shown.
  const squadQuote=quoteCampaignSquadRefill(c);
  const stock=node('div','campaign-logistics-stats campaign-uxr-stock');
  const stockButtons:HTMLButtonElement[]=[];
  let selectStock:(index:number)=>void;
  const supplyFacts=[
   [c.supplies.ammo,'ROUNDS'],
   [c.supplies.medical,'MEDICAL KITS'],
   [c.supplies.flash,'FLASHBANGS'],
   [c.supplies.wedges,'DOOR WEDGES']
  ] as const;
  for(let i=0;i<supplyFacts.length;i++){
   const [count,label]=supplyFacts[i];
   const fact=button('',()=>selectStock(i),'campaign-logistics-stat campaign-uxr-stock-button');
   const needed=label==='ROUNDS'?squadQuote.roundsWanted:
    label==='MEDICAL KITS'?squadQuote.medicalWanted:
    label==='DOOR WEDGES'?squadQuote.wedgesWanted:0;
   if(needed>count)fact.classList.add('is-low');
   fact.setAttribute('aria-label','Select '+label+' · '+count+' in HQ stock');
   fact.append(node('strong','',String(count)),node('span','',label));
   stockButtons.push(fact);stock.append(fact);
  }
  supplyPanel.append(stock);
  const squadReplenish=node('section','campaign-squad-refill');
  squadReplenish.append(node('h3','','SQUAD REFILL · LIVE HQ STOCK'));
  const refillSummary=node('p','campaign-squad-refill-summary',
   squadQuote.roundsIssued+' / '+squadQuote.roundsWanted+' ROUNDS · '+
   squadQuote.medicalIssued+' / '+squadQuote.medicalWanted+' MEDICAL PACKS · '+
   squadQuote.wedgesIssued+' / '+squadQuote.wedgesWanted+' WEDGES'+
   (squadQuote.partial?' · PARTIAL / CARRY LIMITED':''));
  squadReplenish.append(refillSummary);
  const rows=node('div','campaign-squad-refill-lines');
  for(const line of squadQuote.lines){
   const chip=node('div','campaign-squad-refill-line');
   chip.append(node('strong','',line.name.toUpperCase()),
    node('span','',
     line.roundsIssued+' / '+line.roundsWanted+' RDS · '+
     line.medicalIssued+' / '+line.medicalWanted+' MED PACKS · '+
     line.wedgesIssued+' / '+line.wedgesWanted+' WEDGES'+
     (line.roundsShort?' · '+line.roundsShort+' RDS SHORT':'')+
     (line.blockedByCarry?' · NOT ENOUGH CARRY SPACE':'')));
   rows.append(chip);
  }
  const refillBreakdown=node('details','campaign-uxr-refill-breakdown');
  refillBreakdown.dataset.campaignDetail='refill-breakdown';
  refillBreakdown.append(node('summary','','OPERATOR ALLOCATION DETAILS'),rows);
  squadReplenish.append(refillBreakdown);
  const squadRefill=button('ISSUE SUPPLIES · '+
   squadQuote.cost.ammo+' RDS · '+squadQuote.cost.medical+' MED',
   this.handlers.resupplySquad,'campaign-primary');
  squadRefill.setAttribute('aria-label',
   'Refill squad using '+squadQuote.cost.ammo+' HQ rounds, '+
   squadQuote.cost.medical+' medical packs, '+squadQuote.cost.wedges+
   ' door wedges');
  squadRefill.disabled=!squadQuote.available||!squadQuote.changed;
  if(squadRefill.disabled)squadRefill.title=squadQuote.reason??
   'All assigned operators are supplied or HQ reserves are empty';
  squadReplenish.append(squadRefill);
  refillBreakdown.append(node('p','campaign-muted',
   'Items come from finite HQ stock. Carry-limited gear stays in HQ.'));
  supplyPanel.append(squadReplenish,node('h3','campaign-logistics-buy-heading',
   'REPLENISH RESERVES'));
  const purchases=node('div','campaign-purchases campaign-uxr-purchase-panel');
  const purchaseItems:HTMLElement[]=[];
  for(const [label,cost,action] of [
   ['60 ROUNDS',120,this.handlers.buyAmmo],
   ['MEDICAL KIT',170,this.handlers.buyMedical],
   ['2 FLASHBANGS',150,this.handlers.buyFlash],
   [FIELD_STOCK_PACKS.wedges.name,FIELD_STOCK_PACKS.wedges.price,this.handlers.buyWedges]
  ] as const){
   const price=isDispatchPilot(c)&&effectiveDispatchSetup(c).economy==='unlimited'?
    'NO CHARGE':cost+' CR';
   const item=node('div','campaign-supply-offer');
   const desc=node('div','campaign-supply-offer-title');
   desc.append(node('strong','',label),node('span','',price));
   const buy=button('BUY',action);
   buy.setAttribute('aria-label','Buy '+label+' for '+price);
   buy.disabled=!canAffordCampaignPurchase(c,cost)||
    (label==='2 FLASHBANGS'&&(!!c.activeContractId||c.supplies.flash>998))||
    (label===FIELD_STOCK_PACKS.wedges.name&&
     (!!c.activeContractId||c.supplies.wedges>
      FIELD_STOCK_LIMIT-FIELD_STOCK_PACKS.wedges.quantity));
   if(buy.disabled){
    const why=label==='2 FLASHBANGS'&&!!c.activeContractId?
     'Unavailable during an active deployment':
     label==='2 FLASHBANGS'&&c.supplies.flash>998?
      'Flashbang reserve at capacity':
     label===FIELD_STOCK_PACKS.wedges.name&&!!c.activeContractId?
      'Finish the active deployment before acquiring field supplies':
     label===FIELD_STOCK_PACKS.wedges.name&&
      c.supplies.wedges>FIELD_STOCK_LIMIT-FIELD_STOCK_PACKS.wedges.quantity?
      'Door wedge stock full':'Insufficient campaign funds';
    buy.title=why;
    buy.setAttribute('aria-description',why);
   }
   item.append(desc,buy);purchases.append(item);purchaseItems.push(item);
  }
  selectStock=(index:number)=>{
   const choice=Math.max(0,Math.min(stockButtons.length-1,index));
   this.selectedSupplyIndex=choice;
   for(let i=0;i<stockButtons.length;i++){
    stockButtons[i].setAttribute('aria-pressed',String(i===choice));
    purchaseItems[i].hidden=i!==choice;
   }
  };
  selectStock(this.selectedSupplyIndex);
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
  const procurement=node('details','campaign-uxr-procurement');
  procurement.dataset.campaignDetail='weapon-procurement';
  procurement.append(node('summary','','WEAPON PROCUREMENT · '+offerings.length+' PLATFORMS'),inventory);
  logisticsWorkspace.append(procurement);
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
    // UXR-05: one active case, explicit navigation and a direct case index.
    // All cards stay mounted to preserve intel disclosures; only one is visible.
    const selectedCase=sorted.findIndex(k=>k.id===this.selectedCaseId);
    let current=selectedCase<0?0:selectedCase;
    const browser=node('section','campaign-uxr-case-browser');
    const browseHead=node('div','campaign-uxr-case-heading');
    const caseIndex=node('span','campaign-uxr-case-position');
    caseIndex.setAttribute('aria-live','polite');
    const prev=button('PREV',()=>selectCase(current-1),'campaign-uxr-case-prev');
    const next=button('NEXT',()=>selectCase(current+1),'campaign-uxr-case-next');
    browseHead.append(prev,caseIndex,next);
    const board=node('div','campaign-contract-board campaign-uxr-case-pages');
    const pages=sorted.map(k=>this.contract(k,c));
    for(const page of pages)board.append(page);
    const indexRail=node('div','campaign-uxr-case-index');
    indexRail.setAttribute('aria-label','Select a case directly');
    const selectors=sorted.map((k,i)=>{
     const title=campaignIncidentView(c,k).title;
     const buttonItem=button(String(i+1).padStart(2,'0')+' · '+title,
      ()=>selectCase(i),'campaign-uxr-case-index-item');
     buttonItem.setAttribute('aria-label','Select case '+(i+1)+' of '+sorted.length+' · '+title);
     indexRail.append(buttonItem);
     return buttonItem;
    });
    function showCase(index:number){
     current=Math.max(0,Math.min(sorted.length-1,index));
     for(let i=0;i<pages.length;i++)pages[i].hidden=i!==current;
     for(let i=0;i<selectors.length;i++)
      selectors[i].setAttribute('aria-current',i===current?'true':'false');
     caseIndex.textContent='CASE '+(current+1)+' / '+sorted.length;
     prev.disabled=current===0;next.disabled=current===sorted.length-1;
    }
    // Persist selection without mutating a save. Updated in the listener,
    // rather than by the projection or case contents.
    const selectCase=(index:number)=>{
     showCase(index);
     this.selectedCaseId=sorted[current].id;
    };
    let initialTouch:{x:number;y:number}|null=null;
    board.addEventListener('touchstart',event=>{
     const touch=event.touches[0];
     if(touch&&event.touches.length===1)
      initialTouch={x:touch.clientX,y:touch.clientY};
    },{passive:true});
    board.addEventListener('touchend',event=>{
     if(!initialTouch)return;
     const touch=event.changedTouches[0];
     const deltaX=touch.clientX-initialTouch.x;
     const deltaY=touch.clientY-initialTouch.y;
     if(Math.abs(deltaX)>55&&Math.abs(deltaX)>Math.abs(deltaY)*1.45)
      selectCase(current+(deltaX<0?1:-1));
     initialTouch=null;
    },{passive:true});
    showCase(current);
    this.selectedCaseId=sorted[current].id;
    browser.append(node('p','campaign-contract-board-summary',
     'INTEL '+campaignIntelBalance(c)+' · EARLIEST DEADLINE FIRST'),browseHead,board,indexRail);
    jobs.append(browser);
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
  const operationBoard=node('div','campaign-operation-board campaign-uxr-record-index');
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
  // UXR-07: chronological scan lives in compact rows. Only one complete
  // authoritative report is inspected; old history remains lazy below.
  const inspected=node('section','campaign-uxr-record-inspector');
  if(recentReports.length){
   const selected=c.history.find(report=>report.id===this.selectedRecordId);
   const initial=selected?recentReports.findIndex(report=>report.id===selected.id):-1;
   let current=initial<0?0:initial;
   const recordButtons:HTMLButtonElement[]=[];
   const inspect=(index:number)=>{
    current=index;
    const report=recentReports[current];
    if(!report)return;
    this.selectedRecordId=report.id;
    for(let i=0;i<recordButtons.length;i++)
     recordButtons[i].setAttribute('aria-current',i===current?'true':'false');
    inspected.replaceChildren(renderOperation(report));
   };
   for(let i=0;i<recentReports.length;i++){
    const report=recentReports[i];
    const contract=c.contracts.find(k=>k.id===report.contractId);
    const incident=historicalDispatchIncident(c,report);
    const title=incident?.title??(contract?
     campaignIncidentView(c,contract).title:'Operation');
    // Read-only selection uses the shared button helper and report projection.
    const record=button('',()=>inspect(i),'campaign-uxr-record-row');
    record.append(node('span','campaign-uxr-record-day','DAY '+report.day),
     node('span','campaign-uxr-record-title',title),
     node('span','campaign-uxr-record-result',
      report.outcome.toUpperCase()+' · '+report.grade));
    record.setAttribute('aria-label','Inspect day '+report.day+' · '+title+
     ' · '+report.outcome+' · grade '+report.grade);
    recordButtons.push(record);operationBoard.append(record);
   }
   chronicle.append(node('p','campaign-operation-count',
    'LATEST '+recentReports.length+' OF '+c.history.length+' RECORDED OPERATION'+
    (c.history.length===1?'':'S')),operationBoard,inspected);
   inspect(current);
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
   ['wounded','first-deployment','first-success','objective','intel','down','distinction',
    'operator-missing','operator-recovered','casualty-evacuated']
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
     node('span','',operator.missingSinceOperationId&&operator.status==='lost'?
       'MISSING · FATE UNCONFIRMED':operator.status.toUpperCase()));
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
  const operations=projectOperationsSummary(c);
  const availableContracts=operations.cases;
  const leadCase=operations.leadCase;
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
  // UXR-03: one compact, truthful readiness summary and contextual blockers.
  const readiness=node('section','campaign-readiness campaign-uxr-readiness');
  readiness.append(node('h2','','DEPLOYMENT STATUS'));
  const statusStrip=node('div','campaign-uxr-status-strip');
  for(const [value,label] of [
   [operations.ready+'/4','READY'],
   [String(availableContracts.length),'OPEN CASES'],
   [String(c.supplies.ammo),'HQ ROUNDS'],
   [String(c.supplies.medical),'MEDICAL']
  ] as const){
   const cell=node('div','campaign-uxr-status');
   cell.append(node('strong','',value),node('span','',label));
   statusStrip.append(cell);
  }
  readiness.append(statusStrip);
  if(!operations.attention.length)
   readiness.append(node('p','campaign-readiness-ok','TEAM READY · NO URGENT LOGISTICS ALERTS'));
  for(const alert of operations.attention){
   const destination=alert.destination;
   const warning=button(alert.label,()=>activateTab(destination),'campaign-readiness-warning');
   warning.setAttribute('aria-label',alert.label+' · OPEN '+
    (destination==='personnel'?'SQUAD':'SUPPLY'));
   readiness.append(warning);
  }
  const shortcuts=node('nav','campaign-uxr-quicklinks');
  shortcuts.setAttribute('aria-label','Other HQ departments');
  for(const [tab,label] of [
   ['personnel','SQUAD'],['logistics','SUPPLY']
  ] as const)shortcuts.append(button(label,()=>activateTab(tab)));
  const workspace=node('div','campaign-overview-workspace');
  const priority=node('div','campaign-overview-priority');
  const support=node('div','campaign-overview-support');
  priority.append(nextCard,readiness);
  support.append(shortcuts);
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
  const previousFocus=this.pendingKitFocusLabel??(this.root.contains(document.activeElement)?
    document.activeElement?.getAttribute('aria-label'):null);
  this.pendingKitFocusLabel=null;
  // The same operator keeps one preview renderer while HTML controls refresh.
  // Reuse one WebGL context when cycling personnel, updating rig content only.
  const retainOperatorPreview=!this.weaponView&&!!this.preview?.isReady();
  const retainWorkbench=this.weaponView&&!!this.workbench;
  // Preserve this operator's orbit before a deliberate personnel switch.
  if(retainWorkbench&&!sameOperator&&this.lastArmoryRenderedId&&this.workbenchCore){
   const view=this.workbench!.getViewState();
   if(view)this.weaponWorkbenchViews.set(this.lastArmoryRenderedId,{
    core:this.workbenchCore,view
   });
  }
  if(!retainOperatorPreview&&!retainWorkbench)this.disposePreview();
  else if(retainWorkbench&&this.preview){
   this.preview.dispose();this.preview=null;
  }
  if(!sameOperator){
   this.activeKitGroup='weapon';this.activeKitWorkspace='equipment';
   // Preserve selected equipment section when cycling squad members.
   this.previewDocked=false;
   this.selectedWorkbenchSocket=null;
  }
  this.lastArmoryRenderedId=id;
  const person=c.operators.find(o=>o.id===id);
  if(!person){this.armoryOperatorId=null;this.home(c);return;}
  // Compare two confirmed Campaign renders, not a speculative gear picker
  // choice. Only active same-operator edits produce equipment change feedback.
  const previouslyInArmory=!!this.root.querySelector('.campaign-armory-screen');
  const prior=this.lastRenderedKit;
  const changedSlots=previouslyInArmory&&sameOperator&&prior?.operatorId===id?
   LOADOUT_SLOTS.filter(slot=>prior.slots[slot]!==person.loadout.slots[slot]):[];
  const changedWeapon=previouslyInArmory&&sameOperator&&prior?.operatorId===id&&
   prior.weapon!==person.weapon;
  const currentMass=totalEquipmentMass(person.loadout,person.weaponConfiguration);
  const currentMobility=Math.round(loadMovementScale(person.loadout,person.weaponConfiguration)*100);
  const committedKitChange=changedSlots.length>0||!!changedWeapon;
  const slotSnapshot={} as Record<LoadoutSlot,string>;
  for(const slot of LOADOUT_SLOTS)slotSnapshot[slot]=person.loadout.slots[slot];
  this.lastRenderedKit={
   operatorId:id,weapon:person.weapon,slots:slotSnapshot,
   mass:currentMass,mobility:currentMobility
  };
  this.disposeGallery();
  this.root.hidden=false;this.root.replaceChildren();
  const main=node('main','campaign-shell campaign-wide campaign-armory-screen');
  if(this.activeKitWorkspace==='readiness')this.activeKitWorkspace='equipment';
  main.dataset.kitWorkspace=this.activeKitWorkspace;
  main.dataset.benchSlot=this.activeBenchSlot;
  main.dataset.previewDocked=String(this.previewDocked);
  const top=node('div','campaign-head campaign-armory-head');
  const identity=node('div');
  identity.append(node('div','campaign-eyebrow','PERSONNEL / FIELD ARMORY'),
   node('h1','',person.callsign+' / EQUIPMENT'));
  top.append(button('← OPERATIONS',()=>{
   this.armoryOperatorId=null;this.home(c);
  },'campaign-armory-back'),identity);
  main.append(top);
  const preparable=c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired')
   .sort((a,b)=>{
    const ai=c.squadIds.indexOf(a.id),bi=c.squadIds.indexOf(b.id);
    return (ai<0?99:ai)-(bi<0?99:bi);
   });
  // Native iOS selects are replaced by one reusable anchored Fieldwork picker.
  // Cycling operators retains the current equipment category and view intent.
  const chooseOperator=(nextId:string)=>{
   if(nextId===id)return;
   this.armoryOperatorId=nextId;this.home(c);
  };
  const index=preparable.findIndex(o=>o.id===id);
  const compactHeader=node('div','campaign-outfitter-header-controls');
  const previous=button('‹',()=>chooseOperator(
   preparable[(index+preparable.length-1)%preparable.length].id),
   'campaign-outfitter-previous');
  previous.setAttribute('aria-label','Previous operator');
  previous.disabled=preparable.length<2;
  const next=button('›',()=>chooseOperator(
   preparable[(index+1)%preparable.length].id),
   'campaign-outfitter-next');
  next.setAttribute('aria-label','Next operator');
  next.disabled=preparable.length<2;
  const identityBox=node('div','campaign-outfitter-identity-box');
  const selectName=fieldworkSelect({label:'Choose outfitting operator',
   value:id,choices:preparable.map((o,i)=>({
    value:o.id,label:o.callsign.toUpperCase(),
    swatch:o.squadColor??SQUAD_IDENTIFICATION_COLORS[i%SQUAD_IDENTIFICATION_COLORS.length],
    hint:'OPERATOR '+String(i+1).padStart(2,'0')+' / '+
     String(preparable.length).padStart(2,'0')})),
   onChange:chooseOperator});
  selectName.classList.add('campaign-outfitter-operator-select');
  const mobileMetrics=node('span','campaign-outfitter-metrics',
   currentMass.toFixed(1)+' KG · '+currentMobility+'%');
  // Color remains separately selectable, but visually belongs to identity.
  const nameRow=node('div','campaign-outfitter-name-row');
  identityBox.append(nameRow,mobileMetrics);
  let openKitLibrary=()=>{};
  let openClothing=()=>{};
  const renameShortcut=button('✎',()=>{
   if(!rename.disabled)rename.click();
  },'campaign-outfitter-rename');
  renameShortcut.setAttribute('aria-label','Rename '+person.callsign);
  renameShortcut.disabled=!!c.activeContractId;
  const palette=[
   ['Slate blue','#88B4C8'],['Olive','#B7B57D'],
   ['Muted red','#C18F82'],['Sage','#88B89D'],
   ['Plum','#B69CC9'],['Amber','#DEB37D']
  ] as const;
  const colorPicker=fieldworkSelect({
   label:'Operator identification color',
   value:person.squadColor??SQUAD_IDENTIFICATION_COLORS[index%SQUAD_IDENTIFICATION_COLORS.length],
   choices:palette.map(([label,value])=>({label,value,swatch:value})),
   onChange:color=>this.handlers.setOperatorColor(id,color)
  });
  colorPicker.classList.add('campaign-outfitter-color');
  colorPicker.textContent='●';
  colorPicker.style.color=person.squadColor??SQUAD_IDENTIFICATION_COLORS[index%SQUAD_IDENTIFICATION_COLORS.length];
  nameRow.append(selectName,colorPicker);
  // Monochrome icons match the equipment category glyphs and avoid the
  // platform-specific colored emoji appearance on iOS.
  const headerIcon=(pathData:string)=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
   svg.classList.add('campaign-outfitter-header-icon');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',pathData);path.setAttribute('fill','none');
   path.setAttribute('stroke','currentColor');
   path.setAttribute('stroke-width','1.75');
   path.setAttribute('stroke-linecap','round');
   path.setAttribute('stroke-linejoin','round');
   svg.append(path);return svg;
  };
  const kitButton=button('',()=>openKitLibrary(),'campaign-outfitter-library-button');
  kitButton.append(headerIcon('M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z M17 21v-8H7v8 M7 3v5h8'));
  kitButton.setAttribute('aria-label','Saved kit library and squad tools');
  const clothes=button('',()=>openClothing(),'campaign-outfitter-clothing-button');
  clothes.append(headerIcon('M16 2c0 2.2-1.8 4-4 4S8 4.2 8 2L3.6 4 1 10l5 2 2-3v12h8V9l2 3 5-2-2.6-6L16 2'));
  clothes.setAttribute('aria-label','Clothing and appearance');
  compactHeader.append(previous,identityBox,next,renameShortcut,
   kitButton,clothes);
  top.append(compactHeader);
  main.append(createLoadoutSquadRail(preparable.map(o=>({
   id:o.id,name:o.callsign.toUpperCase(),
   detail:o.weapon.toUpperCase(),
   status:o.recoveryDays>0?'RECOVERING · '+o.recoveryDays+'D':
    c.squadIds.includes(o.id)?'ASSIGNED · '+o.weapon.toUpperCase():'RESERVE'
  })),id,selected=>{
   this.armoryOperatorId=selected;this.home(c);
  }));
  const grid=node('div','campaign-kit-grid');
  const summary=node('section','campaign-section campaign-kit-summary');
  summary.append(node('h2','','OPERATOR'));
  const preview=node('div','campaign-kit-preview');
  const viewToggle=button(this.weaponView?'RETURN TO OPERATOR':'INSPECT WEAPON MODEL',()=>{
   this.weaponView=!this.weaponView;this.armory(c,id);
  });
  summary.append(preview,node('p','campaign-note campaign-preview-hint',
   this.weaponView?'DRAG TO ROTATE · TAP A MOUNT TO SELECT ITS SLOT':
    'DRAG TO ROTATE · ARROW KEYS OR BUTTONS ALSO WORK'));
  if(!this.weaponView){
   // Visible 44px touch targets supplement dragging and keyboard orbit.
   // These alter only the preview camera, never the equipped kit.
   const orbitControls=node('div','campaign-kit-preview-controls');
   orbitControls.setAttribute('role','group');
   orbitControls.setAttribute('aria-label','Operator preview rotation');
   const left=button('LEFT 45°',()=>this.preview?.rotateBy(-45));
   const reset=button('RESET',()=>this.preview?.resetOrientation());
   const flip=button('FLIP 180°',()=>this.preview?.rotateBy(180));
   const right=button('RIGHT 45°',()=>this.preview?.rotateBy(45));
   left.setAttribute('aria-label','Rotate operator 45 degrees left');
   reset.setAttribute('aria-label','Reset operator preview angle');
   flip.setAttribute('aria-label','Turn operator 180 degrees to inspect the rear');
   right.setAttribute('aria-label','Rotate operator 45 degrees right');
   orbitControls.append(left,reset,flip,right);
   summary.append(orbitControls);
   const dock=button(this.previewDocked?'CLOSE FLOATING MODEL':'KEEP MODEL VISIBLE',()=>{
    this.previewDocked=!this.previewDocked;
    main.dataset.previewDocked=String(this.previewDocked);
    dock.textContent=this.previewDocked?'CLOSE FLOATING MODEL':'KEEP MODEL VISIBLE';
    dock.setAttribute('aria-pressed',String(this.previewDocked));
   },'campaign-kit-preview-dock-toggle');
   dock.setAttribute('aria-pressed',String(this.previewDocked));
   summary.append(dock);
  }
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
   ['LOADED',person.magazine+' RDS'],
   ['RESERVE',person.reserve+' RDS'],
   ['MEDICAL',String(medicalSupplyCount(person.medicalSupplies))]
  ]){
   const metric=node('div','campaign-kit-stat');
   metric.append(node('small','',name),node('strong','',value));stats.append(metric);
  }
  summary.append(stats);
  const readinessPanel=node('section','campaign-kit-readiness-panel');
  readinessPanel.setAttribute('aria-label','Readiness, resupply and maintenance');
  const singleQuote=quoteCampaignOperatorRefill(c,person.id);
  if(singleQuote){
   const needs=node('section','campaign-kit-refill');
   needs.append(node('strong','','BEFORE NEXT DEPLOYMENT'),
    node('p','',
     singleQuote.roundsIssued+' / '+singleQuote.roundsWanted+' ROUNDS FROM HQ · '+
     singleQuote.medicalIssued+' / '+singleQuote.medicalWanted+' MEDICAL PACKS · '+
     singleQuote.wedgesIssued+' / '+singleQuote.wedgesWanted+' WEDGES'+
     (singleQuote.roundsShort?' · '+singleQuote.roundsShort+' ROUNDS SHORT':'')+
     (singleQuote.blockedByCarry?' · CARRY SPACE LIMITED':'')));
   const actions=node('div','campaign-kit-refill-actions');
   const ammoButton=button('REFILL '+singleQuote.roundsIssued+' ROUNDS',
    ()=>this.handlers.resupply(person.id));
   ammoButton.disabled=!!c.activeContractId||singleQuote.roundsIssued<=0;
   const medicalButton=button('REISSUE '+singleQuote.medicalIssued+' MEDICAL PACK',
    ()=>this.handlers.resupplyMedical(person.id));
   medicalButton.disabled=!!c.activeContractId||singleQuote.medicalIssued<=0;
   const fieldButton=button('REISSUE '+singleQuote.wedgesIssued+' WEDGES',
    ()=>this.handlers.resupplyField(person.id));
   fieldButton.disabled=!!c.activeContractId||
    singleQuote.wedgesIssued===0;
   actions.append(ammoButton,medicalButton,fieldButton);
   needs.append(actions);
   readinessPanel.append(needs);
  }
  if(committedKitChange){
   const feedback=node('div','campaign-kit-commit-feedback');
   feedback.setAttribute('role','status');
   feedback.setAttribute('aria-live','polite');
   const lastSlot=changedSlots[0];
   const single=changedSlots.length===1&&!changedWeapon;
   const changedName=lastSlot?
    itemDefinition(person.loadout.slots[lastSlot])?.name??lastSlot.toUpperCase():null;
   const heading=single?lastSlot.replace(/-/g,' ').toUpperCase()+' EQUIPPED':
    'KIT UPDATED · '+(changedSlots.length+(changedWeapon?1:0))+' CHANGES';
   feedback.append(node('strong','',heading),
    node('span','',single&&changedName?changedName:'Campaign equipment updated'));
   if(prior&&Math.abs(currentMass-prior.mass)>0.005){
    const delta=currentMass-prior.mass;
    feedback.append(node('small','',
     'LOAD '+(delta>0?'+':'')+delta.toFixed(2)+' KG · '+
     currentMass.toFixed(2)+' KG TOTAL'));
   }
   if(prior&&prior.mobility!==currentMobility)
    feedback.append(node('small','','MOBILITY '+prior.mobility+'% → '+currentMobility+'%'));
   summary.append(feedback);
  }
  const conditionPanel=node('div','campaign-kit-condition-panel');
  for(const [label,condition,limit] of [
   ['BODY ARMOR',person.armorCondition.torso,maximum.torso],
   ['HEAD PROTECTION',person.armorCondition.head,maximum.head]
  ] as const){
   const entry=node('div','campaign-kit-condition');
   const header=node('div','campaign-kit-condition-head');
   header.append(node('span','',label),
    node('strong','',limit>0?condition+' / '+limit+' CONDITION':'NONE EQUIPPED'));
   entry.append(header);
   const track=node('div','campaign-kit-condition-track');
   track.setAttribute('role','progressbar');
   track.setAttribute('aria-label',label+' condition');
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax',String(limit||1));
   track.setAttribute('aria-valuenow',String(limit?condition:0));
   const fill=node('span','campaign-kit-condition-fill');
   fill.style.width=(limit>0?Math.max(0,Math.min(100,condition/limit*100)):0)+'%';
   if(limit>0&&condition<limit)entry.dataset.condition='worn';
   track.append(fill);entry.append(track);conditionPanel.append(entry);
  }
  readinessPanel.append(conditionPanel);
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
  if(maintenance.childElementCount)readinessPanel.append(
   node('p','campaign-kit-service-funds','SERVICE FUNDS · '+c.funds+' CR AVAILABLE'),
   maintenance);
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
    'WEAPON CONDITION · '+firearm.condition+'% · '+
    firearm.roundsFired+' ROUNDS FIRED'));
    const serialDetails=node('details','campaign-kit-serial-record');
    serialDetails.append(node('summary','','WEAPON RECORD IDENTIFIER'),
     node('p','campaign-note',firearm.id));
    readiness.append(serialDetails);
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
  const configuration=node('details','campaign-kit-serial-record');
  configuration.append(node('summary','','TECHNICAL WEAPON CONFIGURATION'),
   node('p','campaign-kit-metrics',Object.values(person.weaponConfiguration.slots).join(' / ')));
  readiness.append(configuration);
  readinessPanel.append(readiness);
  // Readiness becomes an on-demand preparation drawer, not a third
  // navigation destination or another copy of the operator profile.
  grid.append(summary);
  const editor=node('section','campaign-section campaign-kit-editor');
  const locked=!!c.activeContractId;
  const dispatchPilot=isDispatchPilot(c)&&
   effectiveDispatchSetup(c).equipmentScope!=='global';
  if(dispatchPilot)editor.append(node('p','campaign-note campaign-kit-access',
   'DISPATCH PILOT · CURATED EQUIPMENT ACCESS'));
  const presets=node('details','campaign-kit-presets');
  presets.open=this.showKitPresets;
  presets.addEventListener('toggle',()=>{this.showKitPresets=presets.open;});
  presets.append(node('summary','','SAVED KITS · '+c.kitPresets.length));
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
  if(locked)save.title='Kit presets cannot change during a deployment';
  else if(c.kitPresets.length>=24)save.title='Maximum 24 saved kits';
  presets.append(presetActions);
  const kitList=node('div','campaign-kit-preset-list');
  if(!c.kitPresets.length){
   kitList.append(node('p','campaign-note',
    'No saved kits. Save this operator’s current equipment to reuse it later.'));
  }
  for(const preset of c.kitPresets){
   const allowed=canApplyCampaignKitPreset(c,id,preset.id);
   const available=preset.weapon===person.weapon||
    (c.inventory.weapons[preset.weapon]??0)>0;
   const card=node('article','campaign-kit-preset-card');
   const heading=node('div','campaign-kit-preset-heading');
   heading.append(node('strong','',preset.name),
    node('small','',preset.weapon.toUpperCase()+' · '+
     totalEquipmentMass(preset.kit,preset.weaponConfiguration).toFixed(2)+' KG'));
   const detail=node('p','campaign-kit-preset-summary',
    (itemDefinition(preset.kit.slots.head)?.name??'No headwear')+' · '+
    (itemDefinition(preset.kit.slots.armor)?.name??'No armor'));
   const eligible=allowed&&available&&!locked;
   const explanation=node('p','campaign-kit-preset-eligibility',
    locked?'LOCKED DURING DEPLOYMENT':
    !allowed?'RESTRICTED BY CAMPAIGN EQUIPMENT RULES':
    !available?'PRIMARY WEAPON NOT AVAILABLE':
    'READY TO APPLY · USES OWNED EQUIPMENT');
   if(!eligible)card.dataset.unavailable='true';
   const actions=node('div','campaign-kit-preset-actions');
   const apply=button('EQUIP KIT',()=>this.handlers.applyKitPreset(id,preset.id),
    'campaign-primary');
   apply.disabled=!eligible;
   if(!eligible)apply.title=explanation.textContent??'Kit unavailable';
   const remove=button('DELETE',async()=>{
    if(await confirmFieldworkAction({
     title:'Delete saved kit preset?',
     message:'Delete "'+preset.name+'"? This removes only the preset, never owned equipment.',
     confirmLabel:'DELETE PRESET',danger:true
    }))this.handlers.deleteKitPreset(preset.id);
   });
   remove.disabled=locked;
   actions.append(apply,remove);
   card.append(heading,detail,explanation,actions);
   kitList.append(card);
  }
  presets.append(kitList);
  presets.append(node('p','campaign-note',
   'Saved kits store equipment configurations, not duplicate weapons or stock.'));
  editor.append(node('h2','','EQUIPMENT'));
  const kitUtilities=node('details','campaign-kit-utilities');
  kitUtilities.append(node('summary','','SAVED KITS & UTILITIES'),presets);
  editor.append(kitUtilities);
  if(locked)editor.append(node('p','campaign-note','ACTIVE DEPLOYMENT · KIT CHANGES LOCKED'));
  const workspaceNav=node('nav','campaign-kit-workspace-nav');
  workspaceNav.setAttribute('aria-label','Armory workspaces');
  const workspaceButtons=new Map<'equipment'|'physical',HTMLButtonElement>();
  for(const [key,label] of [
   ['equipment','CHANGE GEAR'],['physical','ARRANGE CARRY']
  ] as const){
   const control=button(label,()=>activateWorkspace(key),'campaign-kit-workspace-tab');
   control.setAttribute('aria-current',String(this.activeKitWorkspace===key));
   workspaceButtons.set(key,control);workspaceNav.append(control);
  }
  const readyDrawer=node('details','campaign-kit-readiness-drawer');
  const readySummary=node('summary','','READINESS · LOAD '+
   currentMass.toFixed(1)+' KG · MOBILITY '+currentMobility+'%');
  readyDrawer.append(readySummary,readinessPanel);
  main.append(workspaceNav,readyDrawer);
  const categoryBar=node('div','campaign-kit-categories');
  categoryBar.setAttribute('role','tablist');
  categoryBar.setAttribute('aria-label','Equipment categories');
  const categoryTabs=new Map<QuickLoadoutGroup,HTMLButtonElement>();
  // Share the category-to-camera mapping with first-preview construction.
  const previewFocusForGroup:Record<QuickLoadoutGroup,EquipmentPreviewFocus>={
   weapon:'weapon',protection:'torso',carry:'carry',
   utilities:'carry',issued:'full'
  };
  const setCategory=(group:QuickLoadoutGroup)=>{
   this.activeKitGroup=group;
   // Category changes never silently switch editing modes.
   main.dataset.kitWorkspace=this.activeKitWorkspace;
   for(const [key,control] of workspaceButtons)
    control.setAttribute('aria-current',String(key===this.activeKitWorkspace));
   this.preview?.focusOn(previewFocusForGroup[group]);
   for(const [key,control] of categoryTabs){
    control.setAttribute('aria-selected',String(key===group));
    control.tabIndex=key===group?0:-1;
   }
   // Only pan the category rail horizontally. Calling scrollIntoView here
   // would move the entire armory vertically whenever a category changes.
   const selectedTab=categoryTabs.get(group);
   if(selectedTab){
    const rail=categoryBar.getBoundingClientRect();
    const tab=selectedTab.getBoundingClientRect();
    if(tab.left<rail.left+4||tab.right>rail.right-4){
     const target=categoryBar.scrollLeft+tab.left-rail.left-
      (categoryBar.clientWidth-tab.width)/2;
     categoryBar.scrollTo({left:Math.max(0,target),
      behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?
       'instant':'smooth'});
    }
   }
  };
  const grouped=buildQuickLoadoutGroups(editor,this.activeKitGroup,setCategory);
  const benchRows=new Map<LoadoutSlot,HTMLElement>();
  const selectedItems=this.outfitterSelected.get(id)??new Map<string,string>();
  const scrollPositions=this.outfitterScroll.get(id)??new Map<string,number>();
  this.outfitterSelected.set(id,selectedItems);
  this.outfitterScroll.set(id,scrollPositions);
  const gallerySources=new Map<LoadoutSlot,HTMLSelectElement>();
  let showGallery:((slot:LoadoutSlot)=>void)|null=null;
  let closeAdvanced:(()=>void)|null=null;
  const benchButtons=new Map<LoadoutSlot,HTMLButtonElement>();
  const benchNav=node('nav','campaign-kit-bench-zones');
  benchNav.setAttribute('aria-label','Choose equipment position');
  const compact=window.matchMedia?.('(max-width:620px), (max-width:920px) and (max-height:620px)').matches??false;
  const leftRail=node('div','campaign-outfitter-rail campaign-outfitter-rail-left');
  const rightRail=node('div','campaign-outfitter-rail campaign-outfitter-rail-right');
  // Monochrome icons are precise 44px targets, not projected over the rig.
  // All eight core categories are ALWAYS reachable, including hidden packs.
  const glyphs:Record<string,string>={
   primary:'M12 3v3m0 3v-3m0 3v3m0-3v3 M5 12h14 M12 5v14',
   head:'M4 17h16 M6 17v-5a6 6 0 0 1 12 0v5 M5 12h14',
   armor:'M12 2l8 4v6c0 5-3 8-8 12C7 20 4 17 4 12V6z',
   rig:'M4 5h16v15H4z M8 5v15 M16 5v15 M4 11h16',
   belt:'M3 9h18v6H3z M14 9v6 M17 11h2',
   backpack:'M7 6V5a5 5 0 0 1 10 0v1 M6 6h12v15H6z M9 11h6v4H9z',
   medical:'M9 4h6v5h5v6h-5v5H9v-5H4V9h5z',
   utility:'M20 7a5 5 0 0 1-6 6l-7 7-3-3 7-7a5 5 0 0 1 6-6l-3 3 3 3z'
  };
  const buildIcon=(slot:string)=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');
   svg.setAttribute('aria-hidden','true');
   svg.classList.add('campaign-outfitter-icon');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',glyphs[slot]??glyphs.utility);
   path.setAttribute('fill','none');
   path.setAttribute('stroke','currentColor');
   path.setAttribute('stroke-width','1.8');
   path.setAttribute('stroke-linejoin','round');
   path.setAttribute('stroke-linecap','round');
   svg.append(path);return svg;
  };
  for(const [slot,label] of [
   ['primary','WEAPON'],['head','HEAD'],['armor','ARMOR'],
   ['rig','CHEST'],['belt','BELT'],['backpack','PACK'],
   ['medical','MEDICAL'],['utility','TOOLS']
  ] as const){
   const part=button(label,()=>selectBenchSlot(slot),'campaign-kit-bench-zone');
   part.dataset.slot=slot;
   part.setAttribute('aria-label','Inspect '+label.toLowerCase()+' equipment');
   const caption=node('span','campaign-outfitter-icon-label',label);
   part.replaceChildren(buildIcon(slot),caption);
   part.setAttribute('aria-current',String(this.activeBenchSlot===slot));
   (['primary','head','armor','rig'].includes(slot)?leftRail:rightRail).append(part);
   benchButtons.set(slot,part);
  }
  benchNav.append(leftRail,rightRail);
  if(compact)summary.append(benchNav);
  else editor.insertBefore(benchNav,grouped.group.weapon);
  const issuedMore=node('details','campaign-kit-bench-more');
  issuedMore.append(node('summary','','CLOTHING & ISSUED BASICS'));
  const issuedSlots=node('div','campaign-kit-bench-more-grid');
  for(const [slot,label] of [
   ['top','TOP'],['legs','LEGS'],['hands','HANDS'],['feet','FOOTWEAR']
  ] as const){
   const part=button(label,()=>selectBenchSlot(slot),'campaign-kit-bench-zone');
   part.dataset.slot=slot;
   part.setAttribute('aria-current',String(this.activeBenchSlot===slot));
   issuedSlots.append(part);benchButtons.set(slot,part);
  }
  issuedMore.append(issuedSlots);
  editor.insertBefore(issuedMore,grouped.group.weapon);
  const contextTitle=node('div','campaign-outfitter-context-title');
  const contextName=node('strong','',
   this.activeBenchSlot==='primary'?'WEAPON':
   this.activeBenchSlot==='rig'?'CHEST RIG':
   this.activeBenchSlot==='backpack'?'BACKPACK':
   this.activeBenchSlot.toUpperCase());
  const contextMeta=node('small','','Select equipment or place carried items');
  contextTitle.append(contextName,contextMeta);
  editor.insertBefore(contextTitle,grouped.group.weapon);
  const selectBenchSlot=(slot:LoadoutSlot,fromModel=false)=>{
   this.activeBenchSlot=slot;main.dataset.benchSlot=slot;
   this.activeKitWorkspace='equipment';
   main.dataset.kitWorkspace=compact?'unified':'equipment';
   for(const [key,control] of workspaceButtons)
    control.setAttribute('aria-current',String(key==='equipment'));
   for(const [key,control] of benchButtons)
    control.setAttribute('aria-current',String(key===slot));
   for(const [key,row] of benchRows)row.hidden=compact&&key!==slot;
   this.preview?.clearTransientSelection();
   if(compact){closeAdvanced?.();showGallery?.(slot);}
   else showGroup(loadoutGroupForSlot(slot));
   contextName.textContent=slot==='primary'?'WEAPON':
    slot==='rig'?'CHEST RIG':slot==='backpack'?'BACKPACK':
    slot==='utility'?'TOOLS':slot.toUpperCase();
   contextMeta.textContent='CURRENT EQUIPMENT · TAP TO CHANGE';
   if(slot==='backpack')this.preview?.setAzimuth(Math.PI);
   else if(Math.cos(this.preview?.getAzimuth()??.72)<-.2&&
    ['primary','head','armor','rig'].includes(slot))
    this.preview?.setAzimuth(.72);
   if(fromModel&&compact&&['top','legs','hands','feet'].includes(slot))
    issuedMore.open=true;
   // The bottom drawer alone scrolls; never move the whole screen to follow
   // a selected body part. Its content starts at the current item.
   if(compact)editor.scrollTop=0;
   this.preview?.setSelectedSlot(slot);
   this.preview?.focusOn(slot==='head'?'head':slot==='primary'?'weapon':
    slot==='armor'||slot==='rig'||slot==='top'?'torso':
    slot==='backpack'?'back':slot==='belt'||slot==='medical'||slot==='utility'?'belt':
    slot==='legs'||slot==='feet'?'legs':'full');
  };
  function showGroup(group:QuickLoadoutGroup){
   grouped.group[group].open=true;
   setCategory(group);
  }
  const activateWorkspace=(destination:'equipment'|'physical')=>{
   this.preview?.clearTransientSelection();
   contextMeta.textContent=destination==='physical'?
    'TAP AN ITEM, THEN CHOOSE A CARRY LOCATION':'CURRENT EQUIPMENT · TAP TO CHANGE';
   this.activeKitWorkspace=destination;
   main.dataset.kitWorkspace=destination;
   if(destination==='physical')showGroup('carry');
   else showGroup(loadoutGroupForSlot(this.activeBenchSlot));
   for(const [key,control] of workspaceButtons)
    control.setAttribute('aria-current',String(key===destination));
  };
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
   categoryTabs.set(group,select);
   if(group!=='carry')categoryBar.append(select);
  }
  categoryBar.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const keys:QuickLoadoutGroup[]=QUICK_LOADOUT_GROUPS.filter(g=>g.id!=='carry').map(g=>g.id);
   const index=keys.indexOf(this.activeKitGroup);
   const next=event.key==='Home'?0:event.key==='End'?keys.length-1:
    (index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
   event.preventDefault();categoryTabs.get(keys[next])?.click();
   categoryTabs.get(keys[next])?.focus({preventScroll:true});
  });
  editor.insertBefore(categoryBar,grouped.group.weapon);
  for(const slot of LOADOUT_SLOTS){
   if(slot==='tactical')continue; // Field consumables use the shared quantity and placement editor.
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
    if(slot!=='rig'&&slot!=='belt'&&slot!=='backpack')
     select.addEventListener('change',()=>this.handlers.equipGear(
      id,slot,select.value));
   }
   select.disabled=locked;
   gallerySources.set(slot,select);
   select.classList.add('campaign-kit-native-select');
   const picker=createCampaignGearPicker(select,slot.replace(/-/g,' '),
    itemId=>this.preview?.renderModelThumbnail({kind:'gear',slot,itemId})??null);
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
   wrap.dataset.benchSlot=slot;
   wrap.hidden=compact&&slot!==this.activeBenchSlot;
   benchRows.set(slot,wrap);
   if(slot==='rig'||slot==='belt'||slot==='backpack')
    attachCarryGearChangePreview({
     select,host:wrap,slot,kit:person.loadout,magazines:person.magazines,
     onInspect:where=>this.preview?.highlightCarryLocation(where),
     onApply:itemId=>{
      const quote=quoteCarryGearChange(person.loadout,person.magazines,slot,itemId);
      if(!quote.ok)return;
      this.carryUndo.record(id,captureCarryUndo(person.loadout,person.magazines),
       captureCarryUndo(quote.kit,quote.magazines));
      this.handlers.equipCarryGear(id,slot,itemId);
     }
    });
   if(changedSlots.includes(slot)){
    wrap.dataset.changed='true';
    wrap.setAttribute('aria-label',slot.replace(/-/g,' ')+' changed');
   }
   grouped.field(loadoutGroupForSlot(slot)).append(wrap);
  }
  const carryUndoButton=button('UNDO LAST CARRY MOVE',()=>{
   const expected=captureCarryUndo(person.loadout,person.magazines);
   const undo=this.carryUndo.peek(id,expected);
   if(!undo.ok)return;
   this.carryUndo.clear(id);
   this.handlers.undoCarryGear(id,expected,undo.restore);
  },'fw-carry-undo-action');
  carryUndoButton.setAttribute('aria-label','Undo last physical carry move');
  carryUndoButton.disabled=locked||!this.carryUndo.peek(id,
   captureCarryUndo(person.loadout,person.magazines)).ok;
  grouped.field('carry').append(carryUndoButton);
  const squadFlashReserved=c.operators.filter(o=>o.id!==id&&c.squadIds.includes(o.id))
   .reduce((count,o)=>count+fieldQuantity(
    o.loadout.fieldInventory??initialFieldInventory(o.loadout),'flashbang'),0);
  // Real physical stacks, magazines, and placement controls belong together.
  // Keep this existing validated authority outside the mobile presentation.
  const physicalEditor=createFieldGadgetEditor({
   loadout:person.loadout,magazines:person.magazines,locked,
   onInspectLocation:location=>this.preview?.highlightCarryLocation(location),
   onInspectItem:item=>{
    this.preview?.inspectCarryItem(item);
    // The model is the inspection surface. Keep the actual mount in view
    // while the user taps physical items further down a phone screen.
    if(window.matchMedia?.('(max-width:620px)').matches){
     this.previewDocked=true;main.dataset.previewDocked='true';
     const control=summary.querySelector<HTMLButtonElement>(
      '.campaign-kit-preview-dock-toggle');
     if(control){
      control.textContent='CLOSE FLOATING MODEL';
      control.setAttribute('aria-pressed','true');
     }
    }
   },
   onModelThumbnail:item=>this.preview?.renderModelThumbnail(item)??null,
   onMoveMagazine:(magazineId,to,focusLabel)=>{
    const quote=quoteOneMagazineMove(person.loadout,person.magazines,magazineId,to);
    if(!quote.ok||!quote.changed)return;
    this.carryUndo.record(id,captureCarryUndo(person.loadout,person.magazines),
     captureCarryUndo(person.loadout,quote.magazines));
    this.pendingKitFocusLabel=focusLabel??null;
    this.handlers.moveMagazine(id,magazineId,to);
   },
   maxFlash:c.squadIds.includes(id)?
    Math.max(0,c.supplies.flash-squadFlashReserved):4,
   maxWedges:c.supplies.wedges,
   copyTargets:c.operators.filter(o=>o.id!==id&&
    o.status!=='lost'&&o.status!=='retired').map(o=>({
     id:o.id,name:o.callsign,loadout:o.loadout,magazines:o.magazines
    })),
   canUndo:!!this.fieldUndo.peek(id,
    person.loadout.fieldInventory??initialFieldInventory(person.loadout)),
   onUndo:()=>{
    const previous=this.fieldUndo.peek(id,
     person.loadout.fieldInventory??initialFieldInventory(person.loadout));
    if(!previous)return;
    this.fieldUndo.clear(id);
    this.handlers.equipFieldInventory(id,previous);
   },
   onCopyLayout:targetId=>{
    const target=c.operators.find(o=>o.id===targetId);
    if(!target)return;
    const quote=quoteCarryLayoutCopy(person.loadout,person.magazines,
     target.loadout,target.magazines);
    if(!quote.ok||!quote.changed)return;
    this.carryUndo.record(targetId,
     captureCarryUndo(target.loadout,target.magazines),
     captureCarryUndo(quote.loadout,quote.magazines));
    this.handlers.copyCarryLayout(id,targetId);
   },
   onCopy:(targetId,inventory)=>{
    const target=c.operators.find(o=>o.id===targetId);
    if(target)this.fieldUndo.record(targetId,
     target.loadout.fieldInventory??initialFieldInventory(target.loadout),inventory);
    this.handlers.copyFieldInventory(id,targetId);
   },
   onCommit:(inventory,focusLabel)=>{
     this.pendingKitFocusLabel=focusLabel??null;
     this.fieldUndo.record(id,
     person.loadout.fieldInventory??initialFieldInventory(person.loadout),inventory);
    this.handlers.equipFieldInventory(id,inventory);
   }
  });
  grouped.field('carry').append(physicalEditor);
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
   // Advanced legacy picker stays reachable without duplicating the
   // primary physical-magazine board inside Physical Carry.
   kitUtilities.append(magazines);
  }
  // R3: Mobile has no workspaces, secondary picker or group navigation.
  // Retain existing source controls OFFSCREEN to preserve save/stock handlers;
  // the visible surface is a single direct-action gallery.
  if(compact){
   // Remove the old two-mode selector entirely from the mobile tree.
   workspaceNav.remove();
   const legacy=node('div','fw-outfitter-legacy');
   legacy.hidden=true;
   legacy.replaceChildren(...Array.from(editor.childNodes));
   editor.append(legacy);
   const advanced=node('section','fw-outfitter-advanced');
   advanced.hidden=true;
   const advancedHead=node('div','fw-outfitter-advanced-head');
   const advancedClose=button('‹ BACK TO EQUIPMENT',()=>{
    advanced.hidden=true;galleryRoot.hidden=false;
   });
   advancedHead.append(advancedClose);
   advanced.append(advancedHead);
   // Save/apply presets have a dedicated header shortcut, not a More tab.
   presets.open=true;
   advanced.append(presets);
   const otherDetails=node('details','campaign-outfitter-squad-tools');
   otherDetails.append(node('summary','','SQUAD LOGISTICS / AUTO PACK'));
   otherDetails.append(kitUtilities);
   advanced.append(otherDetails);
   const physicalAdvanced=physicalEditor.querySelector<HTMLElement>(
    '.fw-field-inventory-advanced');
   advanced.append(issuedMore);
   editor.append(advanced);
   // Separate carry from saved kits: one editor with one clear destination.
   const carryPanel=node('section','fw-outfitter-advanced fw-outfitter-carry-panel');
   carryPanel.hidden=true;
   const carryBack=button('‹ BACK TO EQUIPMENT',()=>{
    carryPanel.hidden=true;galleryRoot.hidden=false;
   },'fw-outfitter-carry-back');
   carryPanel.append(carryBack,physicalEditor);
   if(physicalAdvanced)carryPanel.append(physicalAdvanced);
   editor.append(carryPanel);
   const galleryRoot=node('div','fw-outfitter-main');
   editor.append(galleryRoot);
   closeAdvanced=()=>{
    advanced.hidden=true;carryPanel.hidden=true;galleryRoot.hidden=false;
   };
   openKitLibrary=()=>{
    galleryRoot.hidden=true;carryPanel.hidden=true;advanced.hidden=false;
   };
   openClothing=()=>{selectBenchSlot('top');};
   const gallery=createOutfitterGallery({
    host:galleryRoot,sources:gallerySources,kit:person.loadout,
    magazines:person.magazines,locked,
    renderModel:(slot,itemId)=>this.preview?.renderModelThumbnailAsync(
     {kind:'gear',slot,itemId})??null,
    onAutoPack:()=>{
     const button=[...physicalEditor.querySelectorAll<HTMLButtonElement>('button')]
      .find(button=>button.textContent?.trim()==='AUTO PACK');
     if(button&&!button.disabled)button.click();
    },
    selectedItems,scrollPositions,
    onSelectCategory:slot=>selectBenchSlot(slot),
    onInspect:(slot,itemId)=>this.preview?.selectItemDot(
     itemId?{kind:'gear',slot,itemId}:null),
    onEquip:(slot,itemId)=>{
     const original=gallerySources.get(slot);
     if(!original||original.disabled||
      original.querySelector<HTMLOptionElement>(
       'option[value="'+CSS.escape(itemId)+'"]')?.disabled)return;
     if(['rig','belt','backpack'].includes(slot)){
      const carrySlot=slot as CarryGearSlot;
      const quote=quoteCarryGearChange(person.loadout,person.magazines,
       carrySlot,itemId);
      if(!quote.ok||!quote.changed)return;
      this.carryUndo.record(id,captureCarryUndo(person.loadout,person.magazines),
       captureCarryUndo(quote.kit,quote.magazines));
      this.handlers.equipCarryGear(id,carrySlot,itemId);
     }else{
      original.value=itemId;
      original.dispatchEvent(new Event('change',{bubbles:true}));
     }
    },
    onArsenal:()=>{if(!arsenal.disabled)this.handlers.openArsenal(id);},
    arsenalDisabled:arsenal.disabled,
    onAdvanced:()=>{
    galleryRoot.hidden=true;advanced.hidden=true;carryPanel.hidden=false;
   }
   });
   this.outfitterGallery=gallery;
   showGallery=slot=>gallery.show(slot);
   gallery.show(this.activeBenchSlot);
   main.dataset.kitWorkspace='unified';
  }
  grid.append(editor);main.append(grid);
  this.root.append(main);
  if(this.weaponView){
   const onSocket=(socket:WorkbenchSocket)=>{
    const bodyPart=socket.startsWith('body-')?
     socket.slice(5) as FamilyPartSlot:null;
    const select=bodyPart?familySelectors.get(bodyPart):
     mountSelectors.get(socket as WeaponAttachmentSlot);
    if(!select)return;
    this.selectedWorkbenchSocket=socket;
    legacyControls.open=true;
    if(bodyPart)familyEditor.open=true;
    else{attachments.open=true;this.selectedMount=socket as WeaponAttachmentSlot;}
    // Preserve Campaign stock/purchase authority on the NEW select handler.
    this.workbench?.showSocketChoices(socket,select);
   };
   const core=person.weapon+'|'+(person.weaponConfiguration.build?.parts.receiver??'legacy')+
    '|'+(person.weaponConfiguration.build?.parts.barrel??'none');
   const previousWorkbenchCore=this.workbenchCore;
   const visualKey=JSON.stringify(person.weaponConfiguration);
   const refreshGeometry=!this.workbench||!sameOperator||
    this.workbenchVisualKey!==visualKey;
   if(this.workbench){
    if(refreshGeometry&&sameOperator&&this.workbenchCore===core){
     const view=this.workbench.getViewState();
     if(view)this.weaponWorkbenchViews.set(id,{core,view});
    }
    this.workbench.attachHost(preview,onSocket);
    if(refreshGeometry)this.workbench.setConfiguration(person.weaponConfiguration);
   }else this.workbench=new WeaponWorkbenchPreview(
    preview,person.weaponConfiguration,onSocket);
   this.workbenchCore=core;this.workbenchVisualKey=visualKey;
   const savedView=this.weaponWorkbenchViews.get(id);
   if(refreshGeometry){
    if(savedView?.core===core)this.workbench.restoreViewState(savedView.view);
    else if(previousWorkbenchCore&&
     (!sameOperator||previousWorkbenchCore!==core))
     this.workbench.resetViewState();
   }
   const remembered=this.selectedWorkbenchSocket;
   const savedSelect=remembered?.startsWith('body-')?
    familySelectors.get(remembered.slice(5) as FamilyPartSlot):
    remembered?mountSelectors.get(remembered as WeaponAttachmentSlot):undefined;
   if(remembered&&savedSelect)
    this.workbench.showSocketChoices(remembered,savedSelect);
   else this.workbench.setActiveSlot(build?'body-receiver':this.selectedMount,false);
  }else{
   if(retainOperatorPreview&&this.preview){
    this.preview.setOperatorId(id);
    this.preview.attachHost(preview,false);
    this.preview.updateEquipment(person.weapon,person.appearanceSeed,person.loadout,
     person.weaponConfiguration,person.magazines,person.wardrobe);
   }else{
    this.preview=new CampaignKitPreview(preview,person.id,person.weapon,
     person.appearanceSeed,person.loadout,person.weaponConfiguration,
     person.magazines,person.wardrobe,
     previewFocusForGroup[this.activeKitGroup],this.operatorViewAngles.get(id));
   }
   // Operator geometry is the primary edit target; direct body-zone
   // buttons provide a precise fallback on small screens and for keyboard.
   this.preview?.setOnTapSlot(slot=>selectBenchSlot(slot,true));
   this.preview?.setSelectedSlot(this.activeBenchSlot,false);
   this.preview?.setWeaponPresentation(this.inspectionWeaponVisible);
   if(this.preview)this.preview.onWeaponVisibilityChange=held=>{
    this.inspectionWeaponVisible=held;
   };
   if(compact){
    const card=selectedItems.get(this.activeBenchSlot);
    if(card&&person.loadout.slots[this.activeBenchSlot]===card)
     this.preview?.selectItemDot({
      kind:'gear',slot:this.activeBenchSlot,itemId:card
     });
   }
   // No inert orbit buttons if a device cannot initialize WebGL.
   if(!this.preview?.isReady())
    for(const control of summary.querySelectorAll<HTMLButtonElement>(
     '.campaign-kit-preview-controls button'))control.disabled=true;
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
  const objectiveLevel=contractObjectiveIntel(c);
  card.append(node('p','campaign-note',
   'OBJECTIVE INTEL · '+objectiveLevel.toUpperCase()+
   (c.followUpOf?' · LINKED CASE LEAD':'')));
  const cost=objectiveLevel==='unknown'?1:objectiveLevel==='approximate'?2:0;
  if(cost&&c.status==='available'&&!campaign.activeContractId){
   const recon=button('RECON + '+(objectiveLevel==='unknown'?
    'APPROXIMATE AREA':'CONFIRMED ROOM')+' · '+cost+' INTEL',
    ()=>this.handlers.reconContract(c.id));
   recon.disabled=campaignIntelBalance(campaign)<cost;
   recon.title='AVAILABLE INTEL: '+campaignIntelBalance(campaign);
   card.append(recon);
  }
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
  if(contract.recoveryOperatorId){
   const patient=campaign.operators.find(o=>o.id===contract.recoveryOperatorId);
   add('MISSING OPERATOR',
    (patient?.callsign??'UNKNOWN')+
    ' · MUST DRAG OR CARRY TO EXTRACTION · MEDICAL FATE UNCONFIRMED');
  }
  add('OBJECTIVE WHEREABOUTS',({
   unknown:'Unknown · team must search the building',
   approximate:'Approximate section · several possible rooms',
   confirmed:'Confirmed objective room · exact marker authorized'
  } as const)[contractObjectiveIntel(contract)]);
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
    member.weapon.toUpperCase()+' · '+(member.status==='lost'?
     'MISSING · FATE UNCONFIRMED':member.status==='retired'?
     'RETIRED':member.recoveryDays>0?
     'RECOVERING '+member.recoveryDays+' DAYS':'READY')));
   roster.append(person);
  }
  if(!assigned.length)roster.append(node('p','campaign-note','NO SQUAD ASSIGNED'));
  panel.append(roster);
  const cautions:string[]=[];
  if(assigned.length<4)cautions.push('Only '+assigned.length+' of 4 squad slots filled');
  if(assigned.some(p=>p.recoveryDays>0))cautions.push('Assigned operator still recovering');
  if(!campaignSquadPresent(campaign))cautions.push(
   'Four ready operators required. Replace missing, retired or recovering personnel.');
  if(campaign.supplies.ammo<60)cautions.push('Low ammunition stock for future resupply');
  if(campaign.supplies.medical===0)cautions.push('No spare medical kits in stock');
  if(cautions.length){
   const warnings=node('div','campaign-preflight-warning');
   warnings.append(node('strong','','READINESS ADVISORIES'));
   for(const warning of cautions)warnings.append(node('p','',warning));
   const repairActions=node('div','campaign-preflight-fix-actions');
   const needsSquad=!campaignSquadPresent(campaign)||
     assigned.some(p=>p.recoveryDays>0);
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
  deploy.disabled=!campaignSquadPresent(campaign);
  if(deploy.disabled)deploy.title='Assign four ready operators; missing, retired, and recovering personnel cannot deploy';
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
