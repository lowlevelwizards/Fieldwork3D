/** Build 156: continuous, phase-keyed support-hand path for physical reloads.
 * Pure presentation data; magazines remain owned by the simulation. */
import type {ReloadMode} from './breach-magazines.ts';
export type HandKey={t:number;x:number;y:number;z:number};
const smooth=(t:number)=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v)};
export function reloadHandKey(progress:number,mode:ReloadMode,
  supportX:number,supportY:number,primaryX:number):{x:number;y:number;z:number}{
  const rest={x:supportX,y:supportY,z:-1.6};
  const keys:HandKey[]=mode==='shells'?[
    {t:0,...rest},{t:.16,x:primaryX+3,y:-4,z:-5},
    {t:.30,x:primaryX+2,y:-10,z:-5},
    {t:.48,x:primaryX+4,y:-5,z:-5},
    {t:.62,x:primaryX+2,y:-10,z:-5},
    {t:.78,x:primaryX+4,y:-5,z:-5},
    {t:.90,x:primaryX+3,y:-3,z:-4},{t:1,...rest}
  ]:[
    {t:0,...rest},{t:.20,x:primaryX+4,y:-4,z:-4},
    {t:.32,x:primaryX+2,y:-8,z:-5},
    {t:.47,x:primaryX+3,y:-12,z:-7},
    {t:.61,x:primaryX+4,y:-15,z:-8},
    {t:.76,x:primaryX+2,y:-7,z:-5},
    {t:.85,x:primaryX+3,y:-4,z:-4},{t:1,...rest}
  ];
  const t=Math.max(0,Math.min(1,progress));
  for(let i=1;i<keys.length;i++){
    const next=keys[i];if(t>next.t)continue;
    const prev=keys[i-1],f=smooth((t-prev.t)/(next.t-prev.t));
    return {x:prev.x+(next.x-prev.x)*f,
      y:prev.y+(next.y-prev.y)*f,z:prev.z+(next.z-prev.z)*f};
  }
  return rest;
}
