/** Shared compact, legible door construction proportions.
 * Tactical world units: 20 per metre. Door openings themselves stay
 * generous for mobile-first squad movement. Trim is visual-only and
 * never expands the movement collision footprint.
 */
import type {Door} from './breach-core.ts';
export const DOOR_PANEL_END_RECESS=2;
/** Geometry, not just trim: a standard single interior doorway used to be
 * 48 units wide (wider than its 34-unit-tall leaf). Keep a friendly 36-unit
 * passage for 16-unit-diameter operators; public entrances remain roomier.
 * Double and industrial openings retain their separate wide assemblies. */
export const INTERIOR_DOOR_OPENING_WIDTH=36;
export const ENTRY_DOOR_OPENING_WIDTH=42;
export function ordinaryDoorOpeningWidth(id:string):number{
 // Property gates are actual fencing access, not human-scale room doors.
 if(id==='PROPERTY-GATE')return 48;
 return id==='FRONT'||id==='SERVICE'||id.startsWith('COURT-')?
   ENTRY_DOOR_OPENING_WIDTH:INTERIOR_DOOR_OPENING_WIDTH;
}
export type DoorProportions={
  jambWidth:number;jambDepth:number;
  headerHeight:number;headerDepth:number;
  casingWidth:number;casingDepth:number;
  leafThickness:number;
  thresholdHeight:number;thresholdDepth:number;
  hingeDiameter:number;hingeDepth:number;
};
/** Normal framed glass remains a bold, recognizable symbol; reinforced
 * doors keep more bulk without reverting every entry to a giant portal. */
export function doorProportions(door:Pick<Door,'kind'|'style'>):DoorProportions{
 const heavy=door.kind==='shutter'||['steel','reinforced','fire','exit']
   .includes(door.style??'wood');
 const sliding=door.kind==='sliding';
 return {
  jambWidth:door.kind==='shutter'?3.6:heavy?3.2:2.8,
  jambDepth:door.kind==='shutter'?9:heavy?7.8:6.8,
  headerHeight:heavy?3.6:3.1,
  headerDepth:heavy?8.4:7.4,
  casingWidth:heavy?1.25:1,
  casingDepth:1.5,
  leafThickness:sliding?3:heavy?3.6:2.8,
  thresholdHeight:door.kind==='shutter'?.9:.55,
  thresholdDepth:door.kind==='shutter'?9:heavy?7:6,
  hingeDiameter:heavy?3.2:2.8,
  hingeDepth:heavy?4.7:4.2,
 };
}
