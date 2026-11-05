/** Compact HUD presentation over the existing authoritative execution state.
 * Never reads tactical intel or changes orders. Full details stay in aria-label
 * and title so the small phone card can prioritize health and ammunition.
 */
import type {ExecutionStatus} from '../breach-execution-state.ts';
export type HudOperatorPhase='planning'|'execution'|'targeting'|'replay'|'debrief';
export type CompactExecution={visible:boolean;label:string;detail:string;priority:'quiet'|'active'|'attention'};
const attention=new Set(['blocked','recovering']);
export function compactExecutionStatus(
 status:ExecutionStatus|null,options:{selected:boolean;phase:HudOperatorPhase;down:boolean}
):CompactExecution{
 if(!status||options.down)return {visible:false,label:'',detail:'',priority:'quiet'};
 const kind=status.kind;
 if(attention.has(kind))return {
  visible:true,label:kind==='blocked'?'ATTENTION':'RECOVERING',
  detail:status.detail,priority:'attention'};
 if(kind==='idle')return options.selected&&options.phase==='planning'?
  {visible:true,label:'READY',detail:status.detail,priority:'quiet'}:
  {visible:false,label:'',detail:status.detail,priority:'quiet'};
 if(kind==='moving'&&!options.selected)return {
  visible:false,label:'',detail:status.detail,priority:'active'};
 const aliases:Record<string,string>={
  'ORDERS COMPLETE':'COMPLETE','NEEDS ATTENTION':'ATTENTION',
  'TRAFFIC STALLED':'STALLED','DOOR SWINGING':'OPENING',
  'CONTACT HOLD':'CONTACT HOLD','RECOVERING KIT':'RECOVER KIT'
 };
 return {visible:true,label:aliases[status.label]??status.label,
  detail:status.detail,priority:kind==='waiting'||kind==='holding'?
   'attention':'active'};
}
