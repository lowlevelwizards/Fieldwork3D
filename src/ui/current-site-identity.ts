/** Identifies the current generated site without exposing unexplored room plans.
 * The seed is a reproduction key for Quick Play bug reports, never a tactical
 * indication of enemy count or hidden interiors. */
export type CurrentSiteIdentity={
  text:string;seed:string|null;
};
export function currentSiteIdentity(
  site:{seed:number;scale?:string;training?:boolean}|null|undefined,
  quickPlay:boolean
):CurrentSiteIdentity{
  if(!site)return {text:'CURRENT SITE · TACTICAL TRAINING',seed:null};
  if(site.training)return {text:'CURRENT SITE · TRAINING RANGE',seed:null};
  if(!quickPlay)return {text:'CURRENT SITE · OPERATION',seed:null};
  const scale=(site.scale??'standard').toUpperCase();
  return {text:'CURRENT SITE · '+scale+' · SEED '+site.seed,
    seed:String(site.seed)};
}
