/** Stable minimum-f heap for tactical A*.
 * Insertion sequence preserves the old Array.sort (stable) tie behavior so
 * equivalent-cost routes make the same corner and doorway decisions. */
export type RouteFrontierNode={col:number;row:number;g:number;f:number};
type Entry=RouteFrontierNode&{order:number};
export class RouteOpenHeap{
  private readonly data:Entry[]=[];
  private nextOrder=0;
  get length(){return this.data.length;}
  private before(a:Entry,b:Entry){
    return a.f<b.f||(a.f===b.f&&a.order<b.order);
  }
  push(node:RouteFrontierNode){
    const entry:Entry={...node,order:this.nextOrder++};
    const data=this.data;
    let i=data.length;data.push(entry);
    while(i>0){
      const p=(i-1)>>1;
      if(!this.before(entry,data[p]))break;
      data[i]=data[p];i=p;
    }
    data[i]=entry;
  }
  pop():RouteFrontierNode|undefined{
    const data=this.data;
    if(!data.length)return undefined;
    const first=data[0],last=data.pop()!;
    if(data.length){
      let i=0;
      while(true){
        const left=i*2+1;
        if(left>=data.length)break;
        const right=left+1;
        const child=right<data.length&&this.before(data[right],data[left])?
          right:left;
        if(!this.before(data[child],last))break;
        data[i]=data[child];i=child;
      }
      data[i]=last;
    }
    return first;
  }
}
