/** Stable published browser-save keys shared by tactical and standalone editors.
 * Renaming any of these requires a separate deliberate migration.
 */
export const BREACH_STORAGE_KEYS={
 intelPreference:'fieldwork3d.intel.mode.v1',
 quickCosmetics:'fieldwork3d.quickplay-cosmetics.v1',
 quickKitPreferences:'fieldwork3d.quickplay-kit-preferences.v1',
 legacyRoster:'fieldwork3d.operator-roster.v1',
 campaign:'fieldwork3d.campaign.v1',
 sandboxCampaign:'fieldwork3d.sandbox-campaign.v1',
 dispatchCampaign:'fieldwork3d.dispatch-campaign.v1',
 activeCampaignSlot:'fieldwork3d.campaign-active-slot.v1',
 operationHistory:'fieldwork3d.operation-history.v1'
} as const;
