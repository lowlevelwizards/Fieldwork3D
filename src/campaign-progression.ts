/** Post-operation career progression. No XP calculations in the 60Hz simulation. */
import type {CampaignOperator,SkillName} from './campaign-state.ts';
import {SKILL_NAMES} from './campaign-state.ts';
import type {ShootingSkills} from './breach-skills.ts';
export type OperatorPerformance={
 id:string;shots:number;hits:number;pointShots:number;aimedShots:number;
 longHits:number;injuryStage:number;survived:boolean;
 magazine:number;reserve:number;
};
export type SkillGains={id:string;gains:Partial<Record<SkillName,number>>};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function progressOperator(o:CampaignOperator,p:OperatorPerformance,
 succeeded:boolean):{operator:CampaignOperator;gains:SkillGains}{
 const gains:Partial<Record<SkillName,number>>={};
 const xp={...o.experience},skills={...o.skills};
 const practice:Record<SkillName,number>={
  pointShooting:Math.min(5,p.pointShots*.25+p.hits*.18),
  precision:Math.min(5,p.aimedShots*.25+p.hits*.2),
  longRange:Math.min(5,p.longHits*1.5),
  recoilControl:Math.min(5,p.shots*.17),
  composure:p.survived?1+(p.injuryStage>0?1:0)+(succeeded?.5:0):.3,
  handling:Math.min(5,p.shots*.14+(p.survived?1:0))
 };
 for(const key of SKILL_NAMES){
  const amount=practice[key];
  if(amount<=0)continue;
  xp[key]=clamp(xp[key]+amount,0,100000);
  const delta=amount*.0025*o.aptitudes[key]*clamp((.95-skills[key])/.55,.08,1);
  const actual=clamp(skills[key]+delta,.2,.95)-skills[key];
  skills[key]=clamp(skills[key]+delta,.2,.95);
  if(actual>0)gains[key]=actual;
 }
 return {operator:{...o,skills:skills as ShootingSkills,experience:xp as ShootingSkills,
  weapon:o.weapon,magazine:clamp(p.magazine,0,200),reserve:clamp(p.reserve,0,300),
  shotsFired:o.shotsFired+p.shots,
  injuries:Math.max(o.injuries,p.injuryStage),
  recoveryDays:Math.max(o.recoveryDays>0?o.recoveryDays-1:0,
   p.injuryStage>0?p.injuryStage*2:0)},
  gains:{id:o.id,gains}};
}
