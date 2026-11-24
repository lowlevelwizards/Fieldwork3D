import {uiNode as node,uiButton as button} from '../dom-elements.ts';
import type {CampaignState} from '../../campaign-state.ts';
import type {CampaignHandlers} from '../../campaign-ui.ts';
import {isDispatchPilot} from '../../dispatch-campaign-eligibility.ts';
import {effectiveDispatchSetup} from '../../dispatch-campaign-setup.ts';
import {campaignWeaponQuote,CAMPAIGN_WEAPON_PLATFORMS} from '../../campaign-weapon-procurement.ts';
import {canAffordCampaignPurchase} from '../../campaign-state.ts';
import {quoteCampaignSquadRefill} from '../../equipment-campaign-squad-refill.ts';
import {FIELD_STOCK_PACKS,FIELD_STOCK_LIMIT} from '../../equipment-campaign-field-stock.ts';
/** Stock and procurement presentation. Quotes and mutations stay in existing owners. */
export function renderCampaignLogistics(c:CampaignState,
 handlers:Pick<CampaignHandlers,'resupplySquad'|'buyAmmo'|'buyMedical'|'buyFlash'|'buyWedges'|'buyWeapon'>,
 selectedSupplyIndex:number,onSelect:(index:number)=>void){
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
   handlers.resupplySquad,'campaign-primary');
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
   ['60 ROUNDS',120,handlers.buyAmmo],
   ['MEDICAL KIT',170,handlers.buyMedical],
   ['2 FLASHBANGS',150,handlers.buyFlash],
   [FIELD_STOCK_PACKS.wedges.name,FIELD_STOCK_PACKS.wedges.price,handlers.buyWedges]
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
   onSelect(choice);
   for(let i=0;i<stockButtons.length;i++){
    stockButtons[i].setAttribute('aria-pressed',String(i===choice));
    purchaseItems[i].hidden=i!==choice;
   }
  };
  selectStock(selectedSupplyIndex);
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
   const buy=button('PURCHASE '+weapon.toUpperCase(),()=>handlers.buyWeapon(weapon));
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
 return logistics;
}
