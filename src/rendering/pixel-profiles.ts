/** Material identity and intentional texture-frequency limits.
 * Recipes operate in neutral multipliers: no universal material noise. */
import type {PixelSurface} from './pixel-recipes.ts';
export type MaterialProfile={
 family:'manufactured'|'natural'|'textile';
 structure:'none'|'boards'|'joints'|'clusters'|'directional'|'panels';
 maxDarkening:number;
};
const profiles:Record<PixelSurface,MaterialProfile>={
 wood:{family:'manufactured',structure:'boards',maxDarkening:48},
 plaster:{family:'manufactured',structure:'none',maxDarkening:0},
 brick:{family:'manufactured',structure:'joints',maxDarkening:38},
 concrete:{family:'manufactured',structure:'panels',maxDarkening:10},
 tile:{family:'manufactured',structure:'joints',maxDarkening:28},
 carpet:{family:'textile',structure:'none',maxDarkening:5},
 metal:{family:'manufactured',structure:'panels',maxDarkening:8},
 fabric:{family:'textile',structure:'none',maxDarkening:4},
 asphalt:{family:'manufactured',structure:'none',maxDarkening:4},
 earth:{family:'natural',structure:'clusters',maxDarkening:10},
 gravel:{family:'natural',structure:'clusters',maxDarkening:29},
 grass:{family:'natural',structure:'clusters',maxDarkening:19},
 rubber:{family:'manufactured',structure:'directional',maxDarkening:12},
 foliage:{family:'natural',structure:'clusters',maxDarkening:15},
 paper:{family:'manufactured',structure:'none',maxDarkening:0},
};
export const materialProfile=(kind:PixelSurface):MaterialProfile=>profiles[kind];
