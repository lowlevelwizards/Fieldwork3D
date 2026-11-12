/** Bounded style-specific visual mesh reuse for rendered shots only.
 * The authoritative fired-shot list, hit outcomes and disclosure remain
 * outside this pool. An effect may be reused only with the same colors and
 * chip count, so a reused instance never changes an impact silhouette.
 */
export class ShotVisualPool<T>{
 private readonly free=new Map<string,T[]>();
 private count=0;
 readonly capacity:number;
 constructor(capacity=20){this.capacity=capacity;}
 acquire(style:string,create:()=>T):T{
  const row=this.free.get(style);
  const retained=row?.pop();
  if(retained!==undefined){
   this.count--;
   if(!row?.length)this.free.delete(style);
   return retained;
  }
  return create();
 }
 release(style:string,visual:T,dispose:(visual:T)=>void):void{
  if(this.count>=this.capacity){dispose(visual);return;}
  let row=this.free.get(style);
  if(!row){row=[];this.free.set(style,row);}
  row.push(visual);this.count++;
 }
 clear(dispose:(visual:T)=>void):void{
  for(const row of this.free.values())for(const visual of row)dispose(visual);
  this.free.clear();this.count=0;
 }
 get spareCount(){return this.count;}
}
