/** Build 26.04: one mode-to-appearance contract for 2D and ISO.
 * Keep hostile silhouettes readable; geometric fog remains authoritative.
 * Room fixtures and weapon lights remain independent physical sources.
 */
import type {LightingMode} from './equipment-site-lighting.ts';
export type LightingPresentation={hemisphere:number;sun:number;floorTint:number};
const PROFILES:Record<LightingMode,LightingPresentation>={
 day:{hemisphere:1.18,sun:2.35,floorTint:0},
 evening:{hemisphere:.72,sun:1.15,floorTint:.20},
 night:{hemisphere:.33,sun:.24,floorTint:.49},
 blackout:{hemisphere:.16,sun:.06,floorTint:.70},
 emergency:{hemisphere:.21,sun:.09,floorTint:.62},
};
export function lightingPresentation(mode:LightingMode):LightingPresentation{
 return PROFILES[mode]??PROFILES.day;
}
