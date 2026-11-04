/** A planned entry cannot begin simply because its WAIT timer elapsed.
 * Verify the authoritative door state. This does not grant clearance,
 * move an actor, or replace collision/doorway reservations.
 */
import {doorClear} from './breach-door.ts';
import type {Door} from './breach-core.ts';
export type EntryDoorGate='ready'|'pending'|'missing';
export function entryDoorState(door:Door|undefined):EntryDoorGate{
 if(!door)return 'missing';
 return doorClear(door)?'ready':'pending';
}
