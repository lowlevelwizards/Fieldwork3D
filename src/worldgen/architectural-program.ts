/** Architectural blueprints: area and circulation come before geometry.
 * Each slot is a rectangle; adjacent matching roles become one continuous
 * functional zone (including L-shaped rooms). Void cells cut the footprint.
 */
import type {BuildingArchetype} from '../breach-site.ts';
export type Blueprint={kind:BuildingArchetype;family:string;
  widths:readonly number[];depths:readonly number[];
  cells:readonly (readonly (string|null)[])[];
  /** Frontage must always open into a public / circulation space. */
  front:{col:number;row:number};
};
type Spec=Omit<Blueprint,'kind'>;
const layouts:Record<BuildingArchetype,Spec>={
 house:{family:'offset-L / domestic hall',widths:[172,68,152,125],
  depths:[135,133,113],front:{col:1,row:2},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['living','hallway','kitchen','kitchen'],
   ['living','living','dining',null]]},
 townhouse:{family:'deep-narrow / side passage',widths:[160,62,152],
  depths:[105,127,128,115],front:{col:0,row:3},cells:[
   ['bedroom','hallway','bathroom'],
   ['bedroom','hallway','study'],
   ['living','hallway','kitchen'],
   ['living','living','dining']]},
 apartment:{family:'paired units / shared corridor',widths:[160,59,162,132],
  depths:[132,128,105],front:{col:1,row:2},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['living','hallway','living','kitchen'],
   ['living','lobby','lobby',null]]},
 retail:{family:'open sales / service backline',widths:[185,155,83,140],
  depths:[138,148,112],front:{col:0,row:2},cells:[
   ['stockroom','stockroom','service','office'],
   ['sales','sales','checkout','storage'],
   ['sales','sales','checkout',null]]},
 office:{family:'reception / office spine',widths:[166,65,162,142],
  depths:[125,142,109],front:{col:2,row:2},cells:[
   ['office','hallway','meeting','break'],
   ['office','hallway','cubicles','cubicles'],
   ['reception','hallway','lobby','storage']]},
 garage:{family:'paired service bays / reception',widths:[190,66,190,144],
  depths:[158,146,107],front:{col:0,row:2},cells:[
   ['bay','aisle','bay','workshop'],
   ['bay','aisle','bay','parts'],
   ['waiting','reception','office',null]]},
 warehouse:{family:'large storage / loading spine',widths:[192,68,190,154],
  depths:[166,161,115],front:{col:3,row:2},cells:[
   ['storage','aisle','storage','loading'],
   ['storage','aisle','packing','loading'],
   ['office','aisle','service','loading']]},
 restaurant:{family:'front dining / rear working kitchen',widths:[181,159,79,144],
  depths:[149,143,110],front:{col:1,row:2},cells:[
   ['kitchen','kitchen','pantry','service'],
   ['dining','dining','service','restroom'],
   ['dining','dining','reception',null]]},
 motel:{family:'guest-room bar / access gallery',widths:[139,139,139,139],
  depths:[158,64,116],front:{col:0,row:2},cells:[
   ['guest','guest','guest','guest'],
   ['hallway','hallway','hallway','hallway'],
   ['reception','reception','laundry',null]]},
 utility:{family:'equipment plant / service corridor',widths:[188,68,172,116],
  depths:[149,145,104],front:{col:1,row:2},cells:[
   ['equipment','hallway','equipment','control'],
   ['equipment','hallway','maintenance','service'],
   ['storage','hallway','service',null]]},
 clinic:{family:'public waiting / clinical spine',widths:[178,69,166,139],
  depths:[145,144,110],front:{col:1,row:2},cells:[
   ['exam','hallway','exam','supply'],
   ['treatment','hallway','exam','staff'],
   ['waiting','waiting','reception','reception']]}
};
export const ARCHITECTURAL_FAMILIES:readonly BuildingArchetype[]=
 ['house','townhouse','apartment','retail','office','garage',
  'warehouse','restaurant','motel','utility','clinic'];
const publicEntry=new Set(['living','lobby','reception','waiting','sales',
 'dining','hallway','aisle','loading']);
