/** V10: one explicit experimental suite. Production defaults unchanged.
 * Shadowless lights remain separately opt-in until wall bleed is solved.
 */
export function resolveVfxPreview(params:URLSearchParams){
 const suite=params.get('vfxSuite')==='1';
 const on=(key:string)=>params.has(key)?params.get(key)==='1':suite;
 const impacts=on('vfxImpacts');
 return {suite,grass:on('vfxGrass'),grassCell:params.get('vfxGrassCell')==='96'||!suite&&params.get('vfxGrassCell')!=='192'?96:192,
  bush:on('vfxBush'),blood:impacts||on('vfxBlood'),impacts,pulses:impacts&&on('vfxPulses'),glass:on('vfxGlass'),
  smoke:on('vfxSmoke'),evidence:on('vfxEvidence'),lights:params.get('vfxLights')==='1'} as const;
}
