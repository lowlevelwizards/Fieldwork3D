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
 'door-wood':{family:'manufactured',structure:'directional',maxDarkening:18},
 'painted-wood':{family:'manufactured',structure:'none',maxDarkening:8},
 'furniture-wood':{family:'manufactured',structure:'directional',maxDarkening:19},
 'rough-wood':{family:'manufactured',structure:'boards',maxDarkening:29},
 plaster:{family:'manufactured',structure:'none',maxDarkening:5},
 brick:{family:'manufactured',structure:'joints',maxDarkening:38},
 cinderblock:{family:'manufactured',structure:'joints',maxDarkening:22},
 siding:{family:'manufactured',structure:'joints',maxDarkening:14},
 panel:{family:'manufactured',structure:'panels',maxDarkening:18},
 concrete:{family:'manufactured',structure:'panels',maxDarkening:24},
 tile:{family:'manufactured',structure:'joints',maxDarkening:28},
 linoleum:{family:'manufactured',structure:'none',maxDarkening:14},
 'sealed-concrete':{family:'manufactured',structure:'joints',maxDarkening:14},
 carpet:{family:'textile',structure:'none',maxDarkening:16},
 metal:{family:'manufactured',structure:'panels',maxDarkening:8},
 'painted-metal':{family:'manufactured',structure:'panels',maxDarkening:20},
 'industrial-steel':{family:'manufactured',structure:'panels',maxDarkening:17},
 'corrugated-metal':{family:'manufactured',structure:'directional',maxDarkening:36},
 'enamel-metal':{family:'manufactured',structure:'none',maxDarkening:5},
 fabric:{family:'textile',structure:'none',maxDarkening:11},
 'woven-fabric':{family:'textile',structure:'directional',maxDarkening:23},
 'molded-plastic':{family:'manufactured',structure:'panels',maxDarkening:18},
 'tire-rubber':{family:'manufactured',structure:'directional',maxDarkening:19},
 asphalt:{family:'manufactured',structure:'clusters',maxDarkening:17},
 earth:{family:'natural',structure:'clusters',maxDarkening:28},
 gravel:{family:'natural',structure:'clusters',maxDarkening:35},
 grass:{family:'natural',structure:'clusters',maxDarkening:26},
 'scruffy-grass':{family:'natural',structure:'clusters',maxDarkening:33},
 'packed-earth':{family:'natural',structure:'clusters',maxDarkening:28},
 'worn-asphalt':{family:'manufactured',structure:'clusters',maxDarkening:26},
 rubber:{family:'manufactured',structure:'directional',maxDarkening:12},
 foliage:{family:'natural',structure:'clusters',maxDarkening:28},
 paper:{family:'manufactured',structure:'none',maxDarkening:0},
 plastic:{family:'manufactured',structure:'none',maxDarkening:0},
 porcelain:{family:'manufactured',structure:'none',maxDarkening:0},
};
export const materialProfile=(kind:PixelSurface):MaterialProfile=>profiles[kind];
