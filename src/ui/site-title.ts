/** Player-facing site titles may never expose procedural compiler diagnostics. */
export function compactSiteTitle(
 site:{name:string;archetype?:string}|null|undefined
):string {
 if(!site)return 'CUTWOODS';
 const category=site.archetype?.replace(/[-_]/g,' ').toUpperCase()??'SITE';
 const first=site.name.split('/')[0]?.trim()??'';
 const cleaned=first.replace(/^(?:U[- ]SHAPED|H[- ]SHAPED|T[- ]SHAPED|L[- ]SHAPED|DEEP[- ]NARROW|FRONT[- ]TRANSVERSE|LONG[- ]NARROW)(?:\s+|$)/i,'')
  .replace(/[-_]/g,' ').trim();
 if(!cleaned||cleaned.length>36||/^(?:PROGRAM|CAPACITY|SIDE PASSAGE|COMPACT|EXPANDED|SERVICED)\b/i.test(cleaned))
  return category;
 return cleaned.toUpperCase();
}
