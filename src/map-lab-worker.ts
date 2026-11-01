/** Dedicated generation worker: large architectural programs cannot freeze the lab UI. */
import {generateSite} from './breach-site.ts';
import {BUILDING_ARCHETYPES} from './breach-archetypes.ts';
import {auditSite} from './breach-site-audit.ts';
import {resolveLabScale,type GeneratorRequest,type GeneratorResponse} from './map-lab-generation.ts';
const scope=self as unknown as {
  onmessage:((event:MessageEvent<GeneratorRequest>)=>void)|null;
  postMessage:(data:GeneratorResponse)=>void;
};
scope.onmessage=({data:req})=>{
  const startedAt=performance.now();
  const post=(message:Omit<GeneratorResponse,'id'>)=>scope.postMessage(
    {...message,id:req.id} as GeneratorResponse);
  const progress=(percent:number,stage:string,detail:string)=>{
    post({kind:'progress',percent,stage,detail} as Omit<GeneratorResponse,'id'>);
  };
  const total=BUILDING_ARCHETYPES.length;
  // Every archetype is determined by seed modulo 11. Skip other archetypes
  // rather than building up to ten throwaway maps before the requested one.
  const offset=(BUILDING_ARCHETYPES.indexOf(req.archetype)-
    (req.seed>>>0)%total+total)%total;
  let lastError='';
  progress(3,'Finding building configuration',req.archetype.toUpperCase());
  for(let step=offset;step<600;step+=total){
    const seed=(req.seed+step)>>>0;
    const scale=resolveLabScale(req.scale,seed);
    const iteration=Math.floor(step/total)+1;
    try{
      progress(9,'Generating architectural plan',
        req.archetype+' / '+scale+' · seed '+seed);
      const generationStart=performance.now();
      const site=generateSite(seed,scale,(phase,attempt)=>{
        const p=12+Math.min(6,attempt)*7+
          (phase==='layout'?0:phase==='furnishing'?3:5);
        progress(p,phase==='layout'?'Planning rooms and circulation':
          phase==='furnishing'?'Placing fixtures and materials':
          'Checking navigability and completeness',
          'Layout candidate '+(attempt+1)+' / 6 · '+scale);
      });
      const generationMs=Math.round(performance.now()-generationStart);
      progress(69,'Validating generated site',
        site.rooms.length+' rooms · '+site.doors.length+' doors');
      const auditStart=performance.now();
      const audit=auditSite(site);
      const auditMs=Math.round(performance.now()-auditStart);
      progress(82,'Preparing site for 3D preview','Transferring architecture and diagnostics');
      post({kind:'done',site,audit,
        timing:{generationMs,auditMs,
         workerMs:Math.round(performance.now()-startedAt)}
      } as Omit<GeneratorResponse,'id'>);
      return;
    }catch(error){
      lastError=error instanceof Error?error.message:String(error);
      progress(10,'Trying another site variant',
        'Seed '+seed+' failed · attempt '+iteration);
    }
  }
  post({kind:'error',message:'No '+req.archetype+' configuration succeeded. '+
    (lastError||'Try another seed or a smaller size.')} as Omit<GeneratorResponse,'id'>);
};
