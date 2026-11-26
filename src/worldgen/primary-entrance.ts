/** A paired public entrance is still one architectural aperture. Its two
 * leaves retain individual physical identities for orders, collisions and replay. */
import type {Door,Segment} from '../breach-core.ts';
export function primaryEntranceSpan(doors:readonly Door[]|undefined):Segment|undefined{
 const left=doors?.find(d=>d.id==='FRONT');
 if(!left)return undefined;
 const right=left.pairedWith?doors?.find(d=>d.id===left.pairedWith&&d.pairedWith===left.id):undefined;
 if(!right)return {a:left.a,b:left.b};
 const ends=[left.a,left.b,right.a,right.b];
 let a=left.a,b=left.b,best=0;
 for(const p of ends)for(const q of ends){
  const d=(p.x-q.x)**2+(p.y-q.y)**2;
  if(d>best){a=p;b=q;best=d;}
 }
 return {a,b};
}
