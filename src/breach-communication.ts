/** Verbal tactical reports are physical events, not global knowledge sharing. */
import type {Pt,Door,Segment} from './breach-core.ts';
import {heardIntensity} from './breach-acoustics.ts';
import type {AwarenessObservation} from './breach-awareness.ts';
export type TacticalReport={
 id:number;senderId:string;at:number;origin:Pt;estimate:Pt;
 uncertainty:number;deliveredTo:string[];coordinated?:boolean;
};
export function reportToListener(report:TacticalReport,listenerId:string,
 listenerPosition:Pt,doors:readonly Door[],walls:readonly Segment[],
 now:number):AwarenessObservation|null{
 if(listenerId===report.senderId||now-report.at>1.5)return null;
 const clarity=heardIntensity(report.origin,listenerPosition,235,doors,walls);
 if(clarity<.18)return null;
 return {id:'report/'+report.id+'/'+listenerId,
  observerId:listenerId,at:now,source:'reported',
  kind:'hostile-warning',estimate:{...report.estimate},
  uncertainty:report.uncertainty+Math.round((1-clarity)*65)};
}
