/** Give selected properties a distinct, physically connected entry room.
 * A narrow bay is cut from the front cell's width in every floor row, then
 * a shallow entrance projection occupies only the new bay.
 * This preserves true exterior walls, two door thresholds and circulation.
 */
import type {Blueprint} from './architectural-program.ts';
const eligible=new Set(['house','townhouse','retail','office','restaurant','clinic']);
const publicEntry=new Set(['living','dining','sales','checkout','lobby',
 'reception','waiting','studio']);
export function addEntryTransition(b:Blueprint,seed:number):Blueprint{
 if(!eligible.has(b.kind)||seed%4!==1||
   b.front.row!==b.cells.length-1)return b;
 const col=b.front.col,role=b.cells[b.front.row]?.[col];
 const wide=b.widths[col]??0;
 if(!role||!publicEntry.has(role)||wide<160||
   b.cells.some(row=>row[col]==='hallway')||b.unitIds)return b;
 // A real entrance needs a usable 48-unit doorway and room around its swing.
 const entryWidth=84,rest=wide-entryWidth;
 if(rest<68)return b;
 const left=(seed%2===0),split=left?[entryWidth,rest]:[rest,entryWidth];
 const entryColumn=col+(left?0:1);
 const insert=<T>(a:readonly T[],replacement:readonly T[]):T[]=>
   [...a.slice(0,col),...replacement,...a.slice(col+1)];
 const cells=b.cells.map(row=>insert(row,[row[col],row[col]]));
 const transition=b.kind==='house'||b.kind==='townhouse'?'foyer':'vestibule';
 const entryRow=Array.from({length:b.widths.length+1},(_,index)=>
   index===entryColumn?transition:null);
 return {...b,family:b.family+' / '+transition+' entry projection',
   widths:insert(b.widths,split),depths:[...b.depths,97],
   cells:[...cells,entryRow],
   front:{row:b.front.row+1,col:entryColumn}};
}
