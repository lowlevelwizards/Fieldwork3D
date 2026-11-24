/** V11: the complete VFX suite is unconditional in production.
 * No query-string or persisted setting may disable these rendering paths.
 * Keep the coarse grass layout used by the integrated V10 suite.
 */
export const PRODUCTION_VFX=Object.freeze({
 suite:true,grass:true,grassCell:192,bush:true,blood:true,impacts:true,
 pulses:true,glass:true,smoke:true,evidence:true,lights:true,
} as const);
