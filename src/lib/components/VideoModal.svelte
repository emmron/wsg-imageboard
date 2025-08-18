<script>
	import { formatDate } from '$lib/utils.js';
	import CommentForm from './CommentForm.svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	
	export let video;
	export let onClose = () => {};
	
	let videoElement;
	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;
	let volume = 1;
	let showControls = true;
	let controlsTimeout;
	let isFullscreen = false;
	let modalElement;
	let isBuffering = false;
	let playbackRate = 1;
	
	onMount(() => {
		// Focus trap and better modal management
		if (modalElement) {
			modalElement.focus();
		}
		
		// Prevent body scroll
		document.body.style.overflow = 'hidden';
		
		return () => {
			document.body.style.overflow = '';
		};
	});
	
	function togglePlay() {
		if (videoElement) {
			if (videoElement.paused) {
				videoElement.play();
				isPlaying = true;
			} else {
				videoElement.pause();
				isPlaying = false;
			}
		}
	}
	
	function handleTimeUpdate() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
			duration = videoElement.duration;
		}
	}
	
	function handleSeek(event) {
		if (videoElement && duration) {
			const rect = event.target.getBoundingClientRect();
			const pos = (event.clientX - rect.left) / rect.width;
			videoElement.currentTime = pos * duration;
		}
	}
	
	function handleVolumeChange(event) {
		const newVolume = parseFloat(event.target.value);
		volume = newVolume;
		if (videoElement) {
			videoElement.volume = newVolume;
		}
	}
	
	function formatTime(seconds) {
		if (!seconds || !isFinite(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	function handleMouseMove() {
		showControls = true;
		clearTimeout(controlsTimeout);
		controlsTimeout = setTimeout(() => {
			if (isPlaying) {
				showControls = false;
			}
		}, 3000);
	}
	
	function handleKeyPress(event) {
		switch (event.key) {
			case ' ':
				event.preventDefault();
				togglePlay();
				break;
			case 'Escape':
				onClose();
				break;
			case 'ArrowLeft':
				if (videoElement) {
					videoElement.currentTime -= 10;
				}
				break;
			case 'ArrowRight':
				if (videoElement) {
					videoElement.currentTime += 10;
				}
				break;
		}
	}
	
	function handleClose(event) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
	
	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			videoElement?.requestFullscreen();
			isFullscreen = true;
		} else {
			document.exitFullscreen();
			isFullscreen = false;
		}
	}
	
	function handleBuffering() {
		isBuffering = true;
	}
	
	function handleCanPlay() {
		isBuffering = false;
	}
	
	function changePlaybackRate(rate) {
		playbackRate = rate;
		if (videoElement) {
			videoElement.playbackRate = rate;
		}
	}
</script>

<svelte:window on:keydown={handleKeyPress} />

<div 
	class="video-modal" 
	bind:this={modalElement}
	on:click={handleClose}
	on:mousemove={handleMouseMove}
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 150 }}
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-label="Video player modal"
>
	<div class="modal-content" 
		on:click|stopPropagation
		in:scale={{ duration: 300, easing: quintOut }}
		out:scale={{ duration: 200, start: 0.95 }}
	>
		<button class="close-btn" on:click={onClose} aria-label="Close video">
			×
		</button>
		
		<div class="video-player">
			<video 
				bind:this={videoElement}
				on:timeupdate={handleTimeUpdate}
				on:loadedmetadata={handleTimeUpdate}
				on:play={() => isPlaying = true}
				on:pause={() => isPlaying = false}
				on:ended={() => isPlaying = false}
				autoplay
				controls={false}
			>
				<source src={video.url} type="video/mp4">
				<track kind="captions" label="No captions available">
			</video>
			
			<div class="video-overlay" on:click={togglePlay}>
				{#if !isPlaying}
					<div class="play-button">
						<div class="play-icon">▶</div>
					</div>
				{/if}
			</div>
			
			{#if showControls}
				<div class="video-controls">
					<div class="progress-bar" on:click={handleSeek}>
						<div 
							class="progress-fill" 
							style="width: {duration ? (currentTime / duration) * 100 : 0}%"
						></div>
					</div>
					
					<div class="controls-row">
						<button class="control-btn" on:click={togglePlay}>
							{isPlaying ? '⏸' : '▶'}
						</button>
						
						<span class="time-display">
							{formatTime(currentTime)} / {formatTime(duration)}
						</span>
						
						<div class="volume-control">
							<span class="volume-icon">🔊</span>
							<input 
								type="range" 
								min="0" 
								max="1" 
								step="0.1"
								bind:value={volume}
								on:input={handleVolumeChange}
								class="volume-slider"
							/>
						</div>
					</div>
				</div>
			{/if}
		</div>
		
		<div class="video-details">
			<h3>{video.title}</h3>
			<div class="video-meta">
				<span class="hash">#{video.hash}</span>
				<span class="date">{formatDate(new Date(video.timestamp))}</span>
				<span class="comments-count">💬 {video.comments.length}</span>
			</div>
			
			{#if video.tags.length > 0}
				<div class="video-tags">
					{#each video.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
			
			<div class="comments-section">
				<h4>Comments ({video.comments.length})</h4>
				
				<CommentForm videoId={video.id} />
				
				{#if video.comments.length === 0}
					<p class="no-comments">No comments yet. Be the first to comment!</p>
				{:else}
					<div class="comments-list">
						{#each video.comments as comment}
							<div class="comment">
								<div class="comment-header">
									<span class="comment-hash">#{comment.hash}</span>
									<span class="comment-date">{formatDate(new Date(comment.timestamp))}</span>
								</div>
								<p class="comment-text">{comment.text}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.video-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.95);
		backdrop-filter: blur(20px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		cursor: pointer;
		outline: none;
	}
	
	.modal-content {
		background: #2d2d2d;
		border-radius: 16px;
		max-width: 90vw;
		max-height: 90vh;
		width: 1000px;
		overflow-y: auto;
		position: relative;
		cursor: default;
		box-shadow: 
			0 20px 60px rgba(0, 0, 0, 0.3),
			0 8px 20px rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.8);
		border: none;
		color: #fff;
		cursor: pointer;
		font-size: 1.5rem;
		padding: 0.5rem;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		z-index: 1001;
		transition: background 0.2s ease;
	}
	
	.close-btn:hover {
		background: rgba(220, 38, 38, 0.8);
		transform: scale(1.1);
	}
	
	.video-player {
		position: relative;
		background: #000;
	}
	
	.video-player video {
		width: 100%;
		max-height: 60vh;
		display: block;
	}
	
	.video-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	
	.play-button {
		opacity: 0.8;
		transition: opacity 0.2s ease;
	}
	
	.play-button:hover {
		opacity: 1;
	}
	
	.play-icon {
		background: rgba(74, 222, 128, 0.9);
		color: #000;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
	}
	
	.video-controls {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
		padding: 1rem;
		transition: opacity 0.3s ease;
	}
	
	.progress-bar {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
		margin-bottom: 1rem;
		cursor: pointer;
		position: relative;
	}
	
	.progress-fill {
		height: 100%;
		background: #4ade80;
		border-radius: 3px;
		transition: width 0.1s ease;
	}
	
	.controls-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #fff;
	}
	
	.control-btn {
		background: none;
		border: none;
		color: #fff;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		transition: background 0.2s ease;
	}
	
	.control-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	
	.time-display {
		font-family: monospace;
		font-size: 0.9rem;
		color: #ccc;
	}
	
	.volume-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}
	
	.volume-icon {
		font-size: 1rem;
	}
	
	.volume-slider {
		width: 80px;
		height: 4px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}
	
	.video-details {
		padding: 1.5rem;
	}
	
	.video-details h3 {
		margin: 0 0 1rem 0;
		color: #fff;
		font-size: 1.3rem;
	}
	
	.video-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		flex-wrap: wrap;
	}
	
	.hash {
		color: #4ade80;
		font-weight: 500;
		font-family: monospace;
	}
	
	.date, .comments-count {
		color: #999;
	}
	
	.video-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}
	
	.tag {
		background: #404040;
		color: #ccc;
		padding: 0.3rem 0.8rem;
		border-radius: 20px;
		font-size: 0.8rem;
		transition: background 0.2s ease;
	}
	
	.tag:hover {
		background: #4ade80;
		color: #000;
	}
	
	.comments-section h4 {
		color: #4ade80;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}
	
	.comments-list {
		margin-top: 1.5rem;
	}
	
	.comment {
		background: #404040;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1rem;
		transition: background 0.2s ease;
	}
	
	.comment:hover {
		background: #4a4a4a;
	}
	
	.comment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
	}
	
	.comment-hash {
		color: #4ade80;
		font-weight: 500;
		font-family: monospace;
	}
	
	.comment-date {
		color: #999;
	}
	
	.comment-text {
		margin: 0;
		color: #fff;
		line-height: 1.4;
		word-wrap: break-word;
	}
	
	.no-comments {
		color: #999;
		font-style: italic;
		text-align: center;
		padding: 2rem;
		background: #404040;
		border-radius: 6px;
	}
	
	@media (max-width: 768px) {
		.modal-content {
			width: 95vw;
			max-height: 95vh;
		}
		
		.video-player video {
			max-height: 50vh;
		}
		
		.play-icon {
			width: 60px;
			height: 60px;
			font-size: 1.5rem;
		}
		
		.video-details {
			padding: 1rem;
		}
		
		.controls-row {
			gap: 0.5rem;
		}
		
		.time-display {
			font-size: 0.8rem;
		}
		
		.volume-control {
			display: none;
		}
	}
</style>