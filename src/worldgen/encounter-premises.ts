/** Believable encounter premises from physical property identity and mission.
 * Avoid rigid archetype-to-scenario mappings; tune by weighted eligibility. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPremise} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const options:readonly EncounterPremise[]=[
 'routine','after-hours','hideout','guarded','disturbance',
 'defensive','vacant','incident'
];
export function chooseEncounterPremise(site:Site,context:EncounterContext={}):EncounterPremise{
 if(context.premise)return context.premise;
 const mission=context.mission??'clear',risk=context.risk??1;
 const quiet=site.identity?.activity==='quiet';
 const busy=site.identity?.activity==='busy';
 const condition=site.identity?.condition??site.condition??'occupied';
 const industrial=['garage','warehouse','utility'].includes(site.archetype??'house');
 const residential=['house','townhouse','apartment','motel'].includes(site.archetype??'house');
 const w:Record<EncounterPremise,number>={
  routine:5,'after-hours':2,hideout:1.2,guarded:1.3,
  disturbance:1.5,defensive:.6,vacant:.6,incident:.8
 };
 if(quiet){w['after-hours']+=2;w.vacant+=1.2;w.routine-=1;}
 if(busy){w.routine+=4;w.disturbance+=2;w.vacant=.04;}
 if(condition==='vacant'){w.vacant+=9;w.routine=.4;w['after-hours']+=2;}
 if(condition==='disturbed'){w.disturbance+=5;w.incident+=2;}
 if(condition==='renovation'){w['after-hours']+=2;w.vacant+=1;}
 if(industrial){w.guarded+=1.5;w['after-hours']+=1;}
 if(residential){w.hideout+=1.5;w.guarded*=.8;}
 if(mission==='capture'){w.hideout+=4;w.guarded+=2;w.incident+=2;}
 if(mission==='rescue'){w.incident+=5;w.disturbance+=2;}
 if(mission==='hold'){w.defensive+=5;w.guarded+=2;}
 if(mission==='intel'){w.hideout+=2;w['after-hours']+=1;}
 if(risk===2){w.guarded+=1.5;w.hideout+=1;}
 if(risk===3){w.defensive+=5;w.guarded+=4;w.hideout+=2;w.routine*=.65;}
 const total=options.reduce((sum,key)=>sum+Math.max(.01,w[key]),0);
 let roll=encounterRng(context.seed??site.seed,1)()*total;
 for(const key of options){roll-=Math.max(.01,w[key]);if(roll<=0)return key;}
 return options[options.length-1];
}
