/** OC1: Retrospective operation outcomes. Keep tactical objective truth,
 * physical extraction and campaign settlement separate. Never run in AI.
 */
import type {Session} from './breach-game.ts';

export type OperationDisposition='completed'|'withdrawn'|'overwhelmed'|'failed';
export type OperationOutcome={
 disposition:OperationDisposition;
 /** Reached the objective-security phase, even if final extraction fails. */
 objectiveSecured:boolean;
 /** Exactly which friendly bodies physically reached the extraction zone. */
 extractedOperatorIds:string[];
 evacuatedCasualtyIds:string[];
 leftBehindOperatorIds:string[];
};

const inExtraction=(s:Pick<Session,'scenario'>,p:{x:number;y:number})=>
 Math.hypot(p.x-s.scenario.extract.x,p.y-s.scenario.extract.y)<=37;

/** Authoritative state query: does not move actors or change the mission. */
export function canConcludeWithdrawal(s:Pick<Session,
 'operators'|'scenario'|'withdrawalRequested'>):boolean{
 if(s.withdrawalRequested!==true)return false;
 const friendly=s.operators.filter(a=>a.side==='blue');
 const mobile=friendly.filter(a=>a.health>0);
 return mobile.length>0&&mobile.every(a=>inExtraction(s,a.p));
}

/** Withdrawing is a player decision, not a mission win or free teleport.
 * The ordinary fixed-step mission authority resolves extraction on GO. */
export function requestWithdrawal(s:Pick<Session,
 'phase'|'site'|'started'|'withdrawalRequested'>):boolean{
 if(s.site?.training||!s.started||
    (s.phase!=='running'&&s.phase!=='planning')||
    s.withdrawalRequested===true)return false;
 s.withdrawalRequested=true;
 return true;
}

export function deriveOperationOutcome(s:Pick<Session,
 'phase'|'mission'|'operators'|'scenario'|'withdrawalRequested'>):OperationOutcome{
 const friendly=s.operators.filter(a=>a.side==='blue');
 const extracted=friendly.filter(a=>a.health>0&&inExtraction(s,a.p));
 const evacuated=friendly.filter(a=>a.health<=0&&inExtraction(s,a.p));
 const accounted=new Set([...extracted,...evacuated].map(a=>a.id));
 const disposition:OperationDisposition=s.phase==='won'?'completed':
   s.withdrawalRequested&&s.phase==='lost'?'withdrawn':
   friendly.every(a=>a.health<=0)?'overwhelmed':'failed';
 return {disposition,objectiveSecured:s.mission==='extract'||s.mission==='done',
   extractedOperatorIds:extracted.map(a=>a.id),
   evacuatedCasualtyIds:evacuated.map(a=>a.id),
   leftBehindOperatorIds:friendly.filter(a=>!accounted.has(a.id)).map(a=>a.id)};
}
