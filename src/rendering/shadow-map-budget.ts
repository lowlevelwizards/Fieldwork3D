/** Shared *live GPU* directional shadow-map resolution for Fieldwork.
 * One 512² map per casting light is the intentional miniature-art baseline.
 * Independent baked AO/contact atlases and fog masks are NOT shadow maps.
 * Studio may explicitly request 1024/2048 for diagnostic inspection only.
 */
export const DEFAULT_SHADOW_MAP_SIZE=512 as const;
