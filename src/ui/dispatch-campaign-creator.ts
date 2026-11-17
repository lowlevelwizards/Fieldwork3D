/** D12 Dispatch campaign creation. Presets are editable rule bundles,
 * not separate game engines. No extra WebGL viewport or rendering loop.
 */
import {DISPATCH_PRESETS,DISPATCH_PRESET_LABELS,DISPATCH_PRESET_DESCRIPTIONS,
 dispatchPresetDraft,createDispatchSetup,type DispatchCampaignDraft,
 type DispatchPreset} from '../dispatch-campaign-setup.ts';
import '../ui/campaign-creator.css';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{
 const e=document.createElement(tag);if(text)e.textContent=text;return e;
};
const field=(text:string)=>{const label=el('label');label.className='campaign-creator-field';
 label.append(el('span',text));return label;};
const makeSelect=(title:string,choices:readonly (readonly [string,string])[],
 parent:HTMLElement)=>{
 const holder=field(title),select=el('select');select.setAttribute('aria-label',title);
 for(const [value,label] of choices){const option=el('option',label);option.value=value;select.append(option);}
 holder.append(select);parent.append(holder);return select;
};
export function renderDispatchCampaignCreator(root:HTMLElement,options:{
 hasDispatch:boolean;
 onCancel:()=>void;onExport:()=>void;
 onCreate:(draft:DispatchCampaignDraft)=>Promise<boolean|null>;
}){
 root.replaceChildren();
 const main=el('main');main.className='campaign-shell campaign-creator';
 const header=el('header');header.append(el('small','FIELDWORK / DISPATCH'),
  el('h1','CREATE DISPATCH CAMPAIGN'));
 main.append(header,el('p','Choose a career preset, or customize its rules. Dispatch determines the incident and department setting; sandbox freedom is independent.'));
 const form=el('form');form.noValidate=true;
 const preset=makeSelect('EXPERIENCE PRESET',DISPATCH_PRESETS.map(id=>
  [id,DISPATCH_PRESET_LABELS[id]] as const),form);
 const description=el('p');description.className='campaign-creator-summary';form.append(description);
 const settings=el('details');settings.className='campaign-creator-future';
 settings.append(el('summary','CUSTOMIZE CAMPAIGN RULES'));
 const fields=el('div');fields.className='campaign-creator-fields';
 const appearance=makeSelect('STARTING APPEARANCE',[
  ['us-swat-2015','US SWAT · 2015 (M4A1)'],
  ['us-swat-mp5-1995','US SWAT · 1995 (MP5A3)'],
  ['russian-omon-2002','Russian OMON · 2002 (AKS-74U)']
 ],fields);
 const time=makeSelect('TIME',[
  ['fixed','Fixed historical period'],['progressive','Progress across authored eras'],
  ['unrestricted','No calendar restrictions']
 ],fields);
 const scope=makeSelect('EQUIPMENT CATALOG',[
  ['department','Chosen tactical reference'],['dispatch','All curated Dispatch items'],
  ['global','All supported Fieldwork items']
 ],fields);
 const unlock=makeSelect('UNLOCK ACCESS',[
  ['historical','Historical availability'],['career','Career authorizations'],
  ['both','Historical + career'],['all','All eligible items available']
 ],fields);
 const economy=makeSelect('ECONOMY',[
  ['standard','Normal funds and purchases'],['unlimited','Unlimited operating funds']
 ],fields);
 const inventory=makeSelect('STARTING ARMORY',[
  ['issued','Issued squad equipment'],['all','Full basic weapon-class stock']
 ],fields);
 settings.append(fields);form.append(settings);
 const warning=el('p');warning.className='campaign-creator-error';
 warning.setAttribute('role','status');form.append(warning);
 const notes=el('p');notes.className='campaign-creator-summary';
 notes.textContent='Era progression currently supports two authored US SWAT snapshots (1995 → 2015), advancing after 10 completed operations. It does not simulate every historical year. Older gear stays owned. Patrol gameplay and named agency issue records are not implemented.';
 form.append(notes);
 const actions=el('div');actions.className='campaign-creator-actions';
 const cancel=el('button','CANCEL');cancel.type='button';cancel.addEventListener('click',options.onCancel);
 const create=el('button','CREATE DISPATCH');create.type='submit';
 create.className='campaign-primary';actions.append(cancel,create);form.append(actions);
 if(options.hasDispatch){
  const saved=el('div');saved.className='campaign-creator-restore';
  saved.append(el('p','Creating a new Dispatch campaign replaces only the Dispatch save after confirmation.'));
  const exportButton=el('button','EXPORT EXISTING DISPATCH SAVE');
  exportButton.type='button';exportButton.addEventListener('click',options.onExport);
  saved.append(exportButton);form.insertBefore(saved,actions);
 }
 const selects=[appearance,time,scope,unlock,economy,inventory];
 const read=():DispatchCampaignDraft=>({
  preset:preset.value as DispatchPreset,referenceId:appearance.value as DispatchCampaignDraft['referenceId'],
  timeMode:time.value as DispatchCampaignDraft['timeMode'],
  equipmentScope:scope.value as DispatchCampaignDraft['equipmentScope'],
  unlockMode:unlock.value as DispatchCampaignDraft['unlockMode'],
  economy:economy.value as DispatchCampaignDraft['economy'],
  startingInventory:inventory.value as DispatchCampaignDraft['startingInventory']
 });
 const refresh=()=>{
  const draft=read();let valid=true;
  try{createDispatchSetup(draft);}catch{valid=false;}
  create.disabled=!valid;warning.textContent=valid?'':'Progressive time requires the 1995 US SWAT starting reference; a full starting armory requires global equipment.';
 };
 const presetChanged=()=>{
  const draft=dispatchPresetDraft(preset.value as DispatchPreset);
  const vals=[draft.referenceId,draft.timeMode,draft.equipmentScope,
   draft.unlockMode,draft.economy,draft.startingInventory];
  selects.forEach((select,i)=>{select.value=vals[i];});
  description.textContent=DISPATCH_PRESET_DESCRIPTIONS[draft.preset];
  refresh();
 };
 preset.addEventListener('change',presetChanged);
 for(const select of selects)select.addEventListener('change',refresh);
 let submitting=false;
 form.addEventListener('submit',event=>{
  event.preventDefault();refresh();if(create.disabled||submitting)return;
  submitting=true;create.disabled=true;
  void options.onCreate(read()).then(ok=>{
   if(ok===false)warning.textContent='Dispatch campaign could not be saved. Existing saves are unchanged.';
  }).catch(()=>{warning.textContent='Could not create campaign. Existing saves are unchanged.';})
   .finally(()=>{submitting=false;refresh();});
 });
 main.append(form);root.append(main);presetChanged();
}
