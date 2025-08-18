import { w as writable } from "./index.js";
const videos = writable([]);
const selectedTags = writable([]);
const searchQuery = writable("");
const storedVideos = typeof window !== "undefined" ? localStorage.getItem("videos") : null;
if (storedVideos) {
  videos.set(JSON.parse(storedVideos));
}
videos.subscribe((value) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("videos", JSON.stringify(value));
  }
});
export {
  searchQuery as a,
  selectedTags as s,
  videos as v
};
