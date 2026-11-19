/** L2.2 — one touch-first physical field inventory editor for Quick Play
 * and Campaign. Rendering never owns supply, stock or mission authority.
 */
import type {EquipmentLoadout} from '../equipment-loadouts.ts';
import type {MagazineItem} from '../breach-magazines.ts';
import {FIELD_ITEMS,FIELD_CARRY_LOCATIONS,fieldQuantity,initialFieldInventory,
 replaceFieldQuantity,moveFieldStack,fieldCarryReport,autoPackFieldInventory,
 type FieldInventory,type FieldItemId,type FieldCarryLocation}
 from '../equipment-field-inventory.ts';
import './loadout-prep.css';

export type FieldGadgetEditorOptions={
 loadout:EquipmentLoadout;magazines:readonly MagazineItem[];
 onCommit:(inventory:FieldInventory)=>void;
 locked?:boolean;
 maxFlash?:number;
};
const text=(tag:'div'|'span'|'strong'|'small'|'p',className:string,value:string)=>{
 const el=document.createElement(tag);el.className=className;el.textContent=value;
 return el;
};
const btn=(label:string,action:()=>void)=>{
 const element=document.createElement('button');element.type='button';
 element.textContent=label;element.addEventListener('click',action);return element;
};
export function createFieldGadgetEditor(options:FieldGadgetEditorOptions):HTMLElement{
 const {loadout,magazines,onCommit}=options;
 const inventory=loadout.fieldInventory??initialFieldInventory(loadout);
 const root=document.createElement('section');
 root.className='fw-field-inventory';
 root.setAttribute('aria-label','Physical field inventory');
 const header=text('div','fw-field-inventory-heading','');
 header.append(text('strong','','FIELD EQUIPMENT'),
  text('small','','PHYSICAL QUANTITIES · ACCESS & CAPACITY'));
 root.append(header);
 const report=fieldCarryReport(loadout,magazines,inventory);
 const locations=FIELD_CARRY_LOCATIONS.map(loc=>{
  const used=report.used[loc],limit=report.capacity[loc];
  return loc.toUpperCase()+' '+used+'/'+limit;
 });
 const capacity=text('div','fw-field-inventory-capacity',locations.join(' · '));
 root.append(capacity);
 const message=text('p','fw-field-inventory-feedback',report.valid?
  'Equipment is assigned to real carrying positions.':'CARRY CONFLICT · '+report.conflicts.join(' · '));
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 root.append(message);
 const feedback=(value:string)=>{message.textContent=value;};
 const attempt=(candidate:FieldInventory)=>{
  const checked=fieldCarryReport(loadout,magazines,candidate);
  if(checked.valid){onCommit(candidate);return;}
  const repacked=autoPackFieldInventory(loadout,magazines,candidate);
  if(repacked&&fieldCarryReport(loadout,magazines,repacked).valid){
   onCommit(repacked);return;
  }
  feedback('NO AVAILABLE SPACE · '+checked.conflicts.join(' · '));
 };
 for(const id of ['flashbang','wedge','smoke','frag','door-charge','chem-light'] as FieldItemId[]){
  const item=FIELD_ITEMS[id];
  const enabled=item.usable&&(id!=='wedge'||loadout.slots.utility==='utility-wedge');
  const disabled=!!options.locked||!enabled;
  const current=fieldQuantity(inventory,id);
  const stockCap=id==='flashbang'?Math.max(0,options.maxFlash??item.maxPerOperator):
   item.maxPerOperator;
  const max=Math.min(item.maxPerOperator,stockCap);
  const row=document.createElement('div');row.className='fw-field-inventory-item';
  if(!enabled)row.dataset.unavailable='true';
  const copy=document.createElement('div');copy.className='fw-field-inventory-copy';
  copy.append(text('strong','',item.name),
   text('small','',enabled?item.massKg.toFixed(2)+' kg each · '+item.description:
    id==='wedge'?'Equip Door Wedges in Utility to carry physical wedges':
    'FUTURE EQUIPMENT · NOT YET OPERATIONAL'));
  row.append(copy);
  const controls=document.createElement('div');
  controls.className='fw-field-inventory-controls';
  const down=btn('−',()=>attempt(replaceFieldQuantity(inventory,id,current-1,
   id==='wedge'?'belt':'rig')));
  down.setAttribute('aria-label','Remove one '+item.name);
  down.disabled=disabled||current===0;
  const amount=text('span','fw-field-inventory-quantity','×'+current);
  amount.setAttribute('aria-label',current+' '+item.name+' carried');
  const up=btn('+',()=>attempt(replaceFieldQuantity(inventory,id,current+1,
   id==='wedge'?'belt':'rig')));
  up.setAttribute('aria-label','Add one '+item.name);
  up.disabled=disabled||current>=max;
  controls.append(down,amount,up);row.append(controls);
  if(current&&enabled){
   const placement=document.createElement('select');
   placement.className='fw-field-inventory-location';
   placement.setAttribute('aria-label','Move '+item.name+' to carrying location');
   const unique=new Set(inventory.stacks.filter(s=>s.itemId===id).map(s=>s.location));
   const selected=unique.size===1?[...unique][0]:null;
   if(!selected){
    const option=document.createElement('option');
    option.value='';option.textContent='MIXED PLACEMENT';placement.append(option);
   }
   for(const loc of FIELD_CARRY_LOCATIONS){
    if(!item.locations.includes(loc))continue;
    const option=document.createElement('option');option.value=loc;
    option.textContent=loc.toUpperCase();placement.append(option);
   }
   placement.value=selected??'';
   placement.disabled=!!options.locked;
   placement.addEventListener('change',()=>{
    const to=placement.value as FieldCarryLocation;
    let next=inventory;
    for(const location of FIELD_CARRY_LOCATIONS)
     if(location!==to)next=moveFieldStack(next,id,location,to);
    // Explicit placement never silently repacks to another location.
    const status=fieldCarryReport(loadout,magazines,next);
    if(status.valid)onCommit(next);
    else {placement.value=selected??'';feedback(status.conflicts.join(' · '));}
   });
   row.append(placement);
  }
  root.append(row);
 }
 const actions=document.createElement('div');actions.className='fw-field-inventory-actions';
 const autopack=btn('AUTO PACK',()=>{
  const packed=autoPackFieldInventory(loadout,magazines,inventory);
  if(packed)onCommit(packed);
  else feedback('AUTO PACK UNAVAILABLE · ADJUST LOAD OR CARRYING EQUIPMENT');
 });
 autopack.disabled=!!options.locked;
 actions.append(autopack);root.append(actions);
 return root;
}
