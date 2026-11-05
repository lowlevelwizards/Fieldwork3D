/** Color-managed 160px facewear thumbnails.
 * THREE's offscreen render target returns linear RGB bytes. The 2D canvas
 * ImageData display expects sRGB, so dark rubber previews used to disappear.
 */
export function linear8ToSrgb8(byte:number):number{
 const v=Math.max(0,Math.min(255,Math.round(byte)))/255;
 const mapped=v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055;
 return Math.max(0,Math.min(255,Math.round(mapped*255)));
}
export const THUMB_LINEAR_TO_SRGB=Uint8Array.from(
 {length:256},(_,i)=>linear8ToSrgb8(i));
