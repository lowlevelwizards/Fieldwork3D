/** Exact CPU-side instance payload cache. No invalidation by clock alone:
 * a visible slot may be replaced by a different recorded event on seek.
 * Every submitted value is compared before skipping a GPU write.
 */
export class EffectSlotCache{
 private readonly values:Float64Array;
 private readonly width:number;
 constructor(capacity:number,width:number){
  this.width=width;this.values=new Float64Array(capacity*width).fill(NaN);
 }
 // The caller reuses a fixed scratch payload; never retain its reference.
 changed(index:number,payload:readonly number[]):boolean{
  const at=index*this.width;
  if(index<0||at+this.width>this.values.length||payload.length!==this.width)
   throw new RangeError('Invalid effect slot');
  let changed=false;
  for(let i=0;i<this.width;i++){
   if(this.values[at+i]!==payload[i]){changed=true;this.values[at+i]=payload[i];}
  }
  return changed;
 }
 reset(){this.values.fill(NaN);}
}
