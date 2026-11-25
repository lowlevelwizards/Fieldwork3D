/** W8 shared exact-fill 64-row atlas page planning. Texture format, UV
 * guards and filtering remain the responsibility of each surface compiler. */
export function planSurfacePageCounts(count:number):number[]{
 if(!Number.isSafeInteger(count)||count<0)throw new RangeError('Invalid surface slot count');
 const pages:number[]=[];
 while(count>0){const n=2**Math.floor(Math.log2(Math.min(count,32)));pages.push(n);count-=n;}
 return pages;
}
/** A changed page gets precisely one upload request per completed batch. */
export function uploadSurfacePages<T extends {needsUpdate:boolean}>(pages:Iterable<T>):number{
 const unique=new Set(pages);
 for(const page of unique)page.needsUpdate=true;
 return unique.size;
}
