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
