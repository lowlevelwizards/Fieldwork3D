/** CT7: reciprocal transport footprint at doorway. No new queue authority. */
import type {Pt,Door} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {linkedTransportPatient} from './breach-transport-navigation.ts';
export function transportThroatContains(point:Pt,door:Pick<Door,'a'|'b'>,margin=15){
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y,length=Math.hypot(dx,dy);
 if(length<.001)return false;
 const x=point.x-door.a.x,y=point.y-door.a.y;
 const along=(x*dx+y*dy)/length,depth=(x*dy-y*dx)/length;
 return along>=-margin&&along<=length+margin&&Math.abs(depth)<margin;
}
export function transportPatientInThroat(s:Session,carrier:TeamActor,door:Door){
 const body=linkedTransportPatient(s,carrier);
 return !!body&&carrier.health>0&&transportThroatContains(body.p,door);
}
export function transportThroatOccupiedByOther(s:Session,actor:TeamActor,door:Door){
 return s.operators.some(c=>c!==actor&&c.carryingId&&
  transportPatientInThroat(s,c,door));
}
