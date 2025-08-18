

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false
};
export const universal_id = "src/routes/+page.js";
export const imports = ["_app/immutable/nodes/2.BhMGCLir.js","_app/immutable/chunks/xePfXsBy.js","_app/immutable/chunks/C_fSQihM.js","_app/immutable/chunks/CHYTBi4e.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/2.DTN5yjze.css"];
export const fonts = [];
