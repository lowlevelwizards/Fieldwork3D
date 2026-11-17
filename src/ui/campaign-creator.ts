/** C0.2: lightweight Sandbox Campaign setup. Pure draft validation owns rules. */
import {defaultCampaignDraft,validateCampaignDraft,type CampaignCreationDraft}
 from '../campaign-creation.ts';
import './campaign-creator.css';

const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{
 const e=document.createElement(tag);
 if(text)e.textContent=text;
 return e;
};
export function renderCampaignCreator(root:HTMLElement,options:{
 hasSandbox:boolean;
 onCancel:()=>void;
 onExportSandbox:()=>void;
 onCreate:(draft:CampaignCreationDraft)=>Promise<boolean|null>;
}):void{
 root.replaceChildren();
 const shell=element('main');
 shell.className='campaign-shell campaign-creator';
 const header=element('header');
 header.append(element('small','FIELDWORK / CLASSIC SANDBOX'),
  element('h1','CREATE SANDBOX CAMPAIGN'));
 const intro=element('p','Keep a persistent squad and campaign career. Choose your mission intelligence and map scale; other existing game rules remain in effect.');
 const form=element('form');
 form.noValidate=true;
 let draft=defaultCampaignDraft();
 const field=(label:string)=>{const row=element('label');row.className='campaign-creator-field';
  row.append(element('span',label));return row;};
 const nameField=field('CAMPAIGN NAME');
 const name=element('input');name.type='text';name.maxLength=40;
 name.value=draft.name;name.setAttribute('aria-label','Campaign name');
 nameField.append(name);
 const advanced=element('details');advanced.className='campaign-creator-future';
 advanced.append(element('summary','ADVANCED · REPRODUCIBLE SEED'));
 const seedField=field('CAMPAIGN SEED');
 const seed=element('input');seed.type='text';seed.inputMode='numeric';
 seed.placeholder='RANDOM';seed.setAttribute('aria-label','Campaign seed, blank for random');
 seedField.append(seed);
 advanced.append(seedField,element('p','Leave blank for a random seed. Set a positive whole number to reproduce campaign generation.'));
 const selectors=element('div');selectors.className='campaign-creator-fields';
 const makeChoice=(label:string,choices:readonly [string,string][],initial:string)=>{
  const row=field(label),select=element('select');select.setAttribute('aria-label',label);
  for(const [value,title] of choices){const o=element('option',title);o.value=value;select.append(o);}
  select.value=initial;row.append(select);selectors.append(row);return select;
 };
 const intel=makeChoice('MAP INTELLIGENCE',[
  ['contract','Follow contract'],['floor-plan','Always provide floor plan'],
  ['exterior-known','Exterior known'],['true-blind','True blind']
 ],draft.intel);
 const scale=makeChoice('MAP SCALE',[
  ['contract','Follow contract'],['standard','Standard'],
  ['expanded','Expanded']
 ],draft.scale);
 const fixed=element('details');fixed.className='campaign-creator-future';
 fixed.append(element('summary','WHAT PERSISTS?'),
  element('p','Operator careers, injuries, owned equipment, ammunition, weapon servicing and contracts persist. These systems are not customizable in Classic Sandbox.'));
 const review=element('section');review.className='campaign-creator-review';
 review.setAttribute('aria-label','Sandbox campaign review');
 const reviewTitle=element('h2','CAMPAIGN REVIEW');
 const summary=element('p');summary.className='campaign-creator-review-summary';
 review.append(reviewTitle,summary);
 const error=element('p');error.className='campaign-creator-error';
 error.setAttribute('role','status');
 const actions=element('div');actions.className='campaign-creator-actions';
 const cancel=element('button','CANCEL');cancel.type='button';
 cancel.addEventListener('click',options.onCancel);
 const create=element('button','CREATE SANDBOX CAMPAIGN');create.type='submit';
 create.className='campaign-primary';
 actions.append(cancel,create);
 const restore=element('div');restore.className='campaign-creator-restore';
 if(options.hasSandbox){
  restore.append(element('p','An existing Sandbox Campaign is saved. Creating another will replace it only after confirmation.'));
  const exportButton=element('button','EXPORT EXISTING SANDBOX SAVE');
  exportButton.type='button';exportButton.addEventListener('click',options.onExportSandbox);
  restore.append(exportButton);
 }
 const read=()=>({
  name:name.value,seed:seed.value,
  intel:intel.value as CampaignCreationDraft['intel'],
  scale:scale.value as CampaignCreationDraft['scale']
 });
 const refresh=()=>{
  draft=read();const validation=validateCampaignDraft(draft);
  create.disabled=!validation.ok||submitting;
  summary.textContent='INTELLIGENCE · '+(intel.selectedOptions[0]?.textContent??'')+
   ' · MAP · '+(scale.selectedOptions[0]?.textContent??'')+
   ' · '+(seed.value.trim()?'Fixed seed '+seed.value.trim():'Random seed');
  error.textContent=validation.ok?'':validation.error;
 };
 for(const input of [name,seed,intel,scale])input.addEventListener('input',refresh);
 let submitting=false;
 form.addEventListener('submit',event=>{
  event.preventDefault();if(submitting)return;
  refresh();if(create.disabled)return;
  submitting=true;create.disabled=true;
  void options.onCreate({...draft}).then(ok=>{
   if(ok===false){error.textContent='Campaign was not saved. Your existing campaign is unchanged.';}
  }).catch(()=>{error.textContent='Could not create campaign. Existing saves are unchanged.';})
   .finally(()=>{submitting=false;refresh();});
 });
 form.append(nameField,selectors,advanced,review,fixed,error,restore,actions);
 shell.append(header,intro,form);root.append(shell);
 refresh();name.focus({preventScroll:true});
}
