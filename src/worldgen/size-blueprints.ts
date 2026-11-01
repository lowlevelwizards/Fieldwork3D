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
  front:{col:0,row:1},cells:[['bedroom','bathroom','closet'],['living','living','kitchen']]},
 retail:{family:'neighborhood shop and storeroom',widths:[181,134],depths:[143,130],
  front:{col:0,row:1},cells:[['stockroom','storage'],['sales','checkout']]},
 office:{family:'small professional office',widths:[175,137],depths:[140,125],
  front:{col:0,row:1},cells:[['office','closet'],['reception','office']]},
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
/** Alternate compact programs reorganize actual rooms and public entrances.
 * Not reflections: these have distinct service frontage and adjacency.
 * The third family adds a meaningful service/working wing where floor area
 * allows, without blindly enlarging motel/clinic maps past medium scale.
 */
const SMALL_ALTERNATE:Record<BuildingArchetype,Spec>={
 house:{family:'compact side-entry house / rear living wing',widths:[119,177],
  depths:[117,143],front:{col:1,row:1},
  cells:[['bathroom','bedroom'],['kitchen','living']]},
 townhouse:{family:'narrow rowhouse / kitchen-side stair hall',widths:[121,161],
  depths:[111,124,109],front:{col:1,row:2},
  cells:[['bathroom','bedroom'],['kitchen','living'],['dining','living']]},
 apartment:{family:'compact apartment / side kitchen and shared living',widths:[106,150,137],
  depths:[118,132],front:{col:1,row:1},
  cells:[['closet','bathroom','bedroom'],['kitchen','living','living']]},
 retail:{family:'corner retail / offset cashier frontage',widths:[129,192],
  depths:[142,136],front:{col:1,row:1},
  cells:[['storage','stockroom'],['checkout','sales']]},
 office:{family:'two-office suite / recessed reception',widths:[136,180],
  depths:[137,129],front:{col:1,row:1},
  cells:[['closet','office'],['office','reception']]},
 garage:{family:'side-entry garage / through-bay servicing',widths:[128,138,190],
  depths:[151,121],front:{col:0,row:1},
  cells:[['parts','workshop','bay'],['waiting','office','bay']]},
 warehouse:{family:'side dock / perpendicular storage gallery',widths:[154,70,195],
  depths:[166,121],front:{col:0,row:1},
  cells:[['loading','aisle','storage'],['loading','packing','office']]},
 restaurant:{family:'front seating hall / rear kitchen run',widths:[104,147,187],
  depths:[134,158],front:{col:2,row:1},
  cells:[['restroom','pantry','kitchen'],['reception','dining','dining']]},
 motel:{family:'roadside motel / adjacent linen service',widths:[138,138,138,138],
  depths:[147,62,108],front:{col:0,row:2},
  cells:[['guest','guest','guest','guest'],['hallway','hallway','hallway','hallway'],
   ['reception','laundry',null,null]]},
 utility:{family:'offset utility service / front equipment controls',widths:[126,142,187],
  depths:[151,119],front:{col:0,row:1},
  cells:[['control','equipment','equipment'],['service','maintenance','storage']]},
 clinic:{family:'small walk-in clinic / entry-side reception',widths:[143,67,164],
  depths:[129,122,112],front:{col:0,row:2},
  cells:[['supply','hallway','exam'],['staff','hallway','treatment'],
   ['reception','waiting','restroom']]}
};
const SMALL_EXTENSIONS:Record<BuildingArchetype,readonly (string|null)[]>={
 house:['bedroom','closet'],townhouse:['study','closet'],
 apartment:['bedroom','living','closet'],retail:['stockroom','utility-closet'],
 office:['meeting','closet'],garage:['bay','aisle','parts'],
 warehouse:['storage','aisle','packing'],restaurant:['kitchen','service','pantry'],
 motel:[],utility:['equipment','service','maintenance'],
 clinic:['exam','hallway',null]
};
function extendedCompact(kind:BuildingArchetype):Spec{
 const base=SMALL[kind];
 if(kind==='motel')return {...base,
   family:'roadside motel / split guest utility end',
   cells:[['guest','guest','guest','guest'],
     ['hallway','hallway','hallway','hallway'],
     ['reception',null,'laundry',null]]};
 return {...base,family:base.family+' / rear operational wing',
  depths:[kind==='garage'||kind==='warehouse'?122:105,...base.depths],
  cells:[[...SMALL_EXTENSIONS[kind]],...base.cells.map(row=>[...row])],
  front:{...base.front,row:base.front.row+1}};
}
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
  const variant=(seed>>>0)%3;
  const source=variant===1?SMALL_ALTERNATE[kind]:
    variant===2?extendedCompact(kind):SMALL[kind];
  const mirror=(Math.floor((seed>>>0)/3))%2===1;
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
  if(previous===null)return null;
  // Preserve an existing narrow corridor spine, but never stamp a corridor
  // role into a column that is dimensioned for a full room.
  if(previous==='hallway')return 'hallway';
  const role=extras[col%extras.length];
  return role==='hallway'?'storage':role;
 });
 const extraDepth=kind==='motel'?145:kind==='warehouse'||kind==='garage'?157:127;
 return {...medium,family:medium.family+' / larger program',
   depths:[extraDepth,...medium.depths],
   cells:[row,...medium.cells.map(r=>[...r])],
   front:{col:medium.front.col,row:medium.front.row+1}};
}
