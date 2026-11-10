/** Roadmap 2 / Stage 5: strict, host-independent performance evidence contract.
 * Timing values are logged, NEVER thresholded against variable CI machines.
 * Deterministic workload coverage, recorder completeness and measurement
 * integrity are the blocking parts of this gate.
 */
import assert from 'node:assert/strict';

export function taggedRows(output, label) {
 assert.equal(typeof output,'string',label+' output must be text');
 return output.split(/\r?\n/).filter(line=>line.startsWith(label+' '))
  .map(line=>{
   let parsed;
   try{parsed=JSON.parse(line.slice(label.length+1));}
   catch(error){throw Error('Malformed '+label+' JSON: '+error.message);}
   assert.ok(parsed&&typeof parsed==='object'&&!Array.isArray(parsed),
    label+' row must be an object');
   return parsed;
  });
}
function exactlyOne(text,label){
 const rows=taggedRows(text,label);
 assert.equal(rows.length,1,'Expected exactly one '+label+' row');
 return rows[0];
}
function finiteNonnegative(value,name){
 assert.ok(typeof value==='number'&&Number.isFinite(value)&&value>=0,
  name+' must be a finite, non-negative number');
}
function timing(value,name){
 assert.ok(value&&typeof value==='object',name+' timing missing');
 for(const key of ['avg','p50','p95','max'])
  finiteNonnegative(value[key],name+'.'+key);
 assert.ok(value.p50<=value.p95&&value.p95<=value.max,
  name+' timing quantiles out of order');
 assert.ok(value.avg<=value.max+.001,name+' mean exceeds max');
}
const keyOf=s=>[s.seed,s.scale,s.record?'record':'live',
 s.civilianPreview?'civilian':'base'].join('/');
const expectedWorkloads=[
 ...[3,17,61].flatMap(seed=>[false,true].map(record=>({
  seed,scale:'standard',record,civilianPreview:false,ticks:90
 }))),
 ...[false,true].map(record=>({
  seed:17,scale:'expanded',record,civilianPreview:false,ticks:60
 })),
 {seed:17,scale:'standard',record:true,civilianPreview:true,ticks:90},
 {seed:17,scale:'expanded',record:true,civilianPreview:true,ticks:60}
];

