import {uiNode as node,uiButton as button} from '../dom-elements.ts';
import type {CampaignState,Contract} from '../../campaign-state.ts';
import type {CampaignHandlers} from '../../campaign-ui.ts';
import {SQUAD_IDENTIFICATION_COLORS,SKILL_NAMES} from '../../campaign-state.ts';
import {isDispatchPilot,mayChooseCampaignContent} from '../../dispatch-campaign-eligibility.ts';
import {sharedService} from '../../campaign-history.ts';
import {kitMedicalSupplies,medicalSupplyCount} from '../../equipment-medical-supplies.ts';
import {quoteCampaignOperatorRefill} from '../../equipment-campaign-squad-refill.ts';
/** One personnel panel; actions are forwarded to the existing campaign facade. */
export function renderCampaignPersonnel(c:CampaignState,root:HTMLElement,
 handlers:Pick<CampaignHandlers,'assignSlot'|'openStudio'|'equipWeapon'|'resupply'|'resupplyMedical'|'treat'|'retire'>,
 selectedOperatorId:string|null,onSelect:(id:string|null)=>void,
 expandedOperatorTools:Set<string>,expandedOperatorCare:Set<string>,openLoadout:(id:string)=>void){
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
  const selectedId=validOperators.find(p=>p.id===selectedOperatorId)?.id
   ??validOperators.find(p=>c.squadIds.includes(p.id))?.id
   ??validOperators[0]?.id??'';
  onSelect(selectedId||null);
  const selectOperator=(id:string)=>{
   onSelect(id);
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
     handlers.assignSlot(slot,p.id);
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
   tools.open=expandedOperatorTools.has(p.id)||p.id===selectedId;
   tools.addEventListener('toggle',()=>{
    if(tools.open)expandedOperatorTools.add(p.id);
    else expandedOperatorTools.delete(p.id);
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
     overlay.remove();openLoadout(p.id);
    },'campaign-primary');
    const look=button('OPERATOR STUDIO',()=>{
     overlay.remove();handlers.openStudio(p.id);
    });
    look.disabled=!!c.activeContractId;
    actions.append(loadout,look);panel.append(actions);
    overlay.append(panel);root.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
    overlay.addEventListener('keydown',e=>{
     if(e.key==='Escape'){e.preventDefault();dismiss();return;}
     if(e.key!=='Tab')return;
     const items=Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not(:disabled),summary')).filter(el=>el.getClientRects().length>0);
     const first=items[0],last=items[items.length-1];
     if(e.shiftKey&&root.ownerDocument.activeElement===first){e.preventDefault();last?.focus();}
     else if(!e.shiftKey&&root.ownerDocument.activeElement===last){e.preventDefault();first?.focus();}
    });
    close.focus({preventScroll:true});
   },'campaign-person-profile');
   profile.setAttribute('aria-label','View '+p.callsign+' service dossier');
   const actions=node('div','campaign-person-actions');
   const care=node('details','campaign-person-care');
   care.open=expandedOperatorCare.has(p.id);
   care.addEventListener('toggle',()=>{
    if(care.open)expandedOperatorCare.add(p.id);
    else expandedOperatorCare.delete(p.id);
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
   weaponPick.addEventListener('change',()=>handlers.equipWeapon(p.id,
    weaponPick.value as 'carbine'|'smg'|'rifle'|'shotgun'));
   const loadoutButton=button('LOADOUT',()=>{
    openLoadout(p.id);
   },'campaign-primary');
   loadoutButton.setAttribute('aria-label','Open '+p.callsign+' loadout');
   actions.append(loadoutButton);
   const look=button('APPEARANCE',()=>handlers.openStudio(p.id));
   look.disabled=!!c.activeContractId;
   look.setAttribute('aria-label','Edit '+p.callsign+' appearance in Operator Studio');
   actions.append(look);
   careActions.append(weaponPick);
   const refill=quoteCampaignOperatorRefill(c,p.id);
   const resupply=button('REFILL '+(refill?.roundsIssued??0)+' ROUNDS · '+
     (refill?.roundsWanted??0)+' NEEDED',()=>handlers.resupply(p.id));
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
    ()=>handlers.resupplyMedical(p.id));
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
     ()=>handlers.treat(p.id));
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
    const retire=button('RETIRE',()=>handlers.retire(p.id));
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
 return personnel;
}
