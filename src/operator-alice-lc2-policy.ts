/** R5F cosmetics-only ALICE field-load subtypes.
 * No geometry imports: WardrobeOptions must stay pure and cycle-free.
 */
export const ALICE_LC2_LOADS=['light','standard','patrol'] as const;
export type AliceLc2Load=typeof ALICE_LC2_LOADS[number];
export const isAliceLc2Load=(v:unknown):v is AliceLc2Load=>
 typeof v==='string'&&(ALICE_LC2_LOADS as readonly string[]).includes(v);
