/** Prepare enemy presentation while the mission is still in briefing.
 * This shifts cold wardrobe / model work away from the first live contact.
 * Does not affect player knowledge, sight, actor state or target selection.
 */
export type ContactRigPrewarmInput=Readonly<{
 phase:string;started:boolean;side:string;visible:boolean;
 hasRig:boolean;historical:boolean
}>;
export function shouldPrewarmContactRig(x:ContactRigPrewarmInput):boolean{
 return x.phase==='planning'&&!x.started&&
  x.side==='red'&&!x.visible&&!x.hasRig&&!x.historical;
}
