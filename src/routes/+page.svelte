<script>
	import { onMount } from 'svelte';
	import { videos, selectedTags, searchQuery } from '$lib/stores.js';
	import { formatDate } from '$lib/utils.js';
	import CommentForm from '$lib/components/CommentForm.svelte';
	import VideoCard from '$lib/components/VideoCard.svelte';
	import SearchFilters from '$lib/components/SearchFilters.svelte';
	import VideoModal from '$lib/components/VideoModal.svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	
	let filteredVideos = [];
	let allTags = [];
	let selectedVideo = null;
	let sortBy = 'newest';
	let loading = false;
	
	onMount(() => {
		// Subscribe to store changes
		const unsubscribeVideos = videos.subscribe(value => {
			updateFilteredVideos(value, $searchQuery, $selectedTags);
			updateAllTags(value);
		});
		
		const unsubscribeSearch = searchQuery.subscribe(value => {
			updateFilteredVideos($videos, value, $selectedTags);
		});
		
		const unsubscribeTags = selectedTags.subscribe(value => {
			updateFilteredVideos($videos, $searchQuery, value);
		});
		
		return () => {
			unsubscribeVideos();
			unsubscribeSearch();
			unsubscribeTags();
		};
	});
	
	function updateFilteredVideos(videoList, query, tags) {
		let filtered = videoList.filter(video => {
			const matchesSearch = !query || 
				video.title.toLowerCase().includes(query.toLowerCase()) ||
				video.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
			
			const matchesTags = tags.length === 0 || 
				tags.every(tag => video.tags.includes(tag));
			
			return matchesSearch && matchesTags;
		});
		
		// Apply sorting
		filtered = sortVideos(filtered, sortBy);
		filteredVideos = filtered;
	}
	
	function sortVideos(videoList, sortMethod) {
		const sorted = [...videoList];
		
		switch (sortMethod) {
			case 'newest':
				return sorted.sort((a, b) => b.timestamp - a.timestamp);
			case 'oldest':
				return sorted.sort((a, b) => a.timestamp - b.timestamp);
			case 'most-comments':
				return sorted.sort((a, b) => b.comments.length - a.comments.length);
			case 'title':
				return sorted.sort((a, b) => a.title.localeCompare(b.title));
			default:
				return sorted;
		}
	}
	
	function updateAllTags(videoList) {
		const tagSet = new Set();
		videoList.forEach(video => {
			video.tags.forEach(tag => tagSet.add(tag));
		});
		allTags = Array.from(tagSet).sort();
	}
	
	function toggleTag(tag) {
		selectedTags.update(tags => {
			if (tags.includes(tag)) {
				return tags.filter(t => t !== tag);
			} else {
				return [...tags, tag];
			}
		});
	}
	
	function openVideo(video) {
		selectedVideo = video;
	}
	
	function closeVideo() {
		selectedVideo = null;
	}
	
	function handleSortChange(event) {
		sortBy = event.detail.sortBy;
		updateFilteredVideos($videos, $searchQuery, $selectedTags);
	}
	
	// Listen for sort change events
	onMount(() => {
		window.addEventListener('sortChange', handleSortChange);
		return () => {
			window.removeEventListener('sortChange', handleSortChange);
		};
	});
</script>

<div class="container">
	<SearchFilters 
		{allTags} 
		videoCount={filteredVideos.length}
	/>
	
	<div class="videos-section">
		{#if loading}
			<div class="loading-state" in:fade={{ duration: 200 }}>
				<div class="loading-spinner"></div>
				<p>Loading videos...</p>
			</div>
		{:else if filteredVideos.length === 0}
			<div class="empty-state" in:scale={{ duration: 300, easing: quintOut }}>
				{#if $videos.length === 0}
					<div class="empty-icon">📹</div>
					<h2>No videos yet</h2>
					<p>Be the first to upload a video!</p>
				{:else}
					<div class="empty-icon">🔍</div>
					<h2>No videos found</h2>
					<p>Try adjusting your search or filters</p>
				{/if}
			</div>
		{:else}
			<div class="videos-grid" in:fade={{ duration: 300, delay: 100 }}>
				{#each filteredVideos as video (video.id)}
					<VideoCard {video} onClick={openVideo} />
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if selectedVideo}
	<VideoModal video={selectedVideo} onClose={closeVideo} />
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
	}
	
	.loading-state {
		text-align: center;
		padding: 6rem 2rem;
		color: #999;
	}
	
	.loading-spinner {
		width: 64px;
		height: 64px;
		border: 4px solid rgba(64, 64, 64, 0.3);
		border-top: 4px solid #4ade80;
		border-radius: 50%;
		animation: spin 1.2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
		margin: 0 auto 2rem;
		position: relative;
	}
	
	.loading-spinner::after {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		right: 4px;
		bottom: 4px;
		border: 2px solid transparent;
		border-top: 2px solid rgba(74, 222, 128, 0.6);
		border-radius: 50%;
		animation: spin 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) infinite reverse;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.empty-state {
		text-align: center;
		padding: 6rem 2rem;
		color: #999;
		background: rgba(45, 45, 45, 0.3);
		border-radius: 16px;
		border: 1px solid rgba(64, 64, 64, 0.5);
		backdrop-filter: blur(10px);
		margin: 2rem 0;
	}
	
	.empty-icon {
		font-size: 5rem;
		margin-bottom: 1.5rem;
		opacity: 0.6;
		animation: float 3s ease-in-out infinite;
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
	
	.empty-state h2 {
		color: #888;
		margin-bottom: 1rem;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	
	.empty-state p {
		color: #666;
		font-size: 1.1rem;
		line-height: 1.5;
	}
	
	.videos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 2rem;
		padding: 2rem 0;
		position: relative;
	}
	
	@media (max-width: 768px) {
		.videos-grid {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: 1.5rem;
			padding: 1.5rem 0;
		}
		
		.empty-state {
			padding: 3rem 1rem;
			margin: 1rem 0;
		}
		
		.empty-icon {
			font-size: 3.5rem;
		}
		
		.empty-state h2 {
			font-size: 1.25rem;
		}
		
		.empty-state p {
			font-size: 1rem;
		}
	}
	
</style>