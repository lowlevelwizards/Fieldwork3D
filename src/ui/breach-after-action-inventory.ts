/** F4 — compact factual after-action inventory, no restock actions in debrief.
 * DOM belongs to the existing Squad pane; no new tabs/scroll-heavy tables.
 */
import type {AfterActionInventoryCloseout,OperatorInventoryCloseout,
 CloseoutQuantity} from '../breach-after-action-inventory.ts';
const el=(tag:string,cls='',value?:string)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};
const fmt=(s:CloseoutQuantity,unit:string)=>
 s.issued===null?
  s.remaining+' '+unit+' REMAIN · ISSUE NOT RECORDED':
  s.remaining+' / '+s.issued+' '+unit+
   (s.netUsed?' · '+s.netUsed+' NET USED':'');
const readiness=(op:OperatorInventoryCloseout):string=>{
 switch(op.readiness){
  case 'fresh-round':return 'FRESH ROUND · PREP LAYOUT RETAINED';
  case 'recovering':return 'RECOVERING · CHECK OPERATOR AVAILABILITY';
  case 'replenish':return 'REPLENISH · '+op.needs.join(' / ');
  case 'ready':return 'KIT READY FOR NEXT PREP';
  default:return 'READINESS NOT ASSESSED';
 }
};
const pairs=(op:OperatorInventoryCloseout):[string,CloseoutQuantity,string][]=>[
 ['AMMO',op.rounds,'ROUNDS'],['FLASH',op.flash,'FLASH'],
 ['WEDGES',op.wedges,'WEDGES'],
 ['MEDICAL',op.medical,'SUPPLIES']
];
export function renderAfterActionCarrySummary(
 op:OperatorInventoryCloseout,full=false):HTMLElement{
 const root=el('section','fw-f4-inventory');
 root.setAttribute('aria-label','Mission equipment closeout for '+op.name);
 const header=el('div','fw-f4-inventory-header');
 header.append(el('strong','','CARRIED KIT · MISSION CLOSEOUT'),
  el('span','fw-f4-status',readiness(op)));
 root.append(header);
 const tiles=el('div','fw-f4-inventory-tiles');
 for(const [label,quantity,unit] of pairs(op)){
  const tile=el('div','fw-f4-inventory-tile');
  tile.append(el('small','',label),el('strong','',fmt(quantity,unit)));
  tiles.append(tile);
 }
 root.append(tiles);
 if(full){
  const placement=el('div','fw-f4-placements');
  placement.append(el('strong','','REMAINING PHYSICAL LOCATIONS'));
  for(const [label,items] of [
   ['FLASH',op.carryLocations.flash],
   ['WEDGES',op.carryLocations.wedges]
  ] as const){
   const line=el('div','fw-f4-placement');
   line.append(el('span','',label),
     el('span','',items.length?items.join(' · '):'NONE CARRIED'));
   placement.append(line);
  }
  placement.append(el('p','fw-after-muted',
   'MAGAZINES '+op.spareMagazines+' SPARE · '+op.shots+' SHOTS FIRED'+
   (op.hasStartEvidence?' · INITIAL INVENTORY RECORDED':
     ' · INITIAL ISSUE NOT RECORDED')));
  root.append(placement);
 }
 if(op.manifestMismatch)
  root.append(el('p','fw-f4-warning',
    'CARRY COUNT DISAGREEMENT · CHECK INVENTORY RECORD'));
 if(op.readiness==='replenish'&&full)
  root.append(el('p','fw-after-muted',
    'RESTOCK FROM OPERATIONS / LOADOUT PREP · NO ITEMS ISSUED BY DEBRIEF'));
 if(op.readiness==='fresh-round'&&full)
  root.append(el('p','fw-after-muted',
    'QUICK PLAY RESTORES SPENT EQUIPMENT ON THE NEXT FRESH ROUND'));
 return root;
}
export function renderAfterActionTeamReadiness(
 report:AfterActionInventoryCloseout):HTMLElement{
 const root=el('section','fw-f4-squad-summary');
 root.setAttribute('aria-label','Next mission equipment readiness');
 const heading=el('div','fw-f4-inventory-header');
 heading.append(el('strong','','NEXT MISSION · EQUIPMENT'));
 if(report.mode==='quick')heading.append(el('span','','FRESH STOCK NEXT ROUND'));
 else if(report.mode==='mission'){
  const low=report.operators.filter(op=>op.readiness==='replenish').length;
  const recovery=report.operators.filter(op=>op.readiness==='recovering').length;
  heading.append(el('span','',
   (low?low+' NEED RESUPPLY · ':'')+
   (recovery?recovery+' RECOVERING':'REVIEW PREP')));
 }
 else heading.append(el('span','','NO CAMPAIGN SETTLEMENT'));
 root.append(heading);
 const row=el('div','fw-f4-team-row');
 for(const op of report.operators){
  const chip=el('div','fw-f4-team-chip');
  chip.append(el('strong','',op.name),
    el('small','',readiness(op)));
  row.append(chip);
 }
 root.append(row);
 if(report.hqStock){
  const {ammo,medical,flash,wedges}=report.hqStock;
  root.append(el('p','fw-f4-hq',
   'HQ SUPPLY · '+ammo+' ROUNDS · '+medical+' MEDICAL PACKS · '+
     flash+' FLASHBANGS · '+wedges+' WEDGES'));
 }
 return root;
}
