/** CT3 — conservative transport profile for the existing game motor.
 * Only live collision validation consumes physical geometry; authoring
 * continues to use the existing intel route. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {hasTransportLink} from './breach-transport-custody.ts';
export const TRANSPORT_PROFILE={drag:{bodyRadius:6.5,carrierRadius:8,waypointTolerance:1.5},
 carry:{bodyRadius:7,carrierRadius:9,waypointTolerance:2}} as const;
export function linkedTransportPatient(s:Session,a:TeamActor){
 if(!a.carryingId)return undefined;
 return s.operators.find(p=>hasTransportLink(a,p))??s.civilians.find(p=>hasTransportLink(a,p));
}
export function transportProfile(mode:TransportMode){return TRANSPORT_PROFILE[mode];}
