/** MAP 14: external security boards are real, damageable cover.
 * Curtains are held open; metal bars are narrow rail details that do not
 * falsely add continuous ballistic/LOS obstruction.
 */
import {type Site,type WindowTreatment} from '../breach-site.ts';
import {type Obstacle} from '../breach-core.ts';
const residential=new Set(['house','townhouse','apartment','motel']);
export function dressWindowSecurity(site:Site,seed:number):Site{
 let n=(seed^0x55e1ad70)>>>0;
 const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
   return n/4294967296;};
 const windows=(site.windows??[]).map((opening,index)=>{
   const roll=rand();
   const condition=site.condition??'occupied';
   const secure=['utility','warehouse','garage'].includes(site.archetype??'');
   const neglected=condition==='vacant'||condition==='neglected';
   const treatment:WindowTreatment=neglected&&roll<.34?'boarded':
     secure&&roll<.51?'bars':
     residential.has(site.archetype??'')&&roll<.73?'open-curtains':'none';
   return {...opening,treatment,id:opening.id||'W'+index};
 });
 const cover:Obstacle[]=site.cover.slice();
 for(const window of windows)if(window.treatment==='boarded'){
   cover.push({x:window.x,y:window.y,
     w:window.vertical?10:window.width,
     h:window.vertical?window.width:10,low:false,
     fixture:'window-boards',material:'softwood',integrity:1.5});
 }
 return {...site,windows,cover};
}
