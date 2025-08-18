<script>
	import { selectedTags, searchQuery } from '$lib/stores.js';
	import { fly, slide, scale, fade } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	
	export let allTags = [];
	export let videoCount = 0;
	
	let sortBy = 'newest';
	let showFilters = false;
	let tagSearch = '';
	let filterElement;
	
	$: filteredTags = allTags.filter(tag => 
		tag.toLowerCase().includes(tagSearch.toLowerCase())
	);
	
	function toggleTag(tag) {
		selectedTags.update(tags => {
			if (tags.includes(tag)) {
				return tags.filter(t => t !== tag);
			} else {
				return [...tags, tag];
			}
		});
	}
	
	function clearAllFilters() {
		selectedTags.set([]);
		searchQuery.set('');
		sortBy = 'newest';
	}
	
	function handleSortChange() {
		// Sorting logic would be implemented in parent component
		const event = new CustomEvent('sortChange', {
			detail: { sortBy }
		});
		window.dispatchEvent(event);
	}
</script>

<div class="search-filters" bind:this={filterElement} in:fly={{ y: -20, duration: 300, easing: quintOut }}>
	<div class="filters-header">
		<div class="results-info">
			<span class="result-count">{videoCount} videos</span>
			{#if $selectedTags.length > 0 || $searchQuery}
				<button class="clear-filters" on:click={clearAllFilters}>
					Clear all filters
				</button>
			{/if}
		</div>
		
		<div class="filter-controls">
			<select bind:value={sortBy} on:change={handleSortChange} class="sort-select">
				<option value="newest">Newest first</option>
				<option value="oldest">Oldest first</option>
				<option value="most-comments">Most comments</option>
				<option value="title">Title A-Z</option>
			</select>
			
			<button 
				class="toggle-filters"
				on:click={() => showFilters = !showFilters}
				class:active={showFilters}
			>
				Filters {showFilters ? '▲' : '▼'}
			</button>
		</div>
	</div>
	
	{#if showFilters}
		<div class="filters-content" in:slide={{ duration: 300, easing: quintOut }} out:slide={{ duration: 200 }}>
			{#if allTags.length > 0}
				<div class="tags-section">
					<h4>Filter by Tags</h4>
					
					{#if allTags.length > 10}
						<div class="tag-search">
							<input 
								type="text"
								placeholder="Search tags..."
								bind:value={tagSearch}
							/>
						</div>
					{/if}
					
					<div class="tags-grid">
						{#each filteredTags.slice(0, 20) as tag, i}
							<button 
								class="tag-filter"
								class:active={$selectedTags.includes(tag)}
								on:click={() => toggleTag(tag)}
								in:scale={{ duration: 200, delay: i * 20, easing: cubicOut }}
							>
								{tag}
							</button>
						{/each}
						
						{#if filteredTags.length > 20}
							<span class="more-tags">+{filteredTags.length - 20} more...</span>
						{/if}
					</div>
				</div>
			{/if}
			
			<div class="active-filters">
				{#if $selectedTags.length > 0}
					<h4 in:fade={{ duration: 200 }}>Active Filters</h4>
					<div class="active-tags">
						{#each $selectedTags as tag, i (tag)}
							<div class="active-tag" 
								in:scale={{ duration: 200, delay: i * 50, easing: cubicOut }}
								out:scale={{ duration: 150, easing: cubicOut }}
							>
								{tag}
								<button on:click={() => toggleTag(tag)} aria-label="Remove {tag} filter">×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.search-filters {
		background: rgba(45, 45, 45, 0.95);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		border: 1px solid rgba(64, 64, 64, 0.8);
		backdrop-filter: blur(20px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
	}
	
	.search-filters::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(74, 222, 128, 0.5),
			transparent
		);
	}
	
	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.results-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.result-count {
		color: #4ade80;
		font-weight: 600;
		font-size: 1rem;
		position: relative;
	}
	
	.result-count::before {
		content: '';
		position: absolute;
		left: -0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 1rem;
		background: #4ade80;
		border-radius: 2px;
	}
	
	.clear-filters {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.3);
		color: #dc2626;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		backdrop-filter: blur(10px);
	}
	
	.clear-filters:hover {
		background: #dc2626;
		color: #fff;
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
	}
	
	.filter-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.sort-select {
		background: rgba(64, 64, 64, 0.8);
		border: 1px solid rgba(85, 85, 85, 0.8);
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		backdrop-filter: blur(10px);
		transition: all 0.2s ease;
		outline: none;
	}
	
	.sort-select:focus,
	.sort-select:hover {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.1);
		box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
	}
	
	.toggle-filters {
		background: rgba(64, 64, 64, 0.8);
		border: 1px solid rgba(85, 85, 85, 0.8);
		color: #fff;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}
	
	.toggle-filters::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(74, 222, 128, 0.3),
			transparent
		);
		transition: left 0.5s ease;
	}
	
	.toggle-filters:hover::before {
		left: 100%;
	}
	
	.toggle-filters:hover,
	.toggle-filters.active {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		border-color: #4ade80;
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(74, 222, 128, 0.3);
	}
	
	.filters-content {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #404040;
	}
	
	.tags-section h4,
	.active-filters h4 {
		color: #4ade80;
		margin: 0 0 1rem 0;
		font-size: 1rem;
	}
	
	.tag-search {
		margin-bottom: 1rem;
	}
	
	.tag-search input {
		background: rgba(64, 64, 64, 0.8);
		border: 1px solid rgba(85, 85, 85, 0.8);
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		width: 100%;
		max-width: 250px;
		font-size: 0.9rem;
		backdrop-filter: blur(10px);
		transition: all 0.2s ease;
		outline: none;
	}
	
	.tag-search input:focus {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.1);
		box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
	}
	
	.tag-search input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}
	
	.tags-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.tag-filter {
		background: rgba(64, 64, 64, 0.6);
		border: 1px solid rgba(85, 85, 85, 0.6);
		color: #fff;
		padding: 0.5rem 1rem;
		border-radius: 24px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}
	
	.tag-filter::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			45deg,
			transparent 30%,
			rgba(255, 255, 255, 0.1) 50%,
			transparent 70%
		);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}
	
	.tag-filter:hover {
		background: rgba(85, 85, 85, 0.8);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
	
	.tag-filter:hover::before {
		transform: translateX(100%);
	}
	
	.tag-filter.active {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		border-color: #4ade80;
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(74, 222, 128, 0.3);
	}
	
	.more-tags {
		color: #999;
		font-size: 0.8rem;
		padding: 0.3rem 0.8rem;
	}
	
	.active-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	
	.active-tag {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		padding: 0.5rem 1rem;
		border-radius: 24px;
		font-size: 0.85rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
	}
	
	.active-tag button {
		background: rgba(0, 0, 0, 0.1);
		border: none;
		color: #000;
		cursor: pointer;
		font-size: 1rem;
		padding: 0;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		font-weight: bold;
	}
	
	.active-tag button:hover {
		background: rgba(0, 0, 0, 0.2);
		transform: scale(1.1);
	}
</style>