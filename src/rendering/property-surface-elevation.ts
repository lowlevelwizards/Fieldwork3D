/** Separate flat property finishes by semantic elevation.
 * A full surface used to share exactly the same top plane as adjacent
 * sidewalk/curb paint. These are presentation-only heights, never colliders.
 */
import type {SurfaceKind} from '../worldgen/property-surfaces.ts';

export const PROPERTY_SURFACE_THICKNESS=.12;
const layers:Record<SurfaceKind,number>={
 path:0,'service-pad':0,'patio-paver':0,'loading-zone':0,
 'maintenance-bay':0,'waste-collection':0,'reserved-parking':0,
 sidewalk:1,'garden-border':1,'driveway-stripe':1,
 'drainage-grate':1,'parking-divider':1,'clear-route':1,
 'curb-edge':2,'stall-end-line':2,'access-hatch':2,
 'crosswalk-stripe':2,'curb-ramp':3,
};
export function propertySurfaceCenterHeight(kind:SurfaceKind):number{
 return -1.30+layers[kind]*.20;
}

/** Stable height precedence when independently authored exterior zones touch.
 * Forecourts win over narrow service strips without z-buffer ties.
 */
export function exteriorZoneRenderLift(zoneId:string):number{
 if(zoneId==='arrival-forecourt')return .105;
 if(zoneId.startsWith('court-'))return .070;
 if(zoneId==='side-passage')return .035;
 return 0;
}
