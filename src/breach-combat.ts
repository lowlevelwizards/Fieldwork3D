/** Builds 099–102: data-driven weapon, injury and exposure authority. */
import {COVER,WALLS,segmentsCross,doorBlocksSightRay,type Pt,type Door,type Obstacle} from './breach-core.ts';
import {segmentHitsBox} from './breach-ray.ts';
import {coverImpactFraction,eyeHeight,aimHeight} from './breach-cover-height.ts';
export type Injury='healthy'|'injured'|'heavy'|'incapacitated';
export type WeaponId='carbine'|'smg'|'rifle'|'shotgun';
export type Weapon={id:WeaponId;label:string;capacity:number;reserve:number;
  reload:number;interval:number;acquisition:number;accuracy:number;
  optimalRange:number;damage:number;penetration:number;noise:number;};
export const WEAPONS:Record<WeaponId,Weapon>={
  carbine:{id:'carbine',label:'CARBINE',capacity:12,reserve:36,reload:1.8,
    interval:.33,acquisition:.30,accuracy:.78,optimalRange:165,damage:1,penetration:.25,noise:400},
  smg:{id:'smg',label:'SMG',capacity:18,reserve:54,reload:1.55,
    interval:.24,acquisition:.24,accuracy:.73,optimalRange:95,damage:1,penetration:.08,noise:320},
  rifle:{id:'rifle',label:'RIFLE',capacity:10,reserve:30,reload:2.10,
    interval:.47,acquisition:.48,accuracy:.87,optimalRange:260,damage:1,penetration:.60,noise:465},
  shotgun:{id:'shotgun',label:'SHOTGUN',capacity:6,reserve:24,reload:2.45,
    interval:.70,acquisition:.46,accuracy:.84,optimalRange:60,damage:2,penetration:.16,noise:475},
};
export const injuryOf=(stage:number):Injury=>stage>=3?'incapacitated':
  stage===2?'heavy':stage===1?'injured':'healthy';
export const injurySpeed=(stage:number)=>[1,.90,.60,0][Math.min(3,Math.max(0,stage))];
export const injuryAim=(stage:number)=>[1,.90,.70,0][Math.min(3,Math.max(0,stage))];
export const injuryReload=(stage:number)=>[1,1.10,1.50,Infinity][Math.min(3,Math.max(0,stage))];
export function woundSeverity(weapon:Weapon,range:number,protectedByCover:boolean,roll:number){
  // Even heavy weapons are not guaranteed to incapacitate in one hit.
  const severe=weapon.damage===2&&range<weapon.optimalRange*.85&&!protectedByCover;
  return severe&&roll<.55?2:1;
}
const segmentBox=(a:Pt,b:Pt,box:Obstacle)=>segmentHitsBox(a,b,box);
export type Exposure={blocked:boolean;soft:boolean;hard:boolean;penalty:number;
  material:'stone'|'wood'|'metal'|'dust'};
export function exposure(from:Pt,to:Pt,doors:Door[],
  targetCrouched=false,shooterCrouched=false):Exposure{
  const ray={a:from,b:to};
  if(WALLS.some(w=>segmentsCross(ray,w))||doorBlocksSightRay(doors,ray))
    return {blocked:true,soft:false,hard:true,penalty:1,material:'stone'};
  let hard=false,soft=false,material:Exposure['material']='dust';
  for(const cover of COVER){
    if(!segmentBox(from,to,cover))continue;
    if(coverImpactFraction(from,to,eyeHeight(shooterCrouched),
      aimHeight(targetCrouched),cover)!==null){
      hard=true;material=cover.low?'wood':'metal';
    }else soft=true;
  }
  return {blocked:hard,soft,hard,penalty:hard?1:soft?.15:0,material};
}
export function nearCover(p:Pt,threat:Pt){
  // Direction matters: a cover object protects only if it lies between the
  // defending soldier and the suspected shooter.
  return COVER.some(c=>{
    const near=Math.hypot(p.x-c.x,p.y-c.y)<Math.max(c.w,c.h)*.95+22;
    return near&&segmentBox(threat,p,c);
  });
}
export type BattleEvent={id:number;t:number;kind:'shot'|'wound'|'down'|'flash'|
  'door'|'objective'|'surrender'|'reload'|'intel'|'impact'|
  'interaction';actor?:string;p?:Pt;text:string};
