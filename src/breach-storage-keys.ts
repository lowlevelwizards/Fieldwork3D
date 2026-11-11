/** Stable published browser-save keys shared by tactical and standalone editors.
 * Renaming any of these requires a separate deliberate migration.
 */
export const BREACH_STORAGE_KEYS={
 intelPreference:'fieldwork3d.intel.mode.v1',
 quickCosmetics:'fieldwork3d.quickplay-cosmetics.v1',
 legacyRoster:'fieldwork3d.operator-roster.v1',
 campaign:'fieldwork3d.campaign.v1',
 operationHistory:'fieldwork3d.operation-history.v1'
} as const;
