/** Small, deterministic authoritative-simulation scenario runner.
 * Test-only: never changes the gameplay clock or the renderer. Each sample
 * is captured before the next site activation, since breach-core retains
 * module-scoped active geometry for compatibility.
 */
import {withTemporarySiteGeometry} from '../../src/breach-core.ts';
import {newSession,planMove,stepSession,team} from '../../src/breach-game.ts';

const round=value=>Number(value.toFixed(5));
export function runBreachScenario(seed,{ticks=90,dt=1/60}={}){
 return withTemporarySiteGeometry(null,()=>{
 const session=newSession(0,seed,'full-view','small');
 const actors=team(session);
  const objective=session.site?.objective;
  const accepted=objective?actors.map(a=>Boolean(planMove(session,a.id,objective))):[];
  session.phase='running';
  const samples=[];
  for(let i=0;i<ticks;i++){
   stepSession(session,dt);
   if(i%15===0||i===ticks-1){
    const squad=team(session).map(a=>({
     id:a.id,position:[round(a.p.x),round(a.p.y)],
     health:round(a.health),blocked:round(a.blockedTime??0),
     posture:a.posture,order:a.plan[0]?.kind??null
    }));
    for(const a of squad){
     if(!Number.isFinite(a.position[0])||!Number.isFinite(a.position[1]))
      throw Error('Non-finite position seed '+seed+' tick '+i+' actor '+a.id);
    }
    samples.push({tick:i,seconds:round(session.seconds),
     squad,doors:session.doors.map(d=>[d.id,round(d.openFraction??0),d.open])
    });
   }
  }
  return {seed,accepted,samples};
 });
}
