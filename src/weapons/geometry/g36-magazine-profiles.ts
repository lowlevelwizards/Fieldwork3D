/** FT1.9C — G36-specific smoked-polymer magazine silhouette.
 * Still a single simple exterior profile; translucent materials and lugs deferred.
 * This curve is NOT AR STANAG geometry or an exaggerated AK magazine.
 */
import type {Outline} from './profile-primitives.ts';
export const G36_MAG30_OUTLINE:Outline=[
 [-1.12,-2.62],[1.96,-2.62],[2.18,-3.30],
 [2.37,-4.43],[2.88,-6.99],[2.21,-7.26],
 [-.43,-7.26],[-.92,-5.20]
];
export const G36_MAG30_DEPTH=2.15;
