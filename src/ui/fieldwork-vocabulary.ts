/** Player-facing Fieldwork terminology. This is a presentation-only map.
 * Never rename persisted schema keys, mission types or internal debug IDs.
 */
export const FIELDWORK_TERMS=Object.freeze({
 mission:'MISSION',site:'SITE',layout:'LAYOUT',
 missionSetup:'MISSION SETUP',campaign:'CAMPAIGN',
 debrief:'DEBRIEF',missionGrade:'GRADE',
 contribution:'CONTRIBUTION',combatReport:'COMBAT REPORT',
 replay:'REPLAY',clip:'CLIP',highlight:'HIGHLIGHT',
 incapacitated:'INCAPACITATED',surrendered:'SURRENDERED',
 newMission:'NEW MISSION',retryMission:'RETRY MISSION',
 returnToBase:'RETURN TO BASE',mainMenu:'MAIN MENU'
});
export function debriefPrimaryActionLabel(
 mode:'menu'|'home'|'mission'|'quick'
):string{
 return mode==='mission'?FIELDWORK_TERMS.returnToBase:
   FIELDWORK_TERMS.newMission;
}
