/** Shared sRGB byte ↔ linear-light conversion. Pixel coverage/alpha policy
 * is intentionally separate for opaque wall and straight-alpha floor data. */
export const SRGB_BYTE_TO_LINEAR=Float64Array.from({length:256},(_,i)=>{
 const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
});
export function linearToSRGBByte(x:number):number{
 return Math.round(255*Math.max(0,Math.min(1,x<=.0031308?x*12.92:1.055*x**(1/2.4)-.055)));
}
