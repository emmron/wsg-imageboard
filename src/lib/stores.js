import { writable } from 'svelte/store';

export const videos = writable([]);
export const selectedTags = writable([]);
export const searchQuery = writable('');

const storedVideos = typeof window !== 'undefined' ? localStorage.getItem('videos') : null;
if (storedVideos) {
	videos.set(JSON.parse(storedVideos));
}

videos.subscribe(value => {
	if (typeof window !== 'undefined') {
		localStorage.setItem('videos', JSON.stringify(value));
	}
});