/** Some facilities have multiple genuinely different massing grammars.
 * Voids represent courtyards, service courts or setbacks, not phantom rooms.
 */
const alternate:Partial<Record<BuildingArchetype,Spec>>={
 townhouse:{family:'courtyard rowhouse / lateral kitchen extension',
  widths:[158,65,142,114],depths:[116,112,113,107],
  front:{col:0,row:3},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['bedroom','hallway','study',null],
   ['living','hallway','kitchen','dining'],
   ['living','living','dining',null]]},
 apartment:{family:'double-loaded apartments / entry gallery',
  widths:[145,65,150,135],depths:[125,115,122,93],
  front:{col:1,row:3},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['bedroom','hallway','bedroom','kitchen'],
   ['living','hallway','living',null],
   ['lobby','lobby','lobby','service']]},
 retail:{family:'corner shop / offset stock and sales',
  widths:[185,78,165,134],depths:[131,142,111],
  front:{col:0,row:2},cells:[
   ['stockroom','service','office','storage'],
   ['sales','sales','sales','storage'],
   ['sales','sales','checkout',null]]},
 garage:{family:'vehicle yard / elongated parallel service bays',
  widths:[190,68,188,135],depths:[168,112,109,98],
  front:{col:0,row:3},cells:[
   ['bay','aisle','bay','workshop'],
   ['bay','aisle','bay','parts'],
   ['bay','aisle','reception',null],
   ['waiting','reception','reception',null]]},
 utility:{family:'switchyard / stepped generator plant',
  widths:[170,66,171,133],depths:[146,116,106],
  front:{col:1,row:2},cells:[
   ['equipment','hallway','equipment','control'],
   ['equipment','hallway',null,'maintenance'],
   ['storage','hallway','service','service']]},
 motel:{family:'courtyard motel / covered guest gallery',
  widths:[141,141,141,141],depths:[143,62,128,103],
  front:{col:0,row:3},cells:[
   ['guest','guest','guest','guest'],
   ['hallway','hallway','hallway','hallway'],
   ['reception',null,null,'laundry'],
   ['reception','lobby','maintenance','maintenance']]},
 clinic:{family:'offset clinic / public wing and clinical hall',
  widths:[173,70,166,130],depths:[143,112,79,104],
  front:{col:1,row:3},cells:[
   ['exam','hallway','exam','supply'],
   ['treatment','hallway','exam','staff'],
   ['waiting','hallway',null,'service'],
   ['waiting','waiting','reception',null]]},
 warehouse:{family:'shipping-court warehouse / U footprint',
  widths:[182,70,182,154],depths:[157,112,136,111],
  front:{col:1,row:3},cells:[
   ['storage','aisle','storage','loading'],
   ['storage','aisle',null,'loading'],
   ['storage','aisle',null,'loading'],
   ['office','aisle','packing','service']]},
 house:{family:'setback house / L-shaped living room',
  widths:[174,68,150,124],depths:[127,94,112,95],
  front:{col:1,row:3},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['living','hallway','kitchen','kitchen'],
   ['living','hallway','dining',null],
   ['living','living',null,null]]},
 restaurant:{family:'back-of-house bar / stepped dining wing',
  widths:[188,75,167,133],depths:[151,139,106],
  front:{col:1,row:2},cells:[
   ['kitchen','kitchen','service','pantry'],
   ['dining','dining','service','restroom'],
   ['dining','dining',null,null]]},
 office:{family:'notched office / reception and private wing',
  widths:[170,66,165,143],depths:[123,144,107],
  front:{col:2,row:2},cells:[
   ['office','hallway','meeting',null],
   ['office','hallway','cubicles','cubicles'],
   ['reception','hallway','lobby','storage']]}
};
/** Independent third families: distinct room counts and circulation footprints,
 * not cosmetic reflections or one-room annexes pasted onto rectangular shells.
 */
