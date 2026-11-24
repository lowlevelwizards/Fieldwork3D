/** V5 material-specific visual atom, independent of collision/damage.
 * Caller supplies an already disclosed recorded impact and current replay age.
 * Mutate caller scratch: no allocation, random state or advancing simulation.
 */
export type MaterialImpactSurface='wood'|'stone'|'metal'|'glass'|'dust';
type Profile={count:number;life:number;speed:number;lift:number;gravity:number;width:number;length:number;color:number};
export const MATERIAL_IMPACT_PROFILES:Readonly<Record<MaterialImpactSurface,Readonly<Profile>>>=Object.freeze({
 wood:Object.freeze({count:4,life:.42,speed:27,lift:20,gravity:96,width:.40,length:3.6,color:0xbf9d77}),
 stone:Object.freeze({count:6,life:.36,speed:25,lift:18,gravity:108,width:.75,length:1.35,color:0xaaa8a1}),
 metal:Object.freeze({count:5,life:.24,speed:50,lift:27,gravity:90,width:.22,length:3.8,color:0xffd298}),
 glass:Object.freeze({count:7,life:.32,speed:29,lift:16,gravity:100,width:.35,length:1.7,color:0xc8e4df}),
 dust:Object.freeze({count:3,life:.31,speed:14,lift:12,gravity:25,width:1.3,length:1.55,color:0xb0a797})
});
export type ImpactParticleSample={x:number;y:number;z:number;yaw:number;roll:number;pitch:number;width:number;length:number;opacity:number;color:number};
export const MATERIAL_IMPACT_PARTICLE_LIMIT=140; // 20 visible impacts × max seven particles
const hash=(n:number)=>{n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;};
export function sampleMaterialImpact(surface:MaterialImpactSurface,id:number,index:number,age:number,
 x:number,y:number,z:number,out:ImpactParticleSample):boolean{
 const p=MATERIAL_IMPACT_PROFILES[surface];
 if(!p||!Number.isFinite(age)||age<0||age>=p.life||!Number.isInteger(index)||index<0||index>=p.count)return false;
 const key=Math.imul(id,31)+index,seed=hash(key),t=age/p.life;
 const theta=seed*Math.PI*2;
 const speed=p.speed*(.65+hash(key+101)*.7);
 const distance=1.2+speed*age;
 out.x=x+Math.cos(theta)*distance;out.z=z+Math.sin(theta)*distance;
 out.y=Math.max(.9,y+p.lift*age-p.gravity*age*age*.5);
 out.yaw=theta;out.roll=surface==='metal'?Math.PI*.5:theta+age*8;
 out.pitch=surface==='metal'?0:seed*2+age*5;
 const growth=surface==='dust'?1+t*1.7:1;
 out.width=p.width*growth;out.length=p.length*growth;
 out.opacity=(1-t)*(surface==='dust'?.45:1);out.color=p.color;
 return true;
}
