/** Offline mip levels. Retain texture construction up close, while
 * naturally resolving to the clean authored tint at distant tactical zoom.
 * Build once on cache miss, never in the render loop.
 */
export type PixelMip={data:Uint8Array;width:number;height:number};
export function readableMipChain(base:Uint8Array,size:number):PixelMip[]{
 if(!Number.isInteger(size)||size<2||(size&(size-1))!==0||
    base.length!==size*size*4)throw Error('invalid pixel mip source');
 const levels:PixelMip[]=[{data:base,width:size,height:size}];
 let current=base,width=size;
 while(width>1){
  const nextSize=width/2,output=new Uint8Array(nextSize*nextSize*4);
  const scale=nextSize<=2?1:nextSize<=4?.7:nextSize<=8?.35:.08;
  for(let y=0;y<nextSize;y++)for(let x=0;x<nextSize;x++){
   const i=(y*nextSize+x)*4;
   let lum=0;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)
    lum+=current[((y*2+dy)*width+(x*2+dx))*4];
   lum/=4;
   const clean=lum+(255-lum)*scale;
   const pixel=Math.round(Math.max(0,Math.min(255,clean)));
   output[i]=output[i+1]=output[i+2]=pixel;output[i+3]=255;
  }
  levels.push({data:output,width:nextSize,height:nextSize});
  current=output;width=nextSize;
 }
 return levels;
}
