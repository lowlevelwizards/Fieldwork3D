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

/** E6.1: a render-frame budget for cold hidden-hostile presentation.
 * Distributing first-use wardrobe/mesh/lighting work prevents a whole
 * unseen roster from being built in a single planning-frame callback.
 * Already-visible actors ALWAYS bypass this: their first pose is immediate.
 * This is presentation scheduling only, never enemy discovery or simulation.
 */
export const MAX_COLD_CONTACT_RIGS_PER_FRAME=1;
export function withinContactPrewarmBudget(eligible:boolean,
  alreadyBuilt:number,limit=MAX_COLD_CONTACT_RIGS_PER_FRAME):boolean{
 return eligible&&Number.isInteger(alreadyBuilt)&&alreadyBuilt>=0&&
  alreadyBuilt<limit;
}

/** Shader/material staging uses Three.js traverseVisible. Briefly expose the
 * isolated root only inside a synchronous, non-rendering callback, then
 * restore its hidden state even if a material throws. No browser paint,
 * fog observation or gameplay query runs within this scope.
 */
export function withPreparedVisibleRoot<T>(root:{visible:boolean},
 prepare:()=>T):T{
 const wasVisible=root.visible;
 root.visible=true;
 try{return prepare();}
 finally{root.visible=wasVisible;}
}
