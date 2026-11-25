/** V5 material-specific visual atom, independent of collision/damage.
 * Caller supplies an already disclosed recorded impact and current replay age.
 * Mutate caller scratch: no allocation, random state or advancing simulation.
 */
export type MaterialImpactSurface='wood'|'stone'|'metal'|'glass'|'dust';
type Profile={count:number;life:number;speed:number;lift:number;gravity:number;width:number;length:number;color:number;pulse:number;pulseColor:number;spread:number};
export const MATERIAL_IMPACT_PROFILES:Readonly<Record<MaterialImpactSurface,Readonly<Profile>>>=Object.freeze({
 wood:Object.freeze({count:3,life:.40,speed:32,lift:25,gravity:96,width:2.1,length:8.0,color:0xd5a267,pulse:6.5,pulseColor:0xdfb27a,spread:15}),
 stone:Object.freeze({count:4,life:.40,speed:29,lift:23,gravity:108,width:3.3,length:4.4,color:0xd1c5ae,pulse:7.0,pulseColor:0xe0d4bd,spread:15}),
 metal:Object.freeze({count:5,life:.36,speed:58,lift:30,gravity:90,width:1.1,length:8.4,color:0xffde8c,pulse:5.8,pulseColor:0xffe3a4,spread:19}),
 glass:Object.freeze({count:7,life:.40,speed:33,lift:20,gravity:100,width:2.0,length:6.2,color:0xe1faf5,pulse:5.8,pulseColor:0xd3f2ee,spread:14}),
 dust:Object.freeze({count:3,life:.40,speed:18,lift:15,gravity:25,width:3.0,length:3.2,color:0xc8b59b,pulse:5.6,pulseColor:0xe2d3b1,spread:11})
});
export type ImpactParticleSample={x:number;y:number;z:number;yaw:number;roll:number;pitch:number;width:number;length:number;opacity:number;color:number;depth?:number};
export const MATERIAL_IMPACT_PARTICLE_LIMIT=140; // 20 visible impacts × max seven particles
const hash=(n:number)=>{n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;};
export function fixtureImpactAccent(fixture?:string):'paper'|'fabric'|'cardboard'|undefined{
 if(!fixture)return;
 if(/desk|filing-cabinet|bookcase|bookshelf/.test(fixture))return 'paper';
 if(/sofa|armchair|bed|mattress|upholster/.test(fixture))return 'fabric';
 if(/cardboard|carton/.test(fixture))return 'cardboard';
}
export function sampleMaterialImpact(surface:MaterialImpactSurface,id:number,index:number,age:number,
 x:number,y:number,z:number,out:ImpactParticleSample,fixture?:string):boolean{
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
 out.opacity=(1-t*t)*(surface==='dust'?.62:1);out.color=p.color;out.depth=out.width;
 const accent=fixtureImpactAccent(fixture);
 if(accent&&(index===p.count-1||surface==='dust')){
  const paper=accent==='paper',fabric=accent==='fabric';
  out.width=paper?4.5:fabric?4:5;out.length=paper?6.2:fabric?4.5:7;out.depth=paper?.32:fabric?2:.55;
  out.color=paper?0xe2dbbf:fabric?0xd7cbb8:0xb99a71;
  out.y=Math.max(1,y+Math.sin(Math.PI*t)*9-4*t*t);out.roll=theta+age*6;out.opacity=1-t*t;
 }
 return true;
}
