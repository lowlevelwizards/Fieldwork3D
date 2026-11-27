/** Per-fabric tonal contrast, using display RGB rather than black overlays.
 * No camouflage pixels are changed. A print uses its authored neutral family. */
export function packDetailPalette(hex:number){
 const rgb=[hex>>16&255,hex>>8&255,hex&255];
 const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 const dark=luminance<65;
 const mix=(target:number[],weight:number)=>rgb.map((x,i)=>Math.round(x*(1-weight)+target[i]*weight));
 const neutral=dark?[145,148,144]:[38,41,36];
 const seam=mix(neutral,dark?.38:.38);
 const webbing=mix(dark?[117,121,117]:[54,58,49],dark?.27:.19);
 const hardware=mix(dark?[124,128,125]:[36,39,36],dark?.42:.56);
 const hexOf=(c:number[])=>c[0]*65536+c[1]*256+c[2];
 return {seam,webbing,hardware,trimHex:hexOf(webbing),hardwareHex:hexOf(hardware)};
}
