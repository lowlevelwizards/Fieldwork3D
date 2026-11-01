/** Material identity and intentional texture-frequency limits.
 * Recipes operate in neutral multipliers: no universal material noise. */
import type {PixelSurface} from './pixel-recipes.ts';
export type MaterialProfile={
 family:'manufactured'|'natural'|'textile';
 structure:'none'|'boards'|'joints'|'clusters'|'directional'|'panels';
 maxDarkening:number;
};
const profiles:Record<PixelSurface,MaterialProfile>={
 wood:{family:'manufactured',structure:'boards',maxDarkening:30},
 'door-wood':{family:'manufactured',structure:'directional',maxDarkening:6},
 'painted-wood':{family:'manufactured',structure:'none',maxDarkening:3},
 'furniture-wood':{family:'manufactured',structure:'directional',maxDarkening:8},
 'rough-wood':{family:'manufactured',structure:'boards',maxDarkening:29},
 plaster:{family:'manufactured',structure:'none',maxDarkening:0},
 brick:{family:'manufactured',structure:'joints',maxDarkening:38},
 cinderblock:{family:'manufactured',structure:'joints',maxDarkening:22},
 siding:{family:'manufactured',structure:'joints',maxDarkening:14},
 panel:{family:'manufactured',structure:'panels',maxDarkening:18},
 concrete:{family:'manufactured',structure:'panels',maxDarkening:16},
 tile:{family:'manufactured',structure:'joints',maxDarkening:28},
 linoleum:{family:'manufactured',structure:'none',maxDarkening:3},
 'sealed-concrete':{family:'manufactured',structure:'joints',maxDarkening:10},
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
 plastic:{family:'manufactured',structure:'none',maxDarkening:0},
 porcelain:{family:'manufactured',structure:'none',maxDarkening:0},
};
export const materialProfile=(kind:PixelSurface):MaterialProfile=>profiles[kind];
