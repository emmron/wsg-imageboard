

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false
};
export const universal_id = "src/routes/+layout.js";
export const imports = ["_app/immutable/nodes/0.DtFlA69X.js","_app/immutable/chunks/xePfXsBy.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/AXs0lIJ4.js","_app/immutable/chunks/CHYTBi4e.js","_app/immutable/chunks/C_fSQihM.js"];
export const stylesheets = ["_app/immutable/assets/0.C7yEdsma.css"];
export const fonts = [];
