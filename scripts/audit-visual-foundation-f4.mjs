/** F4.4 deterministic visual-palette contract: no browser, GPU or assets.
 * Use: node --experimental-strip-types scripts/audit-visual-foundation-f4.mjs
 */
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
import {buildingTheme,roomFloor,roomFixtureFinishes,
 ARCHITECTURAL_COLOR_RELATIONSHIPS as LIMITS,
 paletteLuminance} from '../src/worldgen/building-palettes.ts';

const contrast=(a,b)=>Math.abs(paletteLuminance(a)-paletteLuminance(b));
export function auditVisualPalettes(){
 const problems=[],samples=[];
 const purposes=['waiting','reception','lobby','living','storage','workshop',
  'bathroom','exam','utility','guest'];
 for(const kind of BUILDING_ARCHETYPES){
  const schemes=[0,1,2].map(seed=>buildingTheme(kind,seed));
  if(new Set(schemes.map(s=>s.name)).size!==3)
   problems.push(kind+':seeded scheme identity');
  for(let seed=0;seed<3;seed++){
   const theme=schemes[seed];
   for(const [name,col,minimum] of [
    ['floor',theme.floor,LIMITS.minimumFloorWall],
    ['tile',theme.tile,LIMITS.minimumTileWall],
    ['trim',theme.trim,LIMITS.minimumTrimWall],
    ['cap',theme.cap,LIMITS.minimumCapWall]]){
    if(contrast(theme.wall,col)<minimum-1)
     problems.push(kind+'/'+theme.name+':'+name+' contrast');
   }
   for(const purpose of purposes){
    const first=roomFixtureFinishes(theme,purpose,0);
    const repeat=roomFixtureFinishes(theme,purpose,0);
    if(JSON.stringify(first)!==JSON.stringify(repeat))
     problems.push(kind+':'+purpose+' non-deterministic accent');
    for(const c of [...Object.values(first),roomFloor(theme,purpose,seed)]){
     if(!Number.isInteger(c)||c<0||c>0xffffff)
      problems.push(kind+':'+purpose+' out-of-range color');
    }
   }
   samples.push({archetype:kind,scheme:theme.name,seed,wall:theme.wall,
    floor:theme.floor,tile:theme.tile,trim:theme.trim,cap:theme.cap,
    publicAccent:roomFixtureFinishes(theme,'waiting').accent});
  }
 }
 return {schemes:samples.length,purposes:purposes.length,
  errors:problems,samples};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const report=auditVisualPalettes();
 console.log('F4 visual palette audit',JSON.stringify({
  schemes:report.schemes,roomPurposes:report.purposes,errors:report.errors,
  examples:report.samples.filter(x=>x.archetype==='motel'||x.archetype==='warehouse')
 }));
 if(report.errors.length)process.exitCode=1;
}
