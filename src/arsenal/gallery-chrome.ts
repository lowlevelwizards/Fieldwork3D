/** One Arsenal gallery shell for primaries and all secondary preview families.
 * Presentation only: each owner retains its search policy, thumbnails,
 * saved-build commands, selected recipe and workbench authority.
 */
export type ArsenalGalleryKind='primary'|'secondary';

function node<K extends keyof HTMLElementTagNameMap>(
 tag:K,className:string):HTMLElementTagNameMap[K]{
 const element=document.createElement(tag);
 element.className=className;
 return element;
}

export function createArsenalGalleryChrome(kind:ArsenalGalleryKind){
 const secondary=kind==='secondary';
 const layout=secondary?node('section','arsenal-layout arsenal-glock-gallery'):
  node('div','arsenal-layout');
 if(secondary)layout.setAttribute('aria-label','Secondary weapon factory gallery');

 const hero=secondary?node('div','arsenal-hero arsenal-glock-feature'):
  node('section','arsenal-hero');
 if(!secondary)hero.setAttribute('aria-label','Selected weapon');
 const heroMedia=node('div',secondary?
  'arsenal-hero-media arsenal-glock-hero-visual':'arsenal-hero-media');
 if(secondary)heroMedia.setAttribute('aria-live','polite');
 const heroCopy=node('div',secondary?
  'arsenal-hero-copy arsenal-glock-feature-copy':'arsenal-hero-copy');
 const heroPlatform=node('span',secondary?
  'arsenal-overline arsenal-glock-platform':'arsenal-overline');
 if(secondary)heroPlatform.textContent='GLOCK';
 const heroTitle=node('h2',secondary?'arsenal-glock-model':'');
 const heroHint=node('p',secondary?'hint arsenal-glock-description':'hint');
 if(!secondary)
  heroHint.textContent='Explore real factory configurations in the full-screen Workbench.';
 const openWorkbench=node('button',secondary?
  'arsenal-hero-open arsenal-glock-open':'arsenal-hero-open');
 openWorkbench.type='button';
 openWorkbench.textContent='OPEN WORKBENCH';
 const savedControls=node('div',secondary?
  'arsenal-saved-actions arsenal-glock-saved-actions':'arsenal-saved-actions');
 savedControls.hidden=true;
 heroCopy.append(heroPlatform,heroTitle,heroHint,openWorkbench,savedControls);
 hero.append(heroMedia,heroCopy);

 const browser=secondary?node('div','arsenal-browser arsenal-glock-browser'):
  node('section','arsenal-browser');
 const controls=node('div','arsenal-controls');
 const controlHeading=document.createElement('div');
 const overline=node('span','arsenal-overline');
 overline.textContent='FACTORY REFERENCES';
 const subTitle=node('h2','arsenal-control-heading');
 subTitle.textContent='SELECT A WEAPON';
 controlHeading.append(overline,subTitle);
 const search=node('input',secondary?'arsenal-search arsenal-glock-search':'arsenal-search');
 search.type='search';
 search.placeholder='Find a model';
 search.setAttribute('aria-label',secondary?
  'Find secondary weapon model or saved Glock build':'Find weapon model');
 controls.append(controlHeading,search);
 const filters=node('div',secondary?'arsenal-filters arsenal-glock-filters':'arsenal-filters');
 filters.setAttribute('role','group');
 filters.setAttribute('aria-label',secondary?'Secondary model filters':'Weapon platforms');
 const count=node('p',secondary?'arsenal-count arsenal-glock-count':'arsenal-count');
 count.setAttribute('aria-live','polite');
 const grid=node('div',secondary?'arsenal-grid arsenal-glock-cards':'arsenal-grid');
 if(secondary){
  grid.setAttribute('role','group');
  grid.setAttribute('aria-label','Secondary factory models and saved Glock builds');
 }
 browser.append(controls,filters,count,grid);
 layout.append(hero,browser);
 return {layout,hero,heroMedia,heroCopy,heroPlatform,heroTitle,heroHint,
  openWorkbench,savedControls,browser,search,filters,count,grid};
}
