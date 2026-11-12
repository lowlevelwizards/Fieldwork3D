/** Distinguish a stranded pre-run GitHub Actions record from real release work.
 * Fail closed unless a later successful publish of the SAME SHA superseded
 * a >1-hour-old queued run that never changed state or started a job.
 */
export function isSupersededQueuedRun(run,runs,nowMs=Date.now()){
 if(run.status!=='queued'||!run.head_sha||run.updated_at!==run.created_at)return false;
 const created=Date.parse(run.created_at??'');
 if(!Number.isFinite(created)||nowMs-created<60*60*1000)return false;
 return runs.some(other=>
  other.id>run.id&&other.head_sha===run.head_sha&&
  other.status==='completed'&&other.conclusion==='success'&&
  Number.isFinite(Date.parse(other.created_at??''))&&
  Date.parse(other.created_at)>created);
}
export async function classifyPendingPagesRuns(runs,jobCount,nowMs=Date.now()){
 const blocking=[],superseded=[];
 for(const run of runs.filter(r=>r.status!=='completed')){
  if(isSupersededQueuedRun(run,runs,nowMs) && (await jobCount(run))===0)
   superseded.push(run);
  else blocking.push(run);
 }
 return {blocking,superseded};
}
