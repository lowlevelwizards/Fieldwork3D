/** L2.4 — shared squad/operator selector for preparation surfaces.
 * No simulation state, rendering loop, stock or persistence authority.
 */
import './loadout-prep.css';
export type PrepOperatorTab={
 id:string;name:string;detail:string;status?:string;
};
export function createLoadoutSquadRail(
 entries:readonly PrepOperatorTab[],selectedId:string,
 onSelect:(id:string)=>void):HTMLElement{
 const nav=document.createElement('nav');
 nav.className='fw-prep-squad-rail';
 nav.setAttribute('aria-label','Choose operator to prepare');
 const buttons:HTMLButtonElement[]=[];
 for(let i=0;i<entries.length;i++){
  const member=entries[i];
  const button=document.createElement('button');
  button.type='button';button.className='fw-prep-squad-tab';
  button.dataset.selected=String(member.id===selectedId);
  button.setAttribute('aria-current',member.id===selectedId?'true':'false');
  button.setAttribute('aria-label','Prepare '+member.name+' · '+member.detail);
  const number=document.createElement('span');number.className='fw-prep-squad-number';
  number.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('strong');name.textContent=member.name;
  const detail=document.createElement('small');
  detail.textContent=member.status??member.detail;
  button.append(number,name,detail);
  button.addEventListener('click',()=>onSelect(member.id));
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
    (i+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
   buttons[next]?.focus();buttons[next]?.click();
  });
  buttons.push(button);nav.append(button);
 }
 return nav;
}
