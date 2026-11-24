/** Deterministic, rewind-safe glass burst transforms.
 * Every shard is rendered by one pooled instanced mesh. Authoritative
 * window state (and the replay frame) owns the break timestamp.
 */
import type {WindowState} from '../breach-windows.ts';

export const WINDOW_SHARD_DURATION=1.05;
export const WINDOW_SHARDS_PER_PANE=6;
export type WindowShardPose={
 x:number;y:number;z:number;rx:number;ry:number;rz:number;scale:number;
};
export function windowShardPose(
 w:Pick<WindowState,'x'|'y'|'width'|'vertical'|'sillHeight'|'headHeight'|'shatteredAt'>,
 time:number,index:number):WindowShardPose|null{
 const at=w.shatteredAt;
 if(at===undefined||!Number.isFinite(at)||index<0||
   index>=WINDOW_SHARDS_PER_PANE)return null;
 const t=time-at;
 if(t<0||t>=WINDOW_SHARD_DURATION)return null;
 const spread=(index-(WINDOW_SHARDS_PER_PANE-1)/2)/
   (WINDOW_SHARDS_PER_PANE-1);
 const outward=(index%2?1:-1)*t*(5+index*.9);
 const lateral=spread*(w.width-8)*.72+spread*t*19;
 const sill=w.sillHeight??14,head=w.headHeight??32;
 const drop=t*t*36;
 const elevation=Math.max(.65,sill+(head-sill)*(.35+(index%3)*.17)-drop);
 return {
  x:w.x+(w.vertical?outward:lateral),
  y:elevation,
  z:w.y+(w.vertical?lateral:outward),
  rx:t*(1.4+index*.44),ry:t*(2.2+index*.38),
  rz:spread*1.8+t*2.4,scale:.85+(index%3)*.24
 };
}

/** V6: the existing transient burst takes priority over resting evidence.
 * No new simulation state, no extra batch and no additional physical cover.
 * Legacy panes without a recorded fracture time remain fail-closed.
 */
export const WINDOW_SHARD_CAPACITY=96;
export const WINDOW_SETTLED_SHARDS_PER_PANE=4;
export type SettledWindowShardPose=WindowShardPose&{heightScale:number};
export function settledWindowShardPose(
 w:Pick<WindowState,'x'|'y'|'width'|'vertical'|'shattered'|'shatteredAt'>,
 time:number,index:number,out:SettledWindowShardPose
):boolean{
 const at=w.shatteredAt;
 if(!w.shattered||at===undefined||!Number.isFinite(at)||
    !Number.isFinite(time)||time-at<WINDOW_SHARD_DURATION||
    !Number.isInteger(index)||index<0||index>=WINDOW_SETTLED_SHARDS_PER_PANE)return false;
 const lateral=(index-1.5)*Math.min(8,Math.max(0,w.width-8)*.22);
 const outward=(index%2?1:-1)*(6+index*2.2);
 out.x=w.x+(w.vertical?outward:lateral);
 out.z=w.y+(w.vertical?lateral:outward);
 out.y=.65;out.rx=0;out.ry=index*2.399;out.rz=0;
 out.scale=.85+(index%3)*.24;out.heightScale=.25;
 return true;
}
/** Cache exact last submitted slot values. A stationary debris field can
 * retain its GPU matrices even during paused camera motion. Visibility,
 * replay and different site contents can replace any slot on the next frame.
 */
export class WindowShardSlotCache{
 private readonly values=new Float64Array(WINDOW_SHARD_CAPACITY*8).fill(NaN);
 changed(index:number,p:WindowShardPose,heightScale=1):boolean{
  if(index<0||index>=WINDOW_SHARD_CAPACITY)return false;
  const a=this.values,k=index*8;
  if(a[k]===p.x&&a[k+1]===p.y&&a[k+2]===p.z&&a[k+3]===p.rx&&
     a[k+4]===p.ry&&a[k+5]===p.rz&&a[k+6]===p.scale&&a[k+7]===heightScale)return false;
  a[k]=p.x;a[k+1]=p.y;a[k+2]=p.z;a[k+3]=p.rx;a[k+4]=p.ry;
  a[k+5]=p.rz;a[k+6]=p.scale;a[k+7]=heightScale;return true;
 }
 reset(){this.values.fill(NaN);}
}
