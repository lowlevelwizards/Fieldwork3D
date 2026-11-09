/** Data-only site surface color policy. No scene lifetime or world mutation. */
import type {SurfaceKind} from '../worldgen/property-surfaces.ts';
export const SITE_EXTERIOR_ZONE_COLORS={
 yard:0x70895e,patio:0x8b877a,driveway:0x737774,
 service:0x7f827b,garden:0x788d61,parking:0x676c6b
} as const;
export const SITE_PROPERTY_SURFACE_COLORS:Readonly<Record<SurfaceKind,number>>={

      path:0x919182,'driveway-stripe':0x858575,
      'parking-divider':0xd6caa9,'garden-border':0x4c5843,
      'service-pad':0x6c7069,'patio-paver':0x8b8578,
      'drainage-grate':0x394d50,
      sidewalk:0x92918b,'curb-edge':0x5c605e,
      'curb-ramp':0xb1aca0,'crosswalk-stripe':0xd8d2be,
      'reserved-parking':0x4f7880,'access-hatch':0xe2dfc9,
      'stall-end-line':0xc9c2a6,
      'loading-zone':0x9f9685,'maintenance-bay':0x7e877d,
      'waste-collection':0x696f65,'clear-route':0x8b8c7d,
      'planting-bed':0x504b3e,'planting-edge':0x827961,
      'waste-bay-line':0xcdb677,'utility-bay-line':0xa6b8a8,
      'loading-bay-line':0xbeb59b,
};
