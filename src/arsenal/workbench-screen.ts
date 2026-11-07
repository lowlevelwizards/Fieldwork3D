/** Stage 4 standalone inspection shell; part replacement arrives in Stage 5.
 * The same root will host draft editing; never manipulate Campaign inventory here.
 */
import {ARSENAL_CATEGORIES,arsenalPart,
 type ArsenalCategory,type ArsenalSlot,type ArsenalReference} from './catalog.ts';
import {arsenalRecipeFromLegacy} from './recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../equipment-weapon-assemblies.ts';
import {ArsenalViewport} from './viewport.ts';

export function openArsenalWorkbench(ref:ArsenalReference):void{
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(ref.legacy.weapon),ref.id);
 const recipe=arsenalRecipeFromLegacy(config);if(!recipe)return;
 const overlay=document.createElement('section');overlay.className='arsenal-wb-screen';
 overlay.setAttribute('aria-label','Weapon inspection workbench');
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 const head=document.createElement('header');head.className='arsenal-wb-head';
 const back=document.createElement('button');back.className='arsenal-wb-action';
 back.type='button';back.textContent='BACK TO ARSENAL';
 const identity=document.createElement('div');identity.className='arsenal-wb-identity';
 const kicker=document.createElement('span');kicker.className='arsenal-overline';
 kicker.textContent='WEAPON WORKBENCH';
 const title=document.createElement('h2');title.textContent=ref.name;
 identity.append(kicker,title);
 const actions=document.createElement('div');actions.className='arsenal-wb-actions';
 const fit=document.createElement('button');fit.type='button';fit.className='arsenal-wb-action';fit.textContent='FIT';
 const side=document.createElement('button');side.type='button';side.className='arsenal-wb-action';side.textContent='SIDE';
 actions.append(fit,side);head.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const viewportHost=document.createElement('div');viewportHost.className='arsenal-wb-viewport';
 const nav=document.createElement('nav');nav.className='arsenal-wb-nav';
 nav.setAttribute('aria-label','Weapon component categories');
 const panel=document.createElement('section');panel.className='arsenal-wb-panel';
 const panelTitle=document.createElement('h3');
 const slotRow=document.createElement('div');slotRow.className='arsenal-wb-slots';
 const activeLabel=document.createElement('p');activeLabel.className='arsenal-wb-current';
 const hint=document.createElement('p');hint.className='arsenal-wb-hint';
 hint.textContent='Select a category or tap a component to inspect it. Component replacement is the next integration stage.';
 panel.append(panelTitle,slotRow,activeLabel,hint);
 main.append(viewportHost,nav,panel);
 overlay.append(head,main);document.body.append(overlay);
 let activeCategory:ArsenalCategory=ARSENAL_CATEGORIES[0];
 let activeSlot:ArsenalSlot='receiver';
 const viewer=new ArsenalViewport(viewportHost,recipe,slot=>{
  const category=ARSENAL_CATEGORIES.find(c=>c.slots.includes(slot));
  if(category){activeCategory=category;activeSlot=slot;renderSelection();}
 });
 function currentPart(slot:ArsenalSlot):string{
  const id=slot in recipe.parts?
   recipe.parts[slot as keyof typeof recipe.parts]:
   recipe.accessories[slot as keyof typeof recipe.accessories];
  return arsenalPart(id)?.name??id;
 }
 function renderSelection(){
  nav.replaceChildren();
  for(const category of ARSENAL_CATEGORIES){
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-wb-category';button.textContent=category.name;
   button.setAttribute('aria-pressed',String(activeCategory.id===category.id));
   button.addEventListener('click',()=>{
    activeCategory=category;activeSlot=category.slots[0];
    viewer.setSelectedSlot(activeSlot);renderSelection();
   });nav.append(button);
  }
  panelTitle.textContent=activeCategory.name.toUpperCase();
  slotRow.replaceChildren();
  if(activeCategory.slots.length>1)for(const slot of activeCategory.slots){
   const button=document.createElement('button');button.type='button';
   button.className='arsenal-wb-subslot';button.textContent=slot==='opticMount'?'Mount':
    slot==='foregrip'?'Foregrip':slot.charAt(0).toUpperCase()+slot.slice(1);
   button.setAttribute('aria-pressed',String(activeSlot===slot));
   button.addEventListener('click',()=>{
    activeSlot=slot;viewer.setSelectedSlot(slot);renderSelection();
   });slotRow.append(button);
  }
  activeLabel.textContent='CURRENT · '+currentPart(activeSlot);
  viewer.setSelectedSlot(activeSlot);
 }
 renderSelection();
 fit.addEventListener('click',()=>viewer.fit());
 side.addEventListener('click',()=>viewer.sideView());
 const close=()=>{
  viewer.dispose();overlay.remove();window.removeEventListener('keydown',keys);
  document.body.style.removeProperty('overflow');
 };
 const keys=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();close();}
 };
 back.addEventListener('click',close);
 window.addEventListener('keydown',keys);
 document.body.style.overflow='hidden';
 back.focus();
}
