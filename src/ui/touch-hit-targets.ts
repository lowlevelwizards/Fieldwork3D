/** Pointer-specific tolerances in CSS pixels, independent of world zoom.
 * Keep mouse precision, but accept the wider contact footprint of a finger.
 * This only adjusts UI hit tests, not navigation or line-of-sight rules. */
export type TacticalPointerKind='touch'|'pen'|'mouse'|string;
export type TacticalHitProfile={
  waypoint:number;route:number;reachableDoor:number;dragStart:number;
};
const MOUSE_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:27,route:14,reachableDoor:28,dragStart:9
});
const PEN_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:30,route:17,reachableDoor:29,dragStart:11
});
const TOUCH_PROFILE:TacticalHitProfile=Object.freeze({
  waypoint:34,route:20,reachableDoor:31,dragStart:13
});
export function tacticalHitProfile(kind:TacticalPointerKind):TacticalHitProfile{
  return kind==='touch'?TOUCH_PROFILE:kind==='pen'?PEN_PROFILE:MOUSE_PROFILE;
}
