/** Fixed production policy. V15 temporarily retires grass and the
 * experimental bush renderer; all combat effects remain enabled. */
export const PRODUCTION_VFX=Object.freeze({
 suite:true,grass:false,grassCell:192,bush:false,blood:true,impacts:true,
 pulses:true,glass:true,smoke:true,evidence:true,lights:true,
} as const);
