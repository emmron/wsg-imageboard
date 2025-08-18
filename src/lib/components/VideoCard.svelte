<script>
	import { formatDate } from '$lib/utils.js';
	import { fly, scale } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	
	export let video;
	export let onClick = () => {};
	
	let thumbnailLoaded = false;
	let videoDuration = 0;
	let videoElement;
	let isHovered = false;
	let cardElement;
	let previewTimeout;
	
	function handleThumbnailLoad() {
		thumbnailLoaded = true;
		if (videoElement) {
			videoDuration = videoElement.duration;
		}
	}
	
	function formatDuration(seconds) {
		if (!seconds || !isFinite(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	function handleClick() {
		onClick(video);
	}
	
	function handleKeyPress(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClick(video);
		}
	}
	
	function handleMouseEnter() {
		isHovered = true;
		// Add subtle video preview on hover with delay
		previewTimeout = setTimeout(() => {
			if (videoElement && isHovered) {
				videoElement.currentTime = 1; // Show frame at 1 second
			}
		}, 500);
	}
	
	function handleMouseLeave() {
		isHovered = false;
		clearTimeout(previewTimeout);
		if (videoElement) {
			videoElement.currentTime = 0;
		}
	}
</script>

<div 
	class="video-card" 
	bind:this={cardElement}
	on:click={handleClick}
	on:keypress={handleKeyPress}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	role="button"
	tabindex="0"
	aria-label="Play video: {video.title}"
	in:fly={{ y: 20, duration: 300, easing: quintOut }}
	class:hovered={isHovered}
>
	<div class="video-thumbnail">
		<video 
			bind:this={videoElement}
			on:loadedmetadata={handleThumbnailLoad}
			preload="metadata"
			muted
		>
			<source src={video.url} type="video/mp4">
		</video>
		
		{#if !thumbnailLoaded}
			<div class="thumbnail-loading" in:fly={{ y: 10, duration: 200 }}>
				<div class="loading-skeleton">
					<div class="skeleton-pulse"></div>
					<div class="loading-spinner"></div>
				</div>
			</div>
		{/if}
		
		<div class="play-overlay">
			{#if isHovered}
				<div class="play-icon" in:scale={{ duration: 200, easing: cubicOut }}>▶</div>
			{/if}
		</div>
		
		<!-- Gradient overlay for better text readability -->
		<div class="gradient-overlay"></div>
		
		{#if videoDuration > 0}
			<div class="duration-badge">
				{formatDuration(videoDuration)}
			</div>
		{/if}
		
		<div class="video-stats">
			<span class="comment-count">💬 {video.comments.length}</span>
		</div>
	</div>
	
	<div class="video-info">
		<h4 class="video-title">{video.title}</h4>
		<div class="video-meta">
			<span class="hash">#{video.hash}</span>
			<span class="date">{formatDate(new Date(video.timestamp))}</span>
		</div>
		{#if video.tags.length > 0}
			<div class="video-tags">
				{#each video.tags.slice(0, 3) as tag}
					<span class="tag-small">{tag}</span>
				{/each}
				{#if video.tags.length > 3}
					<span class="tag-more">+{video.tags.length - 3}</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.video-card {
		background: rgba(45, 45, 45, 0.95);
		border-radius: 16px;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		border: 1px solid rgba(255, 255, 255, 0.08);
		position: relative;
		will-change: transform, box-shadow;
		backdrop-filter: blur(24px) saturate(180%);
		box-shadow: 
			0 1px 0 rgba(255, 255, 255, 0.06) inset,
			0 4px 20px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.08);
		contain: layout style paint;
	}

	.video-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(74, 222, 128, 0.03) 50%,
			transparent 100%
		);
		opacity: 0;
		transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		pointer-events: none;
		z-index: -1;
	}
	
	.video-card:hover,
	.video-card.hovered {
		transform: translateY(-8px) scale(1.03);
		border-color: rgba(74, 222, 128, 0.5);
		box-shadow: 
			0 1px 0 rgba(255, 255, 255, 0.1) inset,
			0 20px 60px rgba(74, 222, 128, 0.15),
			0 8px 32px rgba(0, 0, 0, 0.2),
			0 0 0 1px rgba(74, 222, 128, 0.2);
	}

	.video-card:hover::before,
	.video-card.hovered::before {
		opacity: 1;
	}
	
	.video-card:focus {
		outline: none;
		border-color: #4ade80;
		box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
	}
	
	.video-thumbnail {
		position: relative;
		height: 200px;
		background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
		overflow: hidden;
		border-radius: 16px 16px 0 0;
		isolation: isolate;
	}

	.video-thumbnail::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(
			circle at center,
			rgba(74, 222, 128, 0.05) 0%,
			transparent 70%
		);
		opacity: 0;
		transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		pointer-events: none;
		z-index: 1;
	}

	.video-card:hover .video-thumbnail::before {
		opacity: 1;
	}
	
	.video-thumbnail video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: center;
		filter: brightness(0.9) contrast(1.1);
	}
	
	.video-card:hover .video-thumbnail video {
		transform: scale(1.08);
		filter: brightness(1) contrast(1.15) saturate(1.1);
	}
	
	.thumbnail-loading {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
	}
	
	.loading-skeleton {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			135deg,
			#1a1a1a 0%,
			#2d2d2d 50%,
			#1a1a1a 100%
		);
		background-size: 200% 200%;
		animation: gradientShift 3s ease-in-out infinite;
	}

	@keyframes gradientShift {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	
	.skeleton-pulse {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.08),
			transparent
		);
		animation: skeleton-loading 2s cubic-bezier(0.4, 0.0, 0.6, 1) infinite;
		filter: blur(0.5px);
	}
	
	@keyframes skeleton-loading {
		0% { transform: translateX(-120%) skewX(-15deg); }
		100% { transform: translateX(120%) skewX(-15deg); }
	}
	
	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(64, 64, 64, 0.3);
		border-top: 3px solid #4ade80;
		border-radius: 50%;
		animation: spin 1.2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
		position: relative;
		z-index: 2;
		filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.5));
	}

	.loading-spinner::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		right: 2px;
		bottom: 2px;
		border: 2px solid transparent;
		border-top: 2px solid rgba(74, 222, 128, 0.6);
		border-radius: 50%;
		animation: spin 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) infinite reverse;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.play-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: 
			radial-gradient(
				circle at center,
				rgba(0, 0, 0, 0.7) 0%,
				rgba(0, 0, 0, 0.3) 60%,
				transparent 100%
			),
			linear-gradient(
				45deg,
				rgba(74, 222, 128, 0.05) 0%,
				transparent 50%,
				rgba(34, 197, 94, 0.05) 100%
			);
		opacity: 0;
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		backdrop-filter: blur(4px) saturate(120%);
		z-index: 2;
	}
	
	.video-card:hover .play-overlay {
		opacity: 1;
	}

	.video-card:hover .play-icon {
		transform: scale(1) rotateZ(0deg);
		box-shadow: 
			0 12px 40px rgba(74, 222, 128, 0.6),
			0 6px 20px rgba(0, 0, 0, 0.4),
			0 0 0 4px rgba(255, 255, 255, 0.4),
			0 0 0 1px rgba(0, 0, 0, 0.1) inset;
	}
	
	.gradient-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 60px;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.8) 0%,
			rgba(0, 0, 0, 0.4) 50%,
			transparent 100%
		);
		pointer-events: none;
	}
	
	.play-icon {
		background: 
			linear-gradient(135deg, #4ade80 0%, #22c55e 100%),
			linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
		background-blend-mode: overlay;
		color: #000;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.8rem;
		font-weight: bold;
		box-shadow: 
			0 8px 32px rgba(74, 222, 128, 0.5),
			0 4px 16px rgba(0, 0, 0, 0.3),
			0 0 0 3px rgba(255, 255, 255, 0.3),
			0 0 0 1px rgba(0, 0, 0, 0.1) inset;
		backdrop-filter: blur(16px) saturate(180%);
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
		position: relative;
		overflow: hidden;
		transform: scale(0.9);
		padding-left: 3px; /* Optical alignment for play triangle */
	}
	
	.play-icon::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(255, 255, 255, 0.4) 45%,
			rgba(255, 255, 255, 0.6) 55%,
			transparent 100%
		);
		transform: translateX(-120%) rotate(45deg);
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		border-radius: 50%;
	}
	
	.video-card:hover .play-icon::before {
		transform: translateX(120%) rotate(45deg);
	}

	.play-icon::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		height: 90%;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
		pointer-events: none;
	}
	
	.duration-badge {
		position: absolute;
		bottom: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		font-weight: 500;
		backdrop-filter: blur(8px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		z-index: 3;
	}

	.video-card:hover .duration-badge {
		background: rgba(0, 0, 0, 0.9);
		transform: translateY(-2px) scale(1.05);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}
	
	.video-stats {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		gap: 0.5rem;
	}
	
	.comment-count {
		background: rgba(0, 0, 0, 0.8);
		color: #fff;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	
	.video-info {
		padding: 1.25rem;
		background: rgba(45, 45, 45, 0.95);
		backdrop-filter: blur(10px);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.video-title {
		margin: 0 0 0.75rem 0;
		color: #fff;
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		transition: color 0.2s ease;
		letter-spacing: -0.01em;
	}
	
	.video-card:hover .video-title {
		color: #4ade80;
	}
	
	.video-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
		color: #999;
	}
	
	.hash {
		color: #4ade80;
		font-weight: 500;
		font-family: monospace;
	}
	
	.video-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	
	.tag-small {
		background: rgba(64, 64, 64, 0.8);
		color: #ccc;
		padding: 0.25rem 0.6rem;
		border-radius: 14px;
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		cursor: pointer;
	}
	
	.tag-small:hover {
		background: rgba(74, 222, 128, 0.9);
		color: #000;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
	}
	
	.tag-more {
		background: #555;
		color: #999;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.7rem;
	}
</style>