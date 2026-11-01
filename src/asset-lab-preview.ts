/** Each showroom page is a different Site. Both render and presentation
 * must use that SAME site's cover positions, doors and window states.
 * Old coverState from the initial generated mission causes asset previews to
 * move away from labels during TacticalScene3D.update().
 */
import type {Session} from './breach-game.ts';
import type {Site} from './breach-site.ts';
import {initDoor} from './breach-door.ts';
import {initializeWindows} from './breach-windows.ts';
export function synchronizeShowroomSession(session:Session,site:Site):void{
 session.site=site;
 session.coverState=site.cover.map(obstacle=>({...obstacle}));
 session.doors=site.doors.map(initDoor);
 session.windows=initializeWindows(site.windows??[]);
}
