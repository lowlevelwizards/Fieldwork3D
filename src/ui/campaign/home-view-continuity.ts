/** UI-only Operations Room continuity across authoritative snapshot refreshes. */
export function captureCampaignHomeView(root:HTMLElement){
 const wasInOperations=!root.hidden&&!!root.querySelector('.campaign-tabs');
 const restoreScroll=wasInOperations?root.scrollTop:0;
 const openWorkspaceDetails=wasInOperations?
  new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>(
   'details[data-campaign-detail][open]')).map(el=>el.dataset.campaignDetail??'')):new Set<string>();
 const focusedControl=wasInOperations&&root.contains(root.ownerDocument.activeElement)?
  root.ownerDocument.activeElement as HTMLElement:null;
 const focusedLabel=focusedControl?.getAttribute('aria-label');
 return {restoreScroll,openWorkspaceDetails,focusedLabel};
}
export function restoreCampaignHomeView(root:HTMLElement,nav:HTMLElement,
 snapshot:ReturnType<typeof captureCampaignHomeView>){
 const {restoreScroll,openWorkspaceDetails,focusedLabel}=snapshot;
 for(const detail of root.querySelectorAll<HTMLDetailsElement>(
  'details[data-campaign-detail]')){
  detail.open=openWorkspaceDetails.has(detail.dataset.campaignDetail??'');
 }
 if(restoreScroll>0)root.scrollTop=restoreScroll;
 if(focusedLabel){
  const restored=Array.from(root.querySelectorAll<HTMLElement>('[aria-label]'))
   .find(control=>control.getAttribute('aria-label')===focusedLabel&&
    !control.matches(':disabled'));
  (restored??nav.querySelector<HTMLElement>('[aria-selected="true"]'))
   ?.focus({preventScroll:true});
 }
}
