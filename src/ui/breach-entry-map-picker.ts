/** Briefing insertion picker: map-visible DOM annotations over the existing
 * tactical renderer. No new world renderer, hidden-map discovery or orders.
 */
import type {Pt} from '../breach-core.ts';
import type {Site} from '../breach-site.ts';
import type {DeploymentChoice} from '../breach-deployment.ts';

export type EntryMapPoint={
 id:string;kind:DeploymentChoice['kind'];status:DeploymentChoice['status'];
 label:string;point:Pt
};
export function entryMapPoints(site:Pick<Site,'doors'|'windows'|'entrance'>,
 choices:readonly DeploymentChoice[]):EntryMapPoint[]{
 const all=[{id:'FRONT',kind:'primary' as const,status:'door' as const,
   approach:site.entrance},...choices.filter(choice=>choice.id!=='FRONT')];
 return all.map(entry=>{
   const door=site.doors.find(door=>door.id===entry.id);
   const window=site.windows?.find(window=>window.id===entry.id);
   const point=door?{x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2}:
     window?{x:window.x,y:window.y}:entry.approach;
   const label=entry.id==='FRONT'?'FRONT ENTRANCE':
     entry.kind==='window'?'WINDOW '+entry.id.toUpperCase().replaceAll('-',' '):
     entry.kind==='shutter'?'SHUTTER '+entry.id.toUpperCase().replaceAll('-',' '):
     entry.id.toUpperCase().replaceAll('-',' ');
   return {id:entry.id,kind:entry.kind,status:entry.status,
     label,point};
 });
}
export type EntryMapPickerHooks={
 getSite:()=>Site|null;getChoices:()=>readonly DeploymentChoice[];
 getSelected:()=>string;project:(point:Pt)=>Pt;
 select:(id:string)=>boolean;onExit:(confirmed:boolean)=>void;
};
const node=(tag:string,cls:string,text?:string)=>{
 const element=document.createElement(tag);
 element.className=cls;
 if(text!==undefined)element.textContent=text;
 return element;
};
export function createBreachEntryMapPicker(hooks:EntryMapPickerHooks){
 const root=node('section','fw-entry-map');
 root.hidden=true;root.setAttribute('role','dialog');
 root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','Select mission entry on map');
 const header=node('header','fw-entry-map-header');
 const intro=node('div','fw-entry-map-heading');
 intro.append(node('strong','','SELECT INSERTION'),
   node('span','','Tap a numbered marker or use the entry list'));
 const back=node('button','fw-entry-map-back','BACK TO BRIEF');
 (back as HTMLButtonElement).type='button';
 header.append(intro,back);
 const pins=node('div','fw-entry-map-pins');
 const footer=node('footer','fw-entry-map-footer');
 const list=node('div','fw-entry-map-choices');
 list.setAttribute('role','group');
 list.setAttribute('aria-label','Available entry points');
 const actions=node('div','fw-entry-map-actions');
 const status=node('strong','fw-entry-map-status');
 status.setAttribute('aria-live','polite');
 const confirm=node('button','fw-entry-map-confirm','CONFIRM ENTRY') as HTMLButtonElement;
 confirm.type='button';
 actions.append(status,confirm);
 footer.append(list,actions);
 root.append(header,pins,footer);
 document.body.append(root);
 let open=false,selection='FRONT',points:EntryMapPoint[]=[];
 const markers=new Map<string,HTMLButtonElement>();
 const listButtons=new Map<string,HTMLButtonElement>();
 const sync=()=>{
  for(const [id,button] of [...markers,...listButtons])
   button.setAttribute('aria-pressed',String(id===selection));
  const item=points.find(point=>point.id===selection);
  status.textContent=item?.label??'FRONT ENTRANCE';
 };
 const choose=(id:string)=>{
  selection=id;sync();
 };
 const reposition=()=>{
  if(!open)return;
  const width=innerWidth,height=innerHeight;
  for(const item of points){
   const button=markers.get(item.id);
   if(!button)continue;
   const projected=hooks.project(item.point);
   if(!Number.isFinite(projected.x)||!Number.isFinite(projected.y)){
     button.hidden=true;continue;
   }
   button.hidden=false;
   button.style.left=Math.max(46,Math.min(width-46,projected.x))+'px';
   button.style.top=Math.max(102,Math.min(height-130,projected.y))+'px';
  }
 };
 const dismiss=()=>{
  open=false;root.hidden=true;markers.clear();listButtons.clear();
  pins.replaceChildren();list.replaceChildren();
 };
 const close=(confirmed:boolean)=>{dismiss();hooks.onExit(confirmed);};
 back.addEventListener('click',()=>close(false));
 confirm.addEventListener('click',()=>{
  if(!hooks.select(selection)){status.textContent='ENTRY NO LONGER AVAILABLE';return;}
  close(true);
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close(false);}
 });
 return {
  get active(){return open;},
  open(){
   if(open)return;
   const site=hooks.getSite();if(!site)return;
   points=entryMapPoints(site,hooks.getChoices());
   selection=hooks.getSelected();
   pins.replaceChildren();list.replaceChildren();
   markers.clear();listButtons.clear();
   for(const [index,item] of points.entries()){
    const marker=node('button','fw-entry-map-pin',String(index+1)) as HTMLButtonElement;
    marker.type='button';marker.title=item.label;
    marker.setAttribute('aria-label',item.label);
    marker.addEventListener('click',()=>choose(item.id));
    pins.append(marker);markers.set(item.id,marker);
    const entry=node('button','fw-entry-map-choice',
      String(index+1).padStart(2,'0')+'  '+item.label) as HTMLButtonElement;
    entry.type='button';
    entry.addEventListener('click',()=>choose(item.id));
    list.append(entry);listButtons.set(item.id,entry);
   }
   open=true;root.hidden=false;
   sync();reposition();back.focus();
  },
  reposition,dismiss
 };
}
