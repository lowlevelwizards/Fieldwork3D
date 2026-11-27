/** WR9: divide the recorded switch into primary retention and pistol draw.
 * Both directions sample the same fraction; no independent render timer. */
export function sampleSecondaryRetention(fraction:number,slung:boolean){
 const f=Math.max(0,Math.min(1,Number.isFinite(fraction)?fraction:0));
 if(!slung)return {retention:0,pistol:f};
 return {retention:Math.min(1,f/.45),pistol:Math.max(0,(f-.45)/.55)};
}
