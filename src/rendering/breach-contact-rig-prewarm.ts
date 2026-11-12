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
