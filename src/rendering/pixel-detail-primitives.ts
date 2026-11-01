/** Spatially bounded, deterministic visual details, never shared noise. */
export const integerHash=(x:number,y:number,seed=0)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
/** One or two tiny fragments per 32px tile, only for compatible finishes. */
export function manufacturedSpeck(x:number,y:number,seed:number,period=16):boolean{
 const blockX=Math.floor(x/period),blockY=Math.floor(y/period);
 const h=integerHash(blockX,blockY,seed);
 const sx=blockX*period+3+(h%Math.max(1,period-6));
 const sy=blockY*period+3+((h>>>9)%Math.max(1,period-6));
 return x===sx&&y===sy;
}
/** Short directional strokes are deliberately separated by open areas. */
export function grainStroke(x:number,y:number,seed:number):boolean{
 const band=Math.floor(y/8),h=integerHash(band,0,seed);
 const yy=band*8+2+(h%4),start=(h>>>7)%25;
 return y===yy&&x>=start&&x<start+3;
}
