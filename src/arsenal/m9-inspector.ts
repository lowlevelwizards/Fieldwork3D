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
 overlay.className='arsenal-wb-screen arsenal-glock-workbench';
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
 const back=action('BACK TO ARSENAL');back.classList.add('arsenal-wb-back');
 const identity=document.createElement('div');identity.className='arsenal-wb-identity';
 const over=document.createElement('span');over.className='arsenal-overline';
 over.textContent='SECONDARY WEAPON / 3D ART PREVIEW';
 const heading=document.createElement('h2');
 heading.textContent=M9_APPEARANCE_REFERENCES.find(r=>r.id===id)?.name??'BERETTA';
 const note=document.createElement('small');note.className='arsenal-wb-dirty';
 note.textContent='VISUAL ONLY · NOT ISSUED · NO GAMEPLAY';
 identity.append(over,heading,note);
 const actions=document.createElement('div');actions.className='arsenal-wb-actions';
 const controls=document.createElement('div');controls.className='arsenal-wb-utility-actions';
 const side=action('SIDE'),opposite=action('OTHER SIDE'),
  orbit=action('3/4 VIEW'),clay=action('CLAY');
 controls.append(side,opposite,orbit,clay);actions.append(controls);
 header.append(back,identity,actions);
 const main=document.createElement('div');main.className='arsenal-wb-main';
 const stage=document.createElement('div');stage.className='arsenal-wb-stage';
 const host=document.createElement('div');host.className='arsenal-wb-viewport glock-wb-viewport';
 stage.append(host);
 const footer=document.createElement('section');
 footer.className='arsenal-wb-panel glock-wb-panel';
 const label=document.createElement('p');label.className='glock-wb-note';
 label.textContent='Fieldwork miniature 3D study. Rotate or pinch the model to inspect its real open-top slide, trigger-guard aperture and independent variant proportions. Equipment, firing and saved builds are not enabled.';
 footer.append(label);main.append(stage,footer);overlay.append(header,main);
 document.body.append(overlay);
 document.body.style.overflow='hidden';
 const viewport=new GlockViewport(host,id);
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
 side.addEventListener('click',()=>viewport.side());
 opposite.addEventListener('click',()=>viewport.opposite());
 orbit.addEventListener('click',()=>viewport.reset());
 clay.addEventListener('click',()=>{
  monochrome=!monochrome;viewport.setModel(id,monochrome);
  clay.setAttribute('aria-pressed',String(monochrome));
 });
}
