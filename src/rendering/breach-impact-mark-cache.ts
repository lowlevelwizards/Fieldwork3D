/** V9: recorded ground evidence, not a second evidence ledger.
 * Every frame still resolves the same camera and sight predicates.
 * Only identical submitted transforms and colors skip GPU writes.
 */
export const MARK_MATRIX_DIRTY=1,MARK_COLOR_DIRTY=2,MARK_STYLE_DIRTY=4;
export class ImpactMarkSlotCache{
 private readonly values:Float64Array;
 readonly capacity:number;
 constructor(capacity:number){this.capacity=capacity;this.values=new Float64Array(capacity*7).fill(NaN);}
 update(i:number,x:number,y:number,z:number,radius:number,color:number,fade:number,style:number):number{
  if(!Number.isInteger(i)||i<0||i>=this.capacity)return 0;
  const a=this.values,k=i*7;
  let dirty=0;
  if(a[k]!==x||a[k+1]!==y||a[k+2]!==z||a[k+3]!==radius)dirty|=MARK_MATRIX_DIRTY;
  if(a[k+4]!==color||a[k+5]!==fade)dirty|=MARK_COLOR_DIRTY;
  if(a[k+6]!==style)dirty|=MARK_STYLE_DIRTY;
  a[k]=x;a[k+1]=y;a[k+2]=z;a[k+3]=radius;a[k+4]=color;a[k+5]=fade;a[k+6]=style;
  return dirty;
 }
 reset(){this.values.fill(NaN);}
}
