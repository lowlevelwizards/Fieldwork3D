/** Art-only Beretta inspection using the SAME demand-render sidearm viewport
 * as the Glock workbench. No fake equip, magazines, or saved loadouts.
 */
import {GlockViewport} from './glock-viewport.ts';
import {M9_APPEARANCE_REFERENCES,type M9AppearanceId}
 from '../weapons/geometry/beretta-m9-silhouettes.ts';

export function openM9Inspector(id:M9AppearanceId):void{
 const active=document.activeElement instanceof HTMLElement?
  document.activeElement:null;
 const oldOverflow=document.body.style.overflow;
 const overlay=document.createElement('section');
 overlay.className='arsenal-wb-screen arsenal-glock-workbench arsenal-m9-inspector';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Beretta M9 family visual inspection');
 const header=document.createElement('header');
 header.className='arsenal-wb-head';
 const action=(label:string)=>{
  const button=document.createElement('button');
  button.type='button';button.className='arsenal-wb-action';
  button.textContent=label;return button;
 };
 const back=action('← ARSENAL');
 back.setAttribute('aria-label','BACK TO ARSENAL');
 back.classList.add('arsenal-wb-back');
 const identity=document.createElement('div');identity.className='arsenal-wb-identity';
 const over=document.createElement('span');over.className='arsenal-overline';
 over.textContent='SECONDARY / BERETTA';
 const heading=document.createElement('h2');
 heading.textContent=M9_APPEARANCE_REFERENCES.find(r=>r.id===id)?.name??'BERETTA';
 const note=document.createElement('small');note.className='arsenal-wb-dirty';
 note.textContent='3D ART PREVIEW · NOT ISSUED';
 identity.append(over,heading,note);
 const actions=document.createElement('div');actions.className='arsenal-wb-actions';
 const controls=document.createElement('div');controls.className='arsenal-wb-utility-actions';
 const side=action('SIDE'),opposite=action('OTHER SIDE'),
  orbit=action('3/4 VIEW'),top=action('TOP'),clay=action('CLAY');
 const viewButtons=[side,opposite,orbit,top];
 viewButtons.forEach(button=>button.setAttribute('aria-pressed',String(button===orbit)));
 clay.setAttribute('aria-pressed','false');
 controls.setAttribute('aria-label','3D inspection views');
 controls.append(side,opposite,orbit,top,clay);actions.append(controls);
 header.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const stage=document.createElement('div');stage.className='arsenal-wb-stage';
 const host=document.createElement('div');host.className='arsenal-wb-viewport glock-wb-viewport';
 stage.append(host);
 const footer=document.createElement('section');
 footer.className='arsenal-wb-panel glock-wb-panel';
 const label=document.createElement('p');label.className='glock-wb-note';
 label.textContent='DRAG TO ROTATE · PINCH TO ZOOM · VISUAL STUDY ONLY';
 footer.append(label);main.append(stage,footer);overlay.append(header,main);
 document.body.append(overlay);
 document.body.style.overflow='hidden';
 const viewport=new GlockViewport(host,id);
 viewport.useTightArtFraming();viewport.quarter();
 let monochrome=false,closed=false;
 const close=()=>{
  if(closed)return;closed=true;
  document.removeEventListener('keydown',onKey);
  viewport.dispose();overlay.remove();
  document.body.style.overflow=oldOverflow;active?.focus();
 };
 const onKey=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){e.preventDefault();close();}
 };
 document.addEventListener('keydown',onKey);
 back.addEventListener('click',close);
 const setView=(button:HTMLButtonElement,action:()=>void)=>{
  action();
  for(const candidate of viewButtons)
   candidate.setAttribute('aria-pressed',String(candidate===button));
 };
 side.addEventListener('click',()=>setView(side,()=>viewport.side()));
 opposite.addEventListener('click',()=>setView(opposite,()=>viewport.opposite()));
 orbit.addEventListener('click',()=>setView(orbit,()=>viewport.quarter()));
 top.addEventListener('click',()=>setView(top,()=>viewport.top()));
 clay.addEventListener('click',()=>{
  monochrome=!monochrome;viewport.setModel(id,monochrome);
  clay.setAttribute('aria-pressed',String(monochrome));
 });
}
