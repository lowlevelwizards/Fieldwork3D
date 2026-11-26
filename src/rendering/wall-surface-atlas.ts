import * as THREE from 'three';
import type {Site} from '../breach-site.ts';
import {planFixtureWallResidue} from '../worldgen/wall-story-residue.ts';
import {wallPatinaDimensions} from '../worldgen/condition-wall.ts';
import {planWallFaces,atlasWallStrip,type WallFacePair,type WallEffectFilter} from '../worldgen/wall-surface-recipe.ts';
import {wallAtlasLayout,metricActiveWidth} from './material-art-scale.ts';
import {planSurfacePageCounts,uploadSurfacePages} from './surface-atlas-pages.ts';
export type WallAtlasSlot={index:number;row:number;texture:THREE.DataTexture;pair:WallFacePair;patterned:boolean;metricWidth?:number;trimPalette?:{trim:number;cap:number}};
export type WallAtlas={pages:THREE.DataTexture[];slots:Map<number,WallAtlasSlot>};
/** Width buckets and power-of-two strip counts ensure no unused pixel
 * allocation, power-of-two mip boundaries and a bounded 2048-row page. */
export function planAtlasPages(widths:readonly {index:number;width:number}[]){
 const buckets=new Map<number,number[]>();
 for(const {index,width} of widths){
  if(![64,128,256].includes(width))throw Error('Invalid wall atlas width');
  const ids=buckets.get(width)??[];ids.push(index);buckets.set(width,ids);
 }
 const pages:{width:number;indices:number[]}[]=[];
 for(const [width,ids] of [...buckets].sort((a,b)=>a[0]-b[0])){
  let start=0;
  for(const count of planSurfacePageCounts(ids.length)){
   pages.push({width,indices:ids.slice(start,start+count)});start+=count;
  }
 }
 return pages;
}
export function writeAtlasSlot(slot:WallAtlasSlot,level:number,filter:WallEffectFilter){
 const image=slot.texture.image as {data:Uint8Array;width:number;height:number};
 image.data.set(atlasWallStrip(slot.pair,level,image.width,filter,slot.patterned,slot.metricWidth),slot.row*image.width*4);
 // Two palette texels in the edge row, leaving the body edge midpoint
 // and both broad-face UV regions untouched. Constant UVs sample LOD0.
 if(slot.trimPalette)for(const kind of ['trim','cap'] as const){
  const color=slot.trimPalette[kind],x=kind==='trim'?0:image.width-1;
  image.data.set([(color>>>16)&255,(color>>>8)&255,color&255,255],(slot.row*image.width+x)*4);
 }
}
export function wallTrimSwatchUV(slot:WallAtlasSlot,kind:'trim'|'cap'):[number,number]{
 const {width,height}=slot.texture.image;
 return [(kind==='trim'?.5:width-.5)/width,(slot.row+.5)/height];
}
export function updateWallAtlas(slots:Iterable<WallAtlasSlot>,level:number,filter:WallEffectFilter){
 const pages=new Set<THREE.DataTexture>();
 for(const slot of slots){writeAtlasSlot(slot,level,filter);pages.add(slot.texture);}
 return uploadSurfacePages(pages);
}
export function buildWallAtlas(site:Site,height:number,level:number,filter:WallEffectFilter,patterned:boolean,trimPalette?:{trim:number;cap:number},storyEnabled=false,metric=false):WallAtlas{
 const story=storyEnabled?planFixtureWallResidue(site,height):undefined;
 const widths=site.walls.flatMap((w,index)=>{
  const length=Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y);
  return length<5?[]:[{index,width:wallPatinaDimensions(length).width}];
 });
 const pages:THREE.DataTexture[]=[],slots=new Map<number,WallAtlasSlot>(),layout=wallAtlasLayout(metric);
 const pagePlans=planAtlasPages(widths).flatMap(page=>metric&&page.indices.length>16?[{...page,indices:page.indices.slice(0,16)},{...page,indices:page.indices.slice(16)}]:[page]);
 for(const page of pagePlans){
  const rows=page.indices.length*layout.rows;
  const texture=new THREE.DataTexture(new Uint8Array(page.width*rows*4),page.width,rows,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestMipmapNearestFilter;texture.generateMipmaps=true;
  texture.name='w3-wall-atlas:'+page.width+'x'+rows;
  pages.push(texture);
  page.indices.forEach((index,i)=>{const pair=planWallFaces(site,index,height,story);slots.set(index,{index,row:i*layout.rows,texture,pair,patterned,trimPalette,metricWidth:metric?metricActiveWidth(pair.front.length,page.width):undefined});});
 }
 updateWallAtlas(slots.values(),level,filter);
 return {pages,slots};
}