export function validateStage5Evidence({simulationOutput,retentionOutput,retentionSeconds=90}){
 assert.ok(Number.isInteger(retentionSeconds)&&retentionSeconds>=30&&
  retentionSeconds<=180&&retentionSeconds%30===0,
  'Retention gate uses a positive whole number of 30-second windows');
 const host=exactlyOne(simulationOutput,'ENVIRONMENT');
 assert.equal(typeof host.node,'string');
 assert.equal(typeof host.platform,'string');
 assert.equal(typeof host.arch,'string');
 const geometry=taggedRows(simulationOutput,'GEOMETRY');
 const geometryKeys=new Set();
 assert.equal(geometry.length,4,'All 3 standard geometry seeds and expanded seed required');
 for(const g of geometry){
  const key=g.seed+'/'+g.scale;
  assert.ok(['3/standard','17/standard','61/standard','17/expanded']
   .includes(key),'Unexpected geometry workload '+key);
  assert.ok(!geometryKeys.has(key),'Duplicate geometry workload '+key);
  geometryKeys.add(key);
  for(const metric of ['visibility180','intelScan','polygon'])
   timing(g[metric],key+'.'+metric);
  for(const count of ['actors','walls','cover','rooms'])
   finiteNonnegative(g[count],key+'.'+count);
  assert.ok(g.actors>0,'Geometry probe must contain operators');
 }
 const simulation=taggedRows(simulationOutput,'SIMULATION');
 assert.equal(simulation.length,expectedWorkloads.length,
  'Full live/record/civilian matrix is mandatory');
 const expected=new Map(expectedWorkloads.map(s=>[keyOf(s),s]));
 for(const s of simulation){
  const key=keyOf(s),requirement=expected.get(key);
  assert.ok(requirement,'Duplicate or unexpected simulation workload '+key);
  assert.equal(s.ticks,requirement.ticks,key+' tick count drift');
  for(const count of ['actors','walls','cover','rooms','shots','groundCells'])
   finiteNonnegative(s[count],key+'.'+count);
  assert.ok(s.actors>0,key+' must have operators');
  if(s.civilianPreview)assert.ok(s.civilianActors>0,
   key+' must exercise active civilian actors');
  timing(s.sim,key+'.simulation');
  if(s.record)timing(s.recording,key+'.recording');
  else assert.equal(s.recording,undefined,key+' must not record');
  assert.ok(s.peak&&typeof s.peak==='object',key+' peak evidence missing');
  finiteNonnegative(s.peak.ms,key+'.peak.ms');
  assert.ok(Array.isArray(s.slowTicks),key+' slow tick evidence missing');
  expected.delete(key);
 }
 assert.equal(expected.size,0,'Missing workload(s): '+[...expected.keys()].join(', '));
 const combat=exactlyOne(simulationOutput,'COMBAT');
 assert.equal(combat.ticks,180,'Combat stress duration changed');
 finiteNonnegative(combat.shots,'combat.shots');
 assert.ok(combat.shots>0,'Combat stress must actually fire');
 timing(combat.sim,'combat.sim');
 assert.ok(Array.isArray(combat.hot),'Combat phase attribution missing');
 const retentionEnv=exactlyOne(retentionOutput,'ENVIRONMENT');
 assert.equal(retentionEnv.seconds,retentionSeconds);
 assert.equal(typeof retentionEnv.forcedGC,'boolean');
 finiteNonnegative(retentionEnv.actors,'retention.actors');
 assert.ok(retentionEnv.actors>0,'Recorder probe must contain operators');
 const retention=taggedRows(retentionOutput,'ROUND_LIFETIME');
 assert.equal(retention.length,retentionSeconds/30,
  'Retention must report every 30-second checkpoint');
 let previousFrames=0,previousSteps=0;
 for(let i=0;i<retention.length;i++){
  const r=retention[i],seconds=(i+1)*30;
  assert.equal(r.seconds,seconds,'Missing/unsorted retention checkpoint');
  finiteNonnegative(r.frames,'retention.frames');
  finiteNonnegative(r.steps,'retention.steps');
  finiteNonnegative(r.heapMB,'retention.heapMB');
  finiteNonnegative(r.sharedActorFields,'retention.sharedActorFields');
  for(const metric of ['captureP50ms','captureP95ms','captureMaxMs'])
   finiteNonnegative(r[metric],'retention.'+metric);
  assert.ok(r.captureP50ms<=r.captureP95ms&&
   r.captureP95ms<=r.captureMaxMs,'Recorder timing quantiles out of order');
  assert.equal(r.complete,true,'Recorder must remain complete');
  // The recorder is sampled near 20 Hz, not 60 Hz. This protects against
  // unintentional full snapshots each tick or silently dropped history.
  assert.ok(r.frames>=seconds*14&&r.frames<=seconds*26+5,
   'Recorder sample density changed at '+seconds+' seconds: '+r.frames);
  assert.ok(r.frames>=previousFrames&&r.steps>=previousSteps,
   'Recording history must be monotonic');
  previousFrames=r.frames;previousSteps=r.steps;
 }
 const film=exactlyOne(retentionOutput,'FILM_COMPLETE');
 assert.equal(film.truncated,false,'Retention history was truncated');
 assert.equal(film.frames,previousFrames,'Final film frame count mismatch');
 finiteNonnegative(film.seconds,'film.seconds');
 assert.ok(Math.abs(film.seconds-retentionSeconds)<.1,
  'Final film duration mismatch');
 return {
  schemaVersion:1,measurement:'Node host CPU and heap, not device FPS/GPU',
  engine:'authoritative 60 Hz (unchanged)',host,
  workloadMatrix:simulation,geometry,combat,
  retentionHost:retentionEnv,retention,film
 };
}
