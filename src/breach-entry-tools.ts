/** Build 23.00: physical compatibility contract for specialized entry tools.
 * This pure gate does not mutate door state, inventory or visibility.
 */
import type {Door} from './breach-core.ts';
export type EntryTool='pry'|'cut'|'wedge'|'unwedge'|'breach';
export type EntryToolVerdict={allowed:boolean;reason:string;seconds:number;
 noise:number;damage:number};
const allow=(seconds:number,noise:number,damage=0):EntryToolVerdict=>
 ({allowed:true,reason:'',seconds,noise,damage});
const deny=(reason:string):EntryToolVerdict=>
 ({allowed:false,reason,seconds:0,noise:0,damage:0});
export function entryToolVerdict(door:Door,tool:EntryTool):EntryToolVerdict{
 const style=door.style??'wood';
 const kind=door.kind??'hinged';
 const gated=style==='mesh-gate'||style==='screen';
 const reinforced=style==='steel'||style==='reinforced'||style==='fire';
 const open=!!door.open;
 if(tool==='unwedge')return door.wedged?allow(.7,30):deny('NOT WEDGED');
 if(tool==='wedge'){
  if(kind!=='hinged')return deny('DOOR DOES NOT SWING');
  if(open)return deny('CLOSE FIRST');
  if(door.wedged)return deny('ALREADY WEDGED');
  return allow(1.1,25);
 }
 if(open)return deny('ALREADY OPEN');
 if(door.wedged)return deny('WEDGE BLOCKS ENTRY');
 if(tool==='cut'){
  if(!gated)return deny('NO CUTTABLE FASTENER');
  if(kind==='shutter')return deny('SHUTTER CONTROL REQUIRED');
  return allow(3.8,105,.9);
 }
 if(tool==='pry'){
  if(kind==='shutter'||kind==='sliding')return deny('UNSUPPORTED MECHANISM');
  if(reinforced)return allow(6.2,165,.7);
  return allow(gated?5.5:3.4,115,1.15);
 }
 if(tool==='breach'){
  if(kind==='shutter'||kind==='sliding')return deny('UNSUPPORTED MECHANISM');
  return allow(reinforced?4.1:2.2,340,reinforced?1.4:2.5);
 }
 return deny('UNKNOWN METHOD');
}
