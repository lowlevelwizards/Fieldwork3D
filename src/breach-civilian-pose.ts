/** Render-only neutral silhouette intent. Simulation owns all states;
 * both floor plan and 3D use the SAME choice, including replay. */
import type {CivilianActor} from './breach-civilian-types.ts';
export type CivilianPose=
 'idle'|'work'|'seated'|'walk'|'run'|'startled'|'hide'|
 'compliant'|'injured'|'injured-walk'|'carried'|'dragged'|'down';
export function civilianPose(c:Pick<CivilianActor,
 'health'|'injuryStage'|'state'|'velocity'|'activity'> &
 Partial<Pick<CivilianActor,'carriedById'|'transportMode'>>):CivilianPose{
 if(c.carriedById)return c.transportMode==='carry'?'carried':'dragged';
 if(c.health<=0||c.injuryStage>=3||c.state==='incapacitated')return 'down';
 if(c.health<2||c.injuryStage>0||c.state==='wounded')
   return c.velocity>5?'injured-walk':'injured';
 if(c.state==='compliant')return 'compliant';
 // A person trying to flee but blocked by furniture or a doorway is
 // still alarmed, not suddenly standing calmly. Likewise an actor still
 // moving toward a refuge may walk there before adopting their hiding
 // posture; never slide across the floor in a compressed static pose.
 if(c.state==='hiding')return c.velocity>5?'walk':'hide';
 if(c.state==='startled'||c.state==='frozen')return 'startled';
 if(c.state==='fleeing')return c.velocity>5?'run':'startled';
 if(c.velocity>5)return 'walk';
 if(c.state==='routine'&&c.activity==='seated')return 'seated';
 if(c.state==='routine'&&
   (c.activity==='working'||c.activity==='inspecting'))return 'work';
 return 'idle';
}
