import {WALL_EFFECTS,atlasWallStrip,atlasFaceStart,ATLAS_FACE_ROWS,selectWallEvents,type WallEffect,type SurfaceEvent,type WallSurfaceRecipe} from './worldgen/wall-surface-recipe.ts';
import {wallPatinaDimensions} from './worldgen/condition-wall.ts';
import {WALL_VISUAL_HEIGHT} from './breach-door-proportions.ts';
import {buildingTheme} from './worldgen/building-palettes.ts';
import type {PixelSurface} from './rendering/pixel-recipes.ts';
const house=buildingTheme('house',1),garage=buildingTheme('garage',1),warehouse=buildingTheme('warehouse',1),town=buildingTheme('townhouse',1);
export const WALL_FINISHES:readonly {name:string;surface:PixelSurface;color:number;band?:WallSurfaceRecipe['band']}[]=[
 {name:'Painted plaster',surface:'plaster',color:house.wall},
 {name:'Banded plaster',surface:'plaster',color:garage.wall,band:{color:garage.door,top:WALL_VISUAL_HEIGHT*.67}},
 {name:'Brick',surface:'brick',color:0xa58b75},
 {name:'Cinderblock',surface:'cinderblock',color:garage.wall},
 {name:'Concrete',surface:'concrete',color:garage.trim},
 {name:'Ceramic tile',surface:'tile',color:house.tile},
 {name:'Metal panel',surface:'panel',color:warehouse.wall},
 {name:'Siding',surface:'siding',color:town.wall},
];
export const WALL_WITNESSES:Record<WallEffect,{label:string;context:string;finish:number;event:Omit<SurfaceEvent,'kind'|'cause'>}>={
 fade:{label:'Fading',context:'Sun-exposed coating',finish:7,event:{x:48,y:11.76,width:81.6,height:22.4,threshold:20,priority:20}},
 contact:{label:'Contact wear',context:'Traffic beside door jamb',finish:1,event:{x:8,y:43.68,width:24,height:13,threshold:12,priority:100}},
 chip:{label:'Chipping',context:'Worn door jamb',finish:0,event:{x:2,y:49.28,width:7,height:12,threshold:47,priority:92}},
 damp:{label:'Rising damp',context:'Wet masonry at floor',finish:3,event:{x:48,y:47,width:60,height:24,threshold:30,priority:80}},
 runoff:{label:'Sill runoff',context:'Below an exterior window',finish:2,event:{x:48,y:46,width:11,height:16,threshold:30,priority:90}},
 crack:{label:'Cracks',context:'Mineral wall edge stress',finish:4,event:{x:5,y:12.32,width:15,height:24,threshold:65,priority:50}},
 repair:{label:'Repair patch',context:'Renovated plaster',finish:0,event:{x:48,y:25.2,width:17,height:18,threshold:22,priority:95}},
 moss:{label:'Moss',context:'Damp masonry beside planted ground',finish:2,event:{x:48,y:52,width:22,height:9,threshold:65,priority:83}},
 rust:{label:'Corrosion',context:'Exposed metal panel seam',finish:6,event:{x:48,y:44.24,width:12,height:22,threshold:50,priority:85}},
 grease:{label:'Cooking residue',context:'Above a kitchen stove',finish:5,event:{x:48,y:26,width:36,height:16,threshold:24,priority:96}},
 splash:{label:'Water splashes',context:'Above a sink',finish:5,event:{x:48,y:25,width:28,height:12,threshold:24,priority:94}},
 workgrime:{label:'Workshop contact',context:'Above a workbench',finish:3,event:{x:48,y:25,width:36,height:10,threshold:32,priority:95}},
};
export function wallSample(finish:number,effects:readonly WallEffect[]=[]):WallSurfaceRecipe{
 const {surface,color,band}=WALL_FINISHES[finish];
 return {length:96,height:WALL_VISUAL_HEIGHT,face:1,surface,color,band,directional:true,
 events:effects.map(kind=>({kind,cause:'lab:'+kind,...WALL_WITNESSES[kind].event})).sort((a,b)=>b.priority-a.priority||a.cause.localeCompare(b.cause))};
}
export function samplePixels(recipe:WallSurfaceRecipe,level:number,filter:'all'|'none'|WallEffect='all'){
 const {width}=wallPatinaDimensions(recipe.length);
 const strip=atlasWallStrip({front:recipe,back:{...recipe,face:-1,events:[]}},level,width,filter);
 const start=atlasFaceStart(1)*width*4;
 return {width,height:ATLAS_FACE_ROWS,bytes:strip.slice(start,start+ATLAS_FACE_ROWS*width*4)};
}
export {WALL_EFFECTS,selectWallEvents};
