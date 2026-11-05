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
 if(c.state==='hiding')return 'hide';
 if(c.state==='startled'||c.state==='frozen')return 'startled';
 if(c.state==='fleeing'&&c.velocity>5)return 'run';
 if(c.velocity>5)return 'walk';
 if(c.state==='routine'&&c.activity==='seated')return 'seated';
 if(c.state==='routine'&&
   (c.activity==='working'||c.activity==='inspecting'))return 'work';
 return 'idle';
}
