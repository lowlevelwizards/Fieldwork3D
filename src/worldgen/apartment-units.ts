/** Multiple self-contained apartment units arranged around a shared corridor.
 * Real single-floor accessible flats, not simulated upstairs apartments.
 * Unit ownership is encoded per cell for privacy-aware door compilation.
 */
import type {SiteScale} from '../breach-site.ts';
import {architecturalBlueprint,type Blueprint} from './architectural-program.ts';
import {sizedBlueprint} from './size-blueprints.ts';
const widths=[142,95,112,65,112,95,142];
const homeRows:(string|null)[][]=[
 ['bedroom','bathroom','storage','hallway','storage','bathroom','bedroom'],
 ['living','living','kitchen','hallway','kitchen','living','living'],
 ['living','living','living','hallway','living','living','living']
];
const corridorLobby=[null,null,'lobby','lobby','lobby',null,null];
export function apartmentUnitBlueprint(seed:number,scale:SiteScale):Blueprint{
 if(scale==='small'){
  const b=sizedBlueprint('apartment',seed,'small',architecturalBlueprint('apartment',seed));
  return {...b,unitIds:b.cells.map(row=>row.map(role=>
    role&&role!=='hallway'&&role!=='lobby'?'APT-1':null))};
 }
 const large=scale==='large',bands=large?2:1;
 const cells:(string|null)[][]=[],unitIds:(string|null)[][]=[],depths:number[]=[];
 for(let band=0;band<bands;band++){
  for(let row=0;row<3;row++){
   cells.push([...homeRows[row]]);
   unitIds.push(homeRows[row].map((role,col)=>
    role==='hallway'||role===null?null:
      col<3?'APT-'+(band*2+1):col>3?'APT-'+(band*2+2):null));
   depths.push([117,126,121][row]);
  }
 }
 cells.push([...corridorLobby]);
 unitIds.push(corridorLobby.map(()=>null));
 depths.push(105);
 const mirror=seed%2===1;
 return {kind:'apartment',
  family:(large?'four flats / double-bank shared corridor':'two flats / shared corridor')+
   (mirror?' / mirrored':''),
  widths:mirror?[...widths].reverse():widths,
  depths,cells:mirror?cells.map(r=>r.slice().reverse()):cells,
  unitIds:mirror?unitIds.map(r=>r.slice().reverse()):unitIds,
  front:{col:3,row:cells.length-1}};
}
