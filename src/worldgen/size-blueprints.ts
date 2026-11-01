/** Independent small and large spatial programs.
 * Medium and legacy scales retain the established architectural families.
 * Dimensions use the canonical 20 units/metre; no blanket miniature scaling.
 */
import type {BuildingArchetype} from '../breach-site.ts';
import type {Blueprint} from './architectural-program.ts';

type Spec=Omit<Blueprint,'kind'>;
const SMALL:Record<BuildingArchetype,Spec>={
 house:{family:'compact bungalow / one bedroom',widths:[172,122],depths:[119,140],
  front:{col:0,row:1},cells:[['bedroom','bathroom'],['living','kitchen']]},
 townhouse:{family:'small narrow rowhouse',widths:[154,120],depths:[111,118,105],
  front:{col:0,row:2},cells:[['bedroom','bathroom'],['living','kitchen'],['living','dining']]},
 apartment:{family:'single compact apartment',widths:[153,118,100],depths:[129,124],
  front:{col:0,row:1},cells:[['bedroom','bathroom','storage'],['living','living','kitchen']]},
 retail:{family:'neighborhood shop and storeroom',widths:[181,134],depths:[143,130],
  front:{col:0,row:1},cells:[['stockroom','storage'],['sales','checkout']]},
 office:{family:'small professional office',widths:[175,137],depths:[140,125],
  front:{col:0,row:1},cells:[['office','storage'],['reception','office']]},
 garage:{family:'one-bay independent repair shop',widths:[188,138,128],depths:[151,117],
  front:{col:2,row:1},cells:[['bay','workshop','parts'],['bay','office','waiting']]},
 warehouse:{family:'small receiving and storage depot',widths:[196,70,150],depths:[166,118],
  front:{col:2,row:1},cells:[['storage','aisle','loading'],['office','packing','loading']]},
 restaurant:{family:'small cafe / kitchen and seating',widths:[182,142,104],depths:[130,153],
  front:{col:0,row:1},cells:[['kitchen','pantry','restroom'],['dining','dining','reception']]},
 motel:{family:'four-unit roadside motel strip',widths:[138,138,138,138],depths:[147,62,106],
  front:{col:0,row:2},cells:[
   ['guest','guest','guest','guest'],
   ['hallway','hallway','hallway','hallway'],
   ['reception',null,null,'laundry']]},
 utility:{family:'compact municipal equipment plant',widths:[187,141,128],depths:[147,112],
  front:{col:1,row:1},cells:[['equipment','equipment','control'],['storage','service','maintenance']]},
 clinic:{family:'small outpatient clinic',widths:[164,67,143],depths:[128,118,112],
  front:{col:0,row:2},cells:[
   ['exam','hallway','supply'],
   ['treatment','hallway','staff'],
   ['waiting','reception','restroom']]}
};
const LARGE_EXTRA:Record<BuildingArchetype,readonly string[]>={
 house:['bedroom','hallway','bedroom','bathroom'],
 townhouse:['bedroom','hallway','bedroom','storage'],
 apartment:['bedroom','hallway','bedroom','bathroom'],
 retail:['stockroom','stockroom','service','storage'],
 office:['office','hallway','meeting','storage'],
 garage:['bay','aisle','bay','parts'],
 warehouse:['storage','aisle','storage','loading'],
 restaurant:['kitchen','kitchen','pantry','service'],
 motel:['guest','guest','guest','guest','guest'],
 utility:['equipment','hallway','equipment','control'],
 clinic:['exam','hallway','exam','supply']
};
export function sizedBlueprint(kind:BuildingArchetype,seed:number,
 tier:'small'|'large',medium:Blueprint):Blueprint{
 if(tier==='small'){
  const source=SMALL[kind],mirror=(seed>>>0)%2===1;
  const widths=source.widths.map((w,i)=>Math.round(w*(.98+(seed+i*7)%5*.01)));
  const cells=source.cells.map(row=>mirror?[...row].reverse():[...row]);
  return {kind,family:source.family+(mirror?' / mirrored':''),
    widths:mirror?widths.reverse():widths,
    depths:source.depths.map((h,i)=>Math.round(h*(.98+(seed+i*3)%5*.01))),
    cells,front:{col:mirror?source.widths.length-1-source.front.col:source.front.col,
      row:source.front.row}};
 }
 const extras=LARGE_EXTRA[kind];
 const row=medium.widths.map((_,col)=>{
  const previous=medium.cells[0][col];
  return previous===null?null:previous==='hallway'?'hallway':extras[col%extras.length];
 });
 const extraDepth=kind==='motel'?145:kind==='warehouse'||kind==='garage'?157:127;
 return {...medium,family:medium.family+' / larger program',
   depths:[extraDepth,...medium.depths],
   cells:[row,...medium.cells.map(r=>[...r])],
   front:{col:medium.front.col,row:medium.front.row+1}};
}
