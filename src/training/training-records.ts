/** Bounded per-device trial records; deliberately separate from Campaign. */
import type {TrialAssessment} from './training-scoring.ts';
import type {TrialDefinition} from './training-trials.ts';
export const TRAINING_RECORD_LIMIT=64;
const KEY='fieldwork-training-records-v1';
export type TrialRecord=Readonly<{
 key:string;course:string;version:number;at:number;score:number;
 grade:string;elapsed:number;squadSize:number;shots:number;
}>;
export interface TrialRecordStorage{
 getItem(key:string):string|null;setItem(key:string,value:string):void;
}
export function trainingRecordKey(def:TrialDefinition):string{
 return [def.id,def.version,def.squadSize,def.layout,def.targetDensity,
  def.lighting,def.goal].join(':');
}
export function parseTrainingRecords(raw:string|null):TrialRecord[]{
 if(!raw)return [];
 try{
  const data:unknown=JSON.parse(raw);
  if(!Array.isArray(data))return [];
  return data.filter((r):r is TrialRecord=>!!r&&typeof r==='object'&&
   typeof r.key==='string'&&typeof r.course==='string'&&
   Number.isFinite(r.score)&&Number.isFinite(r.elapsed)&&
   Number.isFinite(r.at)&&typeof r.grade==='string')
   .slice(0,TRAINING_RECORD_LIMIT);
 }catch{return [];}
}
export function betterTrialRecord(a:TrialRecord,b:TrialRecord):boolean{
 return a.score>b.score||a.score===b.score&&a.elapsed<b.elapsed;
}
export function saveTrainingRecord(def:TrialDefinition,
 result:TrialAssessment,storage:TrialRecordStorage,
 now=Date.now()):{saved:boolean;best:TrialRecord|null}{
 const key=trainingRecordKey(def);
 const rows=parseTrainingRecords(storage.getItem(KEY));
 const current=rows.find(r=>r.key===key)??null;
 if(result.outcome!=='passed')return {saved:false,best:current};
 const next:TrialRecord={key,course:def.id,version:def.version,at:now,
  score:result.score,grade:result.grade,elapsed:result.elapsed,
  squadSize:result.squadSize,shots:result.shots};
 if(current&&!betterTrialRecord(next,current))
  return {saved:false,best:current};
 const updated=[next,...rows.filter(r=>r.key!==key)]
  .slice(0,TRAINING_RECORD_LIMIT);
 try{storage.setItem(KEY,JSON.stringify(updated));}
 catch{return {saved:false,best:current};}
 return {saved:true,best:next};
}
export function loadTrainingRecords(storage:TrialRecordStorage):TrialRecord[]{
 return parseTrainingRecords(storage.getItem(KEY));
}
