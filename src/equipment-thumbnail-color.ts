/** Readback from the default linear WebGL render target is NOT a display-ready
 * sRGB image. PNG encoders expect sRGB byte channels; writing linear bytes
 * directly makes dark green equipment virtually black on mobile.
 */
export function linearByteToSrgb(byte:number):number{
 const linear=Math.max(0,Math.min(1,byte/255));
 const srgb=linear<=.0031308?12.92*linear:
  1.055*Math.pow(linear,1/2.4)-.055;
 return Math.min(255,Math.max(0,Math.round(255*srgb)));
}
export function copyLinearRgbaToSrgbFlipped(
 pixels:Uint8Array,width:number,height:number):Uint8ClampedArray{
 if(pixels.length!==width*height*4)throw Error('Invalid model image buffer');
 const image=new Uint8ClampedArray(pixels.length);
 for(let y=0;y<height;y++){
  const offset=(height-y-1)*width*4;
  for(let x=0;x<width;x++){
   const src=offset+x*4,dst=(y*width+x)*4;
   image[dst]=linearByteToSrgb(pixels[src]);
   image[dst+1]=linearByteToSrgb(pixels[src+1]);
   image[dst+2]=linearByteToSrgb(pixels[src+2]);
   image[dst+3]=255;
  }
 }
 return image;
}
