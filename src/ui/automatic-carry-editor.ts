/** BT8: quantity-only preparation editor for the staged unified authority.
 * No drag targets, manual moves, or numeric legacy carrier budget.
 * The host still owns stock authorization and commits a new snapshot. */
import {quoteUnifiedPreparation,unifiedPreparationSummary,type UnifiedPreparationSource} from '../equipment-unified-preparation.ts';
import {FIELD_ITEMS,FIELD_ITEM_IDS,fieldQuantity,readFieldInventory,replaceFieldQuantity,type FieldInventory,type FieldItemId,type FieldCarryLocation} from '../equipment-field-inventory.ts';
import {quoteUnifiedLoadout} from '../equipment-unified-loadout.ts';
type Options={locked?:boolean;maxFlash?:number;maxWedges?:number;
 onCommit:(inventory:FieldInventory,focusLabel?:string)=>void;
 onInspectLocation?:(location:FieldCarryLocation)=>void};
const el=(tag:string,className:string,value='')=>{
 const n=document.createElement(tag);n.className=className;n.textContent=value;return n;
};
export function createAutomaticCarryEditor(source:UnifiedPreparationSource,options:Options){
 const root=el('section','fw-field-inventory');root.dataset.carryMode='unified';
 root.setAttribute('aria-label','Automatic equipment storage');
 const inventory=readFieldInventory(source.loadout.fieldInventory,source.loadout);
 const {input,manifest}=quoteUnifiedLoadout({kit:source.loadout,wardrobe:source.wardrobe,magazines:source.magazines,
  primaryPart:source.weaponConfiguration?.build?.parts.magazine,shellReserve:source.weapon==='shotgun'?source.reserve:undefined});
 root.append(el('strong','','FIELD EQUIPMENT'),el('p','','Select quantities. Compatible storage and holders are fitted automatically.'));
 const status=el('p','fw-carry-change-preview-status',manifest.valid?'ALL REQUIRED ITEMS FIT':'UNPLACED ITEMS · '+manifest.unplaced.map(x=>x.id).join(' · '));
 status.setAttribute('role','status');root.append(status);
 const slots=el('div','fw-field-inventory-zones');
 for(const s of unifiedPreparationSummary(input,manifest)){
  if(!s.total&&!s.items)continue;
  const b=document.createElement('button');b.type='button';b.textContent=s.carrier.toUpperCase()+' · '+s.used+'/'+s.total+' POSITIONS';
  b.setAttribute('aria-label','Inspect '+s.carrier+' storage');
  b.addEventListener('click',()=>options.onInspectLocation?.(s.carrier==='armor'?'rig':s.carrier));
  slots.append(b);
 }
 root.append(slots);
 const rows=el('div','fw-field-inventory-automatic-rows');
 const change=(id:FieldItemId,quantity:number)=>{
  const next=replaceFieldQuantity(inventory,id,quantity);
  const q=quoteUnifiedPreparation(source,{kind:'field',inventory:next});
  if(!q.ok){status.textContent='CANNOT FIT · '+q.reason;return;}
  options.onCommit(q.kit.fieldInventory??next,FIELD_ITEMS[id].name+' quantity '+quantity);
 };
 for(const id of FIELD_ITEM_IDS){
  if(!FIELD_ITEMS[id].usable||id==='wedge'&&source.loadout.slots.utility!=='utility-wedge')continue;
  const current=fieldQuantity(inventory,id),limit=Math.min(FIELD_ITEMS[id].maxPerOperator,id==='flashbang'?options.maxFlash??Infinity:id==='wedge'?options.maxWedges??Infinity:Infinity);
  const row=el('div','fw-field-inventory-automatic-row');
  row.append(el('strong','',FIELD_ITEMS[id].name),el('span','',String(current)));
  for(const delta of [-1,1]){
   const b=document.createElement('button');b.type='button';b.textContent=delta<0?'−':'+';
   b.setAttribute('aria-label',(delta<0?'Remove one ':'Add one ')+FIELD_ITEMS[id].name);
   const count=current+delta,allowed=count>=0&&(delta<0||count<=limit);
   const next=allowed?quoteUnifiedPreparation(source,{kind:'field',inventory:replaceFieldQuantity(inventory,id,count)}):null;
   b.disabled=!!options.locked||!allowed||!next?.ok;
   if(next&&!next.ok)b.title=next.reason;
   b.addEventListener('click',()=>change(id,count));row.append(b);
  }
  rows.append(row);
 }
 root.append(rows);
 const contents=el('details','fw-field-inventory-automatic-details');
 const summary=el('summary','','VIEW FITTED EQUIPMENT');contents.append(summary);
 for(const p of manifest.placements){
  const title=p.holder??(p.concealed?'concealed storage':'authored pouch');
  contents.append(el('p','',p.carrier.toUpperCase()+' · '+title+' · '+p.itemIds.join(', ')));
 }
 root.append(contents);
 return root;
}