const tertiary:Partial<Record<BuildingArchetype,Spec>>={
 house:{family:'deep setback house / offset living wing',
  widths:[170,65,156,124],depths:[104,115,126,111],
  front:{col:0,row:3},cells:[
   ['bedroom','hallway','bedroom','bathroom'],
   ['bedroom','hallway','kitchen','kitchen'],
   ['living','hallway','dining',null],
   ['living','living','dining',null]]},
 clinic:{family:'split public and clinical wings / dogleg corridor',
  widths:[167,67,164,132],depths:[133,109,112,105],
  front:{col:1,row:3},cells:[
   ['exam','hallway','exam','supply'],
   ['treatment','hallway','exam','staff'],
   [null,'hallway','waiting','waiting'],
   ['waiting','waiting','reception',null]]},
 motel:{family:'five-room guest wing / open service court',
  widths:[136,136,136,136,136],depths:[136,63,113,108],
  front:{col:0,row:3},cells:[
   ['guest','guest','guest','guest','guest'],
   ['hallway','hallway','hallway','hallway','hallway'],
   ['reception',null,null,null,'laundry'],
   ['reception','lobby',null,'maintenance','maintenance']]},
 warehouse:{family:'two storage wings / recessed shipping court',
  widths:[183,69,170,157,128],depths:[155,129,117,107],
  front:{col:1,row:3},cells:[
   ['storage','aisle','storage','loading','loading'],
   ['storage','aisle',null,'loading','storage'],
   ['storage','aisle',null,'loading','storage'],
   ['office','aisle','packing','service','service']]},
 retail:{family:'deep retail / notched employee service court',
  widths:[190,151,72,134],depths:[131,139,114],
  front:{col:0,row:2},cells:[
   ['stockroom','stockroom','office','storage'],
   ['sales','sales','service','storage'],
   ['sales','sales','checkout',null]]}
};
export function architecturalBlueprint(kind:BuildingArchetype,seed=0):Blueprint{
 const original=seed%13<3&&tertiary[kind]?tertiary[kind]!:
  seed%7<3&&alternate[kind]?alternate[kind]!:layouts[kind];
 // Independent architectural stream: variation never changes the intended
 // frontage, program or circulation, only bay sizes and left/right orientation.
 let n=(seed^0x45d9f3b)>>>0;
 const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
   return n/4294967296;};
 const mirror=rng()<.5;
 const widths=original.widths.map(w=>Math.round(w*(.94+rng()*.12)));
 const depths=original.depths.map(h=>Math.round(h*(.95+rng()*.10)));
 const cells=original.cells.map(row=>mirror?[...row].reverse():[...row]);
 return {kind,family:original.family+(mirror?' / mirrored':''),
  widths:mirror?widths.reverse():widths,depths,cells,
  front:{col:mirror?widths.length-1-original.front.col:original.front.col,
    row:original.front.row}};
}
export function blueprintIssues(b:Blueprint):string[]{
 const issues:string[]=[];
 if(b.cells.length!==b.depths.length||
   b.cells.some(row=>row.length!==b.widths.length))
   issues.push('invalid blueprint grid');
 const entry=b.cells[b.front.row]?.[b.front.col];
 if(!entry||!publicEntry.has(entry))issues.push('front entry not public');
 const roles=b.cells.flat().filter((x):x is string=>!!x);
 if(b.kind==='motel'&&roles.filter(x=>x==='guest').length<4)
   issues.push('motel missing guest room bank');
 if(b.kind==='clinic'&&entry==='exam')issues.push('clinic entry in exam');
 if(b.widths.some(w=>w<49)||b.depths.some(h=>h<56))
   issues.push('unusable room dimension');
 // Hallways are narrow strips, not arbitrary full-square rooms.
 for(let y=0;y<b.cells.length;y++)for(let x=0;x<b.widths.length;x++)
   if(b.cells[y][x]==='hallway'&&
      Math.min(b.widths[x],b.depths[y])>79)
     issues.push('oversized corridor');
 const total=(purpose:string)=>b.cells.reduce((area,row,y)=>
   area+row.reduce((sum,role,x)=>sum+(role===purpose?
     b.widths[x]*b.depths[y]:0),0),0);
 if(b.kind==='house'&&total('kitchen')>total('living')*1.1)
   issues.push('kitchen dominates living');
 if(b.kind==='restaurant'&&total('dining')<total('kitchen'))
   issues.push('undersized dining area');
 return issues;
}
