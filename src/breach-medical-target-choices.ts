/** Read-only, privacy-bounded treatment choices for the tactical TREAT menu.
 * Stable means no current bleeding, NOT fully recovered. Only the existing
 * simulation can authorize and complete treatment.
 */
import type {Pt} from './breach-core.ts';
import {team,liveVisibility,type Session,type TeamActor} from './breach-game.ts';
import {mostUrgentWound,bleedingRate} from './breach-medical-wounds.ts';
import {treatmentSupplyForWound} from './breach-medical-treatment.ts';
import {captureVitalStatus} from './breach-capture-vitals.ts';
import {designatedDownedCaptureTarget}
 from './breach-capture-transport-policy.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';

export type MedicalTargetStatus='BLEEDING'|'STABLE'|'UNINJURED';
export type MedicalPatientChoice={
 id:string;name:string;status:MedicalTargetStatus;
 canTreat:boolean;isSelf:boolean;note:string;bleedingGrade:number;
};
export function medicalPatientStatus(patient:Pick<TeamActor,'medical'>):MedicalTargetStatus{
 if(bleedingRate(patient.medical)>0)return 'BLEEDING';
 return patient.medical.wounds.length?'STABLE':'UNINJURED';
}
export function medicalTreatmentChoices(s:Session,actor:TeamActor,at:Pt):
 MedicalPatientChoice[]{
 if(actor.side!=='blue'||actor.health<=0)return [];
 const world=sessionWorldGeometry(s);
 const choices:MedicalPatientChoice[]=[];
 const candidates:TeamActor[]=[...team(s)];
 const capture=s.operators.find(o=>designatedDownedCaptureTarget(s,o)&&
   captureVitalStatus(o)!=='deceased'&&o.medical.wounds.length>0&&
   liveVisibility(s,o.p));
 if(capture&&!candidates.includes(capture))candidates.push(capture);
 for(const patient of candidates){
  if(patient.health<=0&&patient!==capture)continue;
  const self=patient.id===actor.id;
  const distance=Math.hypot(patient.p.x-at.x,patient.p.y-at.y);
  if(!self&&(distance>65||!liveVisibility(s,patient.p)||
    !sweptBodyClear(at,patient.p,s.doors,5.5,world)))continue;
  const status=medicalPatientStatus(patient);
  if(!self&&status==='UNINJURED')continue;
  const urgent=mostUrgentWound(patient.medical);
  const supply=urgent&&treatmentSupplyForWound(urgent,actor.medicalSupplies);
  const canTreat=!!supply;
  const note=status==='STABLE'?'No active bleeding; injury may remain':
    status==='UNINJURED'?'No recorded wound':
    !canTreat?'Active bleeding; appropriate medical supplies unavailable':
    'Active bleeding; game bleed grade '+String(urgent!.bleeding)+
    ' · '+supply;
  choices.push({id:patient.id,name:patient.name,status,canTreat,isSelf:self,
    note,bleedingGrade:urgent?.bleeding??0});
 }
 if(!choices.some(c=>c.status!=='UNINJURED'))return [];
 const pointOf=(id:string)=>s.operators.find(p=>p.id===id)?.p??at;
 return choices.sort((a,b)=>Number(b.isSelf)-Number(a.isSelf)||
   Math.hypot(pointOf(a.id).x-at.x,pointOf(a.id).y-at.y)-
   Math.hypot(pointOf(b.id).x-at.x,pointOf(b.id).y-at.y)).slice(0,6);
}
