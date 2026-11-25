/** V13: cosmetic ground evidence. Existing medical state is the only
 * source of continuing bleeding; these amounts are art units, not vitals. */
import type {ImpactMark,Session} from './breach-game.ts';
import {bleedingRate} from './breach-medical-wounds.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
export const BLOOD_SAMPLE_SECONDS=.5;
export const BLOOD_AMOUNT_MAX=16;
export function bloodMarkRadius(mark:Pick<ImpactMark,'bloodKind'|'bloodAmount'>):number{
 const amount=Math.max(0,Math.min(BLOOD_AMOUNT_MAX,mark.bloodAmount??1));
 return mark.bloodKind==='pool'?Math.min(18,6+3*Math.sqrt(amount)):Math.min(15,8+2*Math.sqrt(amount));
}
export function bloodMarkTint(mark:Pick<ImpactMark,'bloodKind'>):number{
 return mark.bloodKind==='pool'?0x92312f:0xab403b;
}
/** No independent timer or RNG. Sample only on a crossed fixed-tick
 * half-second boundary. Stable negative IDs cannot collide with positive
 * projectile, flash or inventory effect IDs. Existing blood is never moved. */
export function sampleBleedingEvidence(s:Session,h:number):void{
 const slot=Math.floor((s.seconds+1e-8)/BLOOD_SAMPLE_SECONDS);
 if(h<=0||slot<=Math.floor((s.seconds-h+1e-8)/BLOOD_SAMPLE_SECONDS))return;
 let walls:ReturnType<typeof sessionWorldGeometry>['walls']|undefined;
 for(let i=0;i<s.operators.length;i++){
  const a=s.operators[i];
  if(a.deathAt!=null||a.health<=0&&a.downedAt==null||!a.medical.wounds.length)continue;
  const rate=bleedingRate(a.medical);if(rate<=0)continue;
  walls??=sessionWorldGeometry(s).walls;
  if(confinedGroundRadius(a.p,6,walls)<.5)continue;
  const amount=Math.min(2,rate/.004*.5);
  retainImpactMark(s,{id:-(1+slot*65536+i),p:{...a.p},surface:'blood',age:0,
   height:.85,bloodKind:'pool',bloodAmount:amount,bloodOwnerId:a.id},walls);
 }
}
/** Keep blood evidence mission-local and stop touching its age when settled.
 * Owned material damage persists under the same bounded evidence budget.
 * Legacy unowned marks retain the original 24-second lifetime. */
export function ageImpactEvidence(marks:ImpactMark[],h:number):void{
 let write=0;
 for(let read=0;read<marks.length;read++){
  const m=marks[read];
  if(m.surface==='blood'||m.surfaceRef){if(m.age<3)m.age=Math.min(3,m.age+h);marks[write++]=m;}
  else if((m.age+=h)<24)marks[write++]=m;
 }
 marks.length=write;
}
