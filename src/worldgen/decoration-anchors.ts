/** MAP 05: decorative surfaces are not interchangeable with cover height. */
import {propDefinition} from './asset-catalog.ts';
export type SurfaceDetail='mug'|'books'|'papers'|'tools'|'plant'|'lamp'|'packages';
const allowed:Readonly<Record<SurfaceDetail,readonly string[]>>={
 mug:['coffee-table','side-table','nightstand','desk','dining-table','counter','workbench','cart','meeting-table'],
 books:['coffee-table','side-table','nightstand','desk','dresser','meeting-table','workbench'],
 papers:['desk','meeting-table','workbench','counter','cart','checkout','dining-table'],
 tools:['workbench','cart','tool-chest','counter'],
 plant:['coffee-table','side-table','nightstand','desk','dresser','counter','meeting-table'],
 lamp:['side-table','nightstand','desk','dresser'],
 packages:['workbench','cart','counter','checkout','pallet'],
};
export function compatibleDecoration(kind:SurfaceDetail,fixture:string):boolean{
 return allowed[kind].includes(fixture);
}
/** Match the actual visible top of the shape in breach-3d.ts, not its
 * approximate collision/cover classification. */
export function visibleSurfaceHeight(fixture:string):number{
 // Tables are boxes centered AT their canonical top, with a 3u slab.
 // Place decorations on the upper face, rather than embedding in the table.
 const tableTop=['table','desk','counter','workbench','cart',
  'dining-table','coffee-table','meeting-table'].includes(fixture);
 return (propDefinition(fixture)?.height??0)+(tableTop?1.5:0);
}

export function surfaceOffset(_fixture:string,width:number,depth:number,rng:()=>number){
 // Keep loose objects comfortably inside the supporting surface.
 const mx=Math.max(0,width/2-9),my=Math.max(0,depth/2-8);
 // Large counter footprints may still get subtle asymmetry.
 return {x:(rng()-.5)*Math.min(mx*1.25,14),
   y:(rng()-.5)*Math.min(my*1.25,11)};
}
