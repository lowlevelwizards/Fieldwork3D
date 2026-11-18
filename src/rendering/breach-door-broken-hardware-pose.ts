/** D3.29I: render-only, deterministic severed-hardware trajectory.
 * Seek/replay calculates exactly the same pose from the authoritative kick
 * timestamp; no per-frame integration, random draws or live physics bodies.
 * Ground contact is visual and cannot alter traversal or collision.
 */
import type {Door} from '../breach-core.ts';

export type FallenHardwarePose={
 visible:boolean;x:number;y:number;z:number;tilt:number;roll:number;
 settled:boolean;
};

export function fallenDoorHardwarePose(
 door:Pick<Door,'id'|'hinge'|'swing'|'hardwareDetachedAt'|'hardwareDetachedFraction'>,
 now:number,length:number
):FallenHardwarePose{
 const at=door.hardwareDetachedAt;
 const visible=at!==undefined&&Number.isFinite(at)&&now>=at;
 const side=door.hinge==='b'?-1:1;
 const hinge=door.hinge==='b'?length/2:-length/2;
 const angle=(door.swing??-1)*(door.hardwareDetachedFraction??0)*1.54;
 const handle=side*length*.70;
 const initialX=hinge+Math.cos(angle)*handle;
 const initialZ=-Math.sin(angle)*handle;
 const t=visible?Math.min(1.1,Math.max(0,now-at!)):0;
 const progress=Math.min(1,t/.8);
 const tilt=progress*1.48*side;
 const roll=progress*2.8*(door.swing??-1);
 // 18 units high, first floor contact at about half a second, followed
 // by one small damped bounce; exactly at rest after 1.1s.
 const floor=1.65;
 const freeFall=18-61*t*t;
 const bounce=t>.52&&t<1.1?
   Math.max(0,3.5*(1-(t-.52)/.58)*Math.sin((t-.52)*17)):0;
 const y=t<.52?Math.max(floor,freeFall):floor+bounce;
 return {visible,x:initialX+side*7*progress,
  y,z:initialZ+(door.swing??-1)*9*progress,
  tilt,roll,settled:visible&&t>=1.1};
}
