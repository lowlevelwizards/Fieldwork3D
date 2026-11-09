/** A fixed-tick body proposal boundary: capture pre-movement origins
 * before operator/civilian motors run, then build authority proposals.
 * This never evaluates collisions or changes authored intent. One pass
 * preserves operator-before-civilian ordering and avoids temporary
 * combined arrays / per-side map arrays on the 60 Hz simulation path.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import type {MotionProposal} from './breach-movement-authority.ts';

type BodyOrigin={id:string;p:Pt};
export function captureMotionFrameOrigins(
 operators:readonly BodyOrigin[],civilians:readonly BodyOrigin[]
):Map<string,Pt>{
 const origins=new Map<string,Pt>();
 for(const body of operators)
   origins.set(body.id,{x:body.p.x,y:body.p.y});
 for(const body of civilians)
   origins.set(body.id,{x:body.p.x,y:body.p.y});
 return origins;
}
export function buildMotionFrameProposals(
 operators:readonly TeamActor[],civilians:readonly CivilianActor[],
 origins:ReadonlyMap<string,Pt>
):MotionProposal[]{
 const proposals:MotionProposal[]=[];
 for(const a of operators)proposals.push({
   id:a.id,side:a.side,from:origins.get(a.id)??a.p,
   to:a.p,alive:a.health>0,carried:!!a.carriedById
 });
 for(const c of civilians)proposals.push({
   id:c.id,side:'neutral',from:origins.get(c.id)??c.p,
   to:c.p,alive:c.health>0||!!c.carriedById,carried:!!c.carriedById
 });
 return proposals;
}
