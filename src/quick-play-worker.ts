/** Build a Quick Play site off the UI thread, as Map Lab already does. */
import {generateSite} from './breach-site.ts';
import type {QuickPlayGenerationRequest,QuickPlayGenerationResponse}
 from './quick-play-generation.ts';

const scope=self as unknown as {
  onmessage:((event:MessageEvent<QuickPlayGenerationRequest>)=>void)|null;
  postMessage:(data:QuickPlayGenerationResponse)=>void;
};
scope.onmessage=({data:req})=>{
  const started=performance.now();
  const progress=(percent:number,stage:string,detail:string)=>
    scope.postMessage({id:req.id,kind:'progress',percent,stage,detail});
  try{
    progress(6,'Selecting building profile','Seed '+req.seed+' · '+req.scale);
    const site=generateSite(req.seed>>>0,req.scale,(phase,attempt)=>{
      const percent=12+Math.min(5,attempt)*10+
        (phase==='layout'?0:phase==='furnishing'?4:8);
      progress(percent,phase==='layout'?'Planning rooms and circulation':
        phase==='furnishing'?'Placing furniture and surfaces':
        'Checking routes and site quality',
        'Layout candidate '+(attempt+1)+' / 6');
    },{enableIncidentIntent:true});
    progress(70,'Finalizing site and encounter',
      site.rooms.length+' rooms · '+site.doors.length+
      ' doors · '+site.enemies.length+' contacts');
    scope.postMessage({id:req.id,kind:'done',site,
      generationMs:Math.round(performance.now()-started)});
  }catch(error){
    scope.postMessage({id:req.id,kind:'error',
      message:error instanceof Error?error.message:String(error)});
  }
};
