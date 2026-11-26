/** Authored lab witnesses: actual material and mask composition, not generated room placement. */
import type {Site,Room,BuildingArchetype} from './breach-site.ts';
import type {WearMark} from './worldgen/environment-wear.ts';
import {conditionFloorPixels} from './worldgen/condition-visual.ts';
import {rasterFloorWear} from './rendering/floor-wear-raster.ts';
import {roomPixelSurface,fixturePixelSurface} from './worldgen/pixel-surface-selection.ts';
import {buildingTheme,roomFloor} from './worldgen/building-palettes.ts';
import {productionPixelPattern,materialTileSize,type PixelSurface} from './rendering/pixel-recipes.ts';
import {wearPixels,type WearTextureKind} from './rendering/pixel-decals.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './rendering/wear-opacity.ts';
import {wearFinish} from './rendering/wear-finish.ts';
import {ageMaterialColor} from './rendering/condition-materials.ts';
import {SRGB_BYTE_TO_LINEAR as linear,linearToSRGBByte as encode} from './rendering/surface-color-space.ts';
export const FLOOR_WITNESSES:readonly {name:string;archetype:BuildingArchetype;purpose:string;fixture?:string;kind:WearTextureKind}[]=[
 {name:'Residential floorboards',archetype:'house',purpose:'living',kind:'scratch'},
 {name:'Kitchen ceramic',archetype:'restaurant',purpose:'kitchen',fixture:'stove',kind:'grease'},
 {name:'Clinic linoleum',archetype:'clinic',purpose:'exam',fixture:'handwash-station',kind:'mineral'},
 {name:'Office carpet',archetype:'office',purpose:'office',kind:'scuff'},
 {name:'Workshop sealed concrete',archetype:'garage',purpose:'workshop',fixture:'vehicle-lift',kind:'oil'},
 {name:'Warehouse concrete',archetype:'warehouse',purpose:'loading',fixture:'workbench',kind:'scratch'}
];
export const FIXTURE_WITNESSES:readonly {name:string;fixture:string;kind:WearTextureKind;color:number;surface?:PixelSurface}[]=[
 {name:'Painted steel · corrosion',fixture:'tool-chest',kind:'rust',color:0x8e5645},
 {name:'Factory steel · oil',fixture:'generator',kind:'oil',color:0x82947a},
 {name:'Furniture timber · chips',fixture:'desk',kind:'chip',color:0xa17a54},
 {name:'Rough timber · scratches',fixture:'pallet',kind:'scratch',color:0xad8a5e},
 {name:'Upholstery · fraying',fixture:'sofa',kind:'fray',color:0x768b83},
 {name:'Porcelain · mineral buildup',fixture:'sink',kind:'mineral',color:0xdeddd2},
 {name:'Molded plastic · scuff',fixture:'storage-tote',kind:'scuff',color:0x657e92},
 {name:'Corrugated cladding · paint peel',fixture:'shipping-container',kind:'paint-peel',color:0x6d8e93,surface:'corrugated-metal'}
];
const baseBytes=(surface:PixelSurface,color:number,width:number,height:number,seed:number,physicalW:number,physicalH:number)=>{
 const span=materialTileSize(surface),pattern=productionPixelPattern(surface,seed%4),out=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const tx=Math.floor((x+.5)*physicalW/width)%span,ty=Math.floor((y+.5)*physicalH/height)%span;
  const shade=linear[pattern[(ty*span+tx)*4]],p=(y*width+x)*4;
  for(let k=0;k<3;k++)out[p+k]=encode(linear[(color>>((2-k)*8))&255]*shade);
  out[p+3]=255;
 }return out;
};
function apply(out:Uint8Array,mask:Uint8Array){for(let i=0;i<out.length;i+=4){const a=mask[i+3]/255;for(let k=0;k<3;k++)out[i+k]=encode(linear[out[i+k]]*(1-a)+linear[mask[i+k]]*a);}return out;}
export function floorWitness(index:number,level:number,seed:number){
 const w=FLOOR_WITNESSES[index],room:Room={id:'lab',kind:'room',purpose:w.purpose,x:0,y:0,w:96,h:96,tone:0};
 const point={x:0,y:0};
 const site:Site={seed,name:'Lab specimen',archetype:w.archetype,rooms:[room],walls:[],doors:[],cover:w.fixture?[{fixture:w.fixture,x:48,y:19,w:22,h:20,orientation:0}]:[],entrance:point,spawn:[],enemies:[],objective:point,extract:point,roomCount:1,layout:'office',conditionLevel:level,programLocked:true};
 const surface=roomPixelSurface(w.archetype,w.purpose),base=roomFloor(buildingTheme(w.archetype,seed),room.purpose,room.tone),size=64;
 const bytes=baseBytes(surface,base,size,size,seed,room.w,room.h),mask=conditionFloorPixels(site,room,level,size);
 const marks:WearMark[]=level>=20?[{id:'lab:'+index+':'+seed,roomId:room.id,kind:w.kind,x:w.fixture?48:18,y:w.fixture?34:55,width:16+level*.14,depth:11+level*.09,rotation:.2,opacity:.12+level*.003}]:[];
 rasterFloorWear(mask,room,0,marks,size,1,base);return {width:size,height:size,bytes:apply(bytes,mask)};
}
export function fixtureWitness(index:number,level:number,seed:number){
 const w=FIXTURE_WITNESSES[index],surface=w.surface??fixturePixelSurface(w.fixture),size=64;
 const color=ageMaterialColor(w.color,surface,level,0),bytes=baseBytes(surface,color,size,size,seed,48,48),mask=wearPixels(w.kind,seed);
 const finish=wearFinish(surface,w.kind,color);
 if(level>=20)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const span=24+Math.round(level*.12),left=Math.floor((size-span)/2),top=Math.floor((size-span)/2);
  if(x<left||x>=left+span||y<top||y>=top+span)continue;
  const i=(y*size+x)*4,coverage=mask[(Math.floor((y-top)*32/span)*32+Math.floor((x-left)*32/span))*4+3]/255;
  const ink=coverage>=.72?finish.color:finish.rimColor,alpha=coverage*WEAR_ALPHA_BANDS[wearOpacityBucket(.16+.40*level/100)];
  for(let k=0;k<3;k++)bytes[i+k]=encode(linear[bytes[i+k]]*(1-alpha)+linear[(ink>>((2-k)*8))&255]*alpha);
 }
 return {width:size,height:size,bytes};
}
