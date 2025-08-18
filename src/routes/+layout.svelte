<script>
	import { page } from '$app/stores';
	import { searchQuery, selectedTags } from '$lib/stores.js';
	import UploadForm from '$lib/components/UploadForm.svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	
	let searchInput = '';
	let showUpload = false;
	let searchFocused = false;
	let pageLoading = true;
	let uploadModal;
	
	onMount(() => {
		// Page load animation
		setTimeout(() => {
			pageLoading = false;
		}, 100);
		
		// Handle escape key for modal
		const handleEscape = (e) => {
			if (e.key === 'Escape' && showUpload) {
				showUpload = false;
			}
		};
		
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	});
	
	$: if (showUpload && uploadModal) {
		// Focus management for accessibility
		uploadModal.focus();
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}
	
	function handleSearch() {
		searchQuery.set(searchInput);
	}
	
	function clearSearch() {
		searchInput = '';
		searchQuery.set('');
		selectedTags.set([]);
	}
	
	function toggleUpload() {
		showUpload = !showUpload;
	}
</script>

<svelte:head>
	<title>AnonVids - Anonymous Video Sharing</title>
</svelte:head>

<header>
	<nav>
		<div class="nav-brand">
			<a href="/">AnonVids</a>
		</div>
		
		<div class="nav-search">
			<input 
				type="text" 
				placeholder="Search videos or tags..." 
				bind:value={searchInput}
				on:input={handleSearch}
				on:focus={() => searchFocused = true}
				on:blur={() => searchFocused = false}
				class:focused={searchFocused}
				aria-label="Search videos and tags"
			/>
			{#if searchInput}
				<button class="clear-btn" on:click={clearSearch}>×</button>
			{/if}
		</div>
		
		<div class="nav-actions">
			<button 
				class="upload-btn" 
				on:click={toggleUpload}
				aria-label="Upload new video"
				aria-expanded={showUpload}
			>
				<span class="upload-icon" class:rotated={showUpload}>+</span>
				<span>Upload</span>
			</button>
		</div>
	</nav>
</header>

<main>
	{#if showUpload}
		<div 
			class="upload-overlay" 
			on:click={() => showUpload = false}
			on:keydown={(e) => e.key === 'Escape' && (showUpload = false)}
			role="button"
			tabindex="0"
			in:fade={{ duration: 250, easing: quintOut }}
			out:fade={{ duration: 200, easing: quintOut }}
		>
			<div 
				class="upload-modal" 
				bind:this={uploadModal}
				on:click|stopPropagation
				on:keydown|stopPropagation
				role="dialog"
				in:fly={{ y: 40, duration: 400, easing: quintOut }}
				out:fly={{ y: -20, duration: 250, easing: quintOut }}
				role="dialog"
				aria-modal="true"
				aria-labelledby="upload-title"
				tabindex="-1"
			>
				<button class="close-btn" on:click={() => showUpload = false} aria-label="Close upload modal">×</button>
				<h2 id="upload-title">Upload Video</h2>
				<div class="upload-content">
					<UploadForm onUploadComplete={() => showUpload = false} />
				</div>
			</div>
		</div>
	{/if}
	
	<slot />
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	
	:global(body) {
		margin: 0;
		padding: 0;
		background: 
			linear-gradient(
				135deg,
				#0a0a0a 0%,
				#1a1a1a 25%,
				#1a1a1a 75%,
				#0f0f0f 100%
			),
			url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="0.5" fill="%23ffffff" opacity="0.02"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
		color: #fff;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
		font-feature-settings: 'liga' 1, 'kern' 1, 'ss01' 1;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
		min-height: 100vh;
		position: relative;
		scroll-behavior: smooth;
		overscroll-behavior: none;
	}
	
	:global(body::before) {
		content: '';
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: 
			radial-gradient(circle at 20% 80%, rgba(74, 222, 128, 0.08) 0%, transparent 60%),
			radial-gradient(circle at 80% 20%, rgba(74, 222, 128, 0.04) 0%, transparent 60%),
			radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.03) 0%, transparent 80%);
		pointer-events: none;
		z-index: -1;
		animation: ambientGlow 20s ease-in-out infinite alternate;
	}

	@keyframes ambientGlow {
		0% { opacity: 0.8; transform: scale(1); }
		100% { opacity: 1; transform: scale(1.02); }
	}
	
	:global(h1, h2, h3, h4, h5, h6) {
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0;
	}
	
	:global(p) {
		line-height: 1.6;
		margin: 0;
	}
	
	:global(button) {
		font-family: inherit;
		cursor: pointer;
		border: none;
		outline: none;
	}
	
	:global(input, select, textarea) {
		font-family: inherit;
		outline: none;
	}
	
	header {
		background: rgba(45, 45, 45, 0.95);
		border-bottom: 1px solid rgba(64, 64, 64, 0.8);
		padding: 0 1rem;
		backdrop-filter: blur(24px) saturate(180%);
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 
			0 1px 0 rgba(255, 255, 255, 0.05) inset,
			0 4px 32px rgba(0, 0, 0, 0.12),
			0 2px 8px rgba(0, 0, 0, 0.08);
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		will-change: transform;
	}

	header:hover {
		box-shadow: 
			0 1px 0 rgba(255, 255, 255, 0.08) inset,
			0 6px 40px rgba(0, 0, 0, 0.15),
			0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	nav {
		display: flex;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		height: 64px;
		gap: 2rem;
		padding: 0 0.5rem;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	/* Mobile responsiveness improvements */
	@media (max-width: 768px) {
		nav {
			gap: 1rem;
			height: 56px;
			padding: 0 0.25rem;
		}

		.nav-search {
			flex: 1;
			max-width: none;
		}

		.upload-btn {
			padding: 0.6rem 1rem;
			font-size: 0.85rem;
		}

		.upload-modal {
			padding: 2rem 1.5rem;
			width: 95%;
			max-width: none;
		}
	}
	
	.nav-brand a {
		font-size: 1.75rem;
		font-weight: 700;
		color: #4ade80;
		text-decoration: none;
		letter-spacing: -0.02em;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.nav-brand a::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 2px;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		transition: width 0.3s ease;
	}
	
	.nav-brand a:hover {
		color: #22c55e;
		transform: translateY(-0.5px);
		text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
	}

	.nav-brand a:hover::after {
		width: 100%;
		box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
	}
	
	.nav-search {
		flex: 1;
		max-width: 450px;
		position: relative;
	}
	
	.nav-search input {
		width: 100%;
		padding: 0.75rem 1.25rem;
		background: rgba(64, 64, 64, 0.8);
		border: 1px solid rgba(85, 85, 85, 0.8);
		border-radius: 12px;
		color: #fff;
		font-size: 0.95rem;
		backdrop-filter: blur(10px);
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		outline: none;
		position: relative;
		z-index: 1;
	}

	.nav-search input.focused {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.12);
		box-shadow: 
			0 0 0 3px rgba(74, 222, 128, 0.25),
			0 8px 32px rgba(74, 222, 128, 0.15),
			0 4px 16px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px) scale(1.01);
	}
	
	.nav-search input:focus {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.12);
		box-shadow: 
			0 0 0 3px rgba(74, 222, 128, 0.25),
			0 8px 32px rgba(74, 222, 128, 0.15),
			0 4px 16px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px) scale(1.01);
	}
	
	.nav-search input::placeholder {
		color: rgba(255, 255, 255, 0.5);
		font-weight: 400;
	}
	
	.clear-btn {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(153, 153, 153, 0.1);
		border: none;
		color: #999;
		cursor: pointer;
		font-size: 1.1rem;
		padding: 0;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		transition: all 0.2s ease;
	}
	
	.clear-btn:hover {
		background: rgba(220, 38, 38, 0.2);
		color: #dc2626;
		transform: translateY(-50%) scale(1.1);
	}
	
	.upload-btn {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 10px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.95rem;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.upload-icon {
		display: inline-block;
		transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		font-size: 1.2rem;
		font-weight: 300;
		line-height: 1;
	}

	.upload-icon.rotated {
		transform: rotate(45deg);
	}
	
	.upload-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.3),
			transparent
		);
		transition: left 0.5s ease;
	}
	
	.upload-btn:hover {
		transform: translateY(-3px) scale(1.02);
		box-shadow: 
			0 12px 40px rgba(74, 222, 128, 0.4),
			0 6px 16px rgba(0, 0, 0, 0.2);
		background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
	}

	.upload-btn:active {
		transform: translateY(-1px) scale(1.01);
		transition-duration: 0.1s;
	}
	
	.upload-btn:hover::before {
		left: 100%;
	}
	
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
		min-height: calc(100vh - 64px);
		position: relative;
		overflow-x: hidden;
	}

	/* Page loading state */
	:global(.page-loading) {
		overflow: hidden;
	}

	:global(.page-loading *){
		animation-play-state: paused !important;
	}
	
	.upload-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(24px) saturate(120%);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		cursor: pointer;
	}
	
	.upload-modal {
		background: rgba(45, 45, 45, 0.97);
		border-radius: 20px;
		padding: 2.5rem;
		max-width: 550px;
		width: 90%;
		position: relative;
		backdrop-filter: blur(32px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		box-shadow: 
			0 1px 0 rgba(255, 255, 255, 0.1) inset,
			0 32px 80px rgba(0, 0, 0, 0.35),
			0 16px 32px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	.upload-modal::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(74, 222, 128, 0.8),
			transparent
		);
	}
	
	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(153, 153, 153, 0.1);
		border: none;
		color: #999;
		cursor: pointer;
		font-size: 1.5rem;
		padding: 0;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.close-btn:hover {
		background: rgba(220, 38, 38, 0.25);
		color: #dc2626;
		transform: scale(1.15) rotate(90deg);
		box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
	}

	.close-btn:active {
		transform: scale(1.05) rotate(90deg);
		transition-duration: 0.1s;
	}
	
	.upload-modal h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #4ade80;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		text-align: center;
		position: relative;
	}

	.upload-modal h2::after {
		content: '';
		position: absolute;
		bottom: -0.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 2px;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 1px;
		box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
	}
</style>