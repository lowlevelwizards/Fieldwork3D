/** One immutable CPU preview atlas per approved pattern, shared by every
 * non-WebGL camouflage browser. Exact artist-authored RGBA masters, no scaling,
 * palette transforms or new canvas allocations on filter changes.
 */
import {headwearCamoSize,headwearCamoPixels,type HeadwearCamoId}
 from './operator-headwear-camo.ts';
const tiles=new Map<HeadwearCamoId,HTMLCanvasElement>();
export function getCamoPreviewSource(id:HeadwearCamoId):HTMLCanvasElement{
 let source=tiles.get(id);if(source)return source;
 source=document.createElement('canvas');
 const size=headwearCamoSize(id);
 source.width=source.height=size;
 const ctx=source.getContext('2d');
 if(ctx){
  const image=ctx.createImageData(size,size);
  image.data.set(headwearCamoPixels(id));
  ctx.putImageData(image,0,0);
 }
 tiles.set(id,source);
 return source;
}
export function paintCamoPreview(target:HTMLCanvasElement,id:HeadwearCamoId){
 const source=getCamoPreviewSource(id),size=source.width;
 if(target.width!==size||target.height!==size){
  target.width=size;target.height=size;
 }
 const ctx=target.getContext('2d');
 if(ctx){ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,size,size);
  ctx.drawImage(source,0,0);}
 target.dataset.camoPreview=id;
}
export function camoPreviewCacheSize(){return tiles.size;}
