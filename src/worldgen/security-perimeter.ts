/** Physical chain-link fence sections joined by an operable mesh gate.
 * Emitted only where a valid exterior zone has uninterrupted safe frontage.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle,Pt,Door} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function addSecurityPerimeter(site:Site,seed:number):Site{
 if(!['garage','warehouse','utility'].includes(site.archetype??''))return site;
 const zone=site.exteriorZones?.find(z=>z.id==='rear-property')??null;
 if(!zone)return site;
 const horizontal=zone.w>=zone.h,span=horizontal?zone.w:zone.h;
 if(span<222)return site;
 const width=propDefinition('chain-link-fence')?.width??80;
 const length=width*2+48;
 const x=zone.x,y=zone.y;
 const positions=horizontal?[
  {x:x-(48+width)/2,y},{x:x+(48+width)/2,y}
 ]:[{x,y:y-(48+width)/2},{x,y:y+(48+width)/2}];
 const sections:Obstacle[]=positions.map(p=>({
  ...p,w:horizontal?width:5,h:horizontal?5:width,
  low:false,fixture:'chain-link-fence',material:'sheet-metal'
 }));
 const gate:Door={
  id:'PROPERTY-GATE',a:horizontal?{x:x-24,y}:{x,y:y-24},
  b:horizontal?{x:x+24,y}:{x,y:y+24},
  kind:'hinged',style:'mesh-gate',hinge:'a',swing:-1,
  open:false,openedAt:-1,latchIntegrity:1.5,frameIntegrity:3.2
 };
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const obstacles=[...sections,{x,y,w:horizontal?48:5,h:horizontal?5:48}];
 if(obstacles.some(o=>o.x-o.w/2<bounds.minX+14||o.x+o.w/2>bounds.maxX-14||
    o.y-o.h/2<bounds.minY+14||o.y+o.h/2>bounds.maxY-14))return site;
 const protectedPoints=[...site.spawn,...site.enemies,site.objective,site.extract,site.entrance];
 if(obstacles.some(o=>protectedPoints.some(p=>Math.abs(p.x-o.x)<o.w/2+32&&
    Math.abs(p.y-o.y)<o.h/2+32)))return site;
 if(sections.some(o=>site.cover.some(c=>
    Math.abs(c.x-o.x)<(c.w+o.w)/2+5&&Math.abs(c.y-o.y)<(c.h+o.h)/2+5)))return site;
 if(site.doors.some(d=>dist({x,y},{x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2})<76))return site;
 void seed;
 return {...site,cover:[...site.cover,...sections],doors:[...site.doors,gate]};
}
