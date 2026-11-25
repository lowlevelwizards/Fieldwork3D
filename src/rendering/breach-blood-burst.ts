/** Four exaggerated, short-lived shapes using the existing solid batch.
 * The origin and yaw come from the committed shot, never presentation RNG. */
import type {ImpactParticleSample} from './breach-material-impact-atom.ts';
export const BLOOD_BURST_COUNT=4,BLOOD_BURST_LIFE=.4;
export function sampleBloodBurst(id:number,index:number,age:number,yaw:number,
 x:number,y:number,z:number,out:ImpactParticleSample):boolean{
 if(!Number.isFinite(age)||age<0||age>=BLOOD_BURST_LIFE||index<0||index>=BLOOD_BURST_COUNT)return false;
 const t=age/BLOOD_BURST_LIFE,seed=Math.sin(id*2.41+index*3.17);
 const theta=yaw+(index-1.5)*.72+seed*.28;
 const distance=2+(12+index*3)*t;
 out.x=x+Math.cos(theta)*distance;out.z=z+Math.sin(theta)*distance;
 out.y=Math.max(1,y+Math.sin(Math.PI*t)*6-12*t*t);
 out.pitch=.9+seed*.45;out.yaw=theta;out.roll=Math.PI*.5+seed*.35+t;
 out.width=(3.3+index*.28)*(1-.22*t);out.length=(4.45+index*.40)*(1-.16*t);
 out.opacity=.74*Math.max(0,1-t*t);out.color=index===0?0xa65a4e:0x914a44;
 return true;
}
