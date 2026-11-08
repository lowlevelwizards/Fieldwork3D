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
 'planting-bed':0,'planting-edge':1,
 'waste-bay-line':1,'utility-bay-line':1,'loading-bay-line':1,
};
export function propertySurfaceCenterHeight(kind:SurfaceKind):number{
 // Thin landscape/service details are flat finishes, not pretend curbs.
 // Explicit offsets keep them above the real zone plane and below all
 // actual obstacle meshes, without sharing a coplanar z-buffer with pads.
 if(kind==='planting-bed')return -1.31;
 if(kind==='planting-edge')return -1.18;
 if(kind==='waste-bay-line'||kind==='utility-bay-line'||
    kind==='loading-bay-line')return -1.10;
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
