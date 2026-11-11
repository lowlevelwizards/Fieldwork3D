/** Stable fixed-study scenarios. These values are also used by the
 * session factory and mission rules; do not duplicate this source of truth. */
import type {Pt} from './breach-core.ts';
export const OBJECTIVE:Pt={x:453,y:319};
export const EXTRACTION:Pt={x:307,y:669};
export const SCENARIOS=[
  {index:0,name:'SENTRY',spots:[{x:242,y:301,h:1.58},{x:523,y:254,h:2.48}]},
  {index:1,name:'CROSSWATCH',spots:[{x:228,y:442,h:0.6},{x:518,y:258,h:2.3}]},
  {index:2,name:'REAR GUARD',spots:[{x:262,y:213,h:1.1},{x:476,y:444,h:2.8}]},
] as const;
