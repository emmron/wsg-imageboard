<script>
	import { videos } from '$lib/stores.js';
	import { generateHash } from '$lib/utils.js';
	import { validateComment, sanitizeText } from '$lib/validation.js';
	
	export let videoId;
	
	let commentText = '';
	let posting = false;
	let validationErrors = [];
	let validationWarnings = [];
	
	function validateCommentInput() {
		if (!commentText.trim()) {
			validationErrors = [];
			validationWarnings = [];
			return;
		}
		
		const validation = validateComment(commentText);
		validationErrors = validation.errors;
		validationWarnings = validation.warnings;
	}
	
	async function postComment() {
		if (!commentText.trim()) return;
		
		const validation = validateComment(commentText);
		if (!validation.valid) {
			validationErrors = validation.errors;
			validationWarnings = validation.warnings;
			return;
		}
		
		posting = true;
		
		try {
			const newComment = {
				id: generateHash(commentText),
				hash: generateHash(commentText),
				text: sanitizeText(commentText.trim()),
				timestamp: Date.now()
			};
			
			videos.update(currentVideos => {
				return currentVideos.map(video => {
					if (video.id === videoId) {
						return {
							...video,
							comments: [...video.comments, newComment]
						};
					}
					return video;
				});
			});
			
			commentText = '';
			posting = false;
			validationErrors = [];
			validationWarnings = [];
		} catch (error) {
			console.error('Failed to post comment:', error);
			posting = false;
		}
	}
	
	function handleKeyPress(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			postComment();
		}
	}
</script>

<div class="comment-form">
	{#if validationErrors.length > 0}
		<div class="validation-errors">
			{#each validationErrors as error}
				<div class="error-message">⚠ {error}</div>
			{/each}
		</div>
	{/if}
	
	{#if validationWarnings.length > 0}
		<div class="validation-warnings">
			{#each validationWarnings as warning}
				<div class="warning-message">⚠ {warning}</div>
			{/each}
		</div>
	{/if}
	
	<textarea
		bind:value={commentText}
		on:input={validateCommentInput}
		placeholder="Add a comment... (Press Enter to post, Shift+Enter for new line)"
		on:keypress={handleKeyPress}
		disabled={posting}
		class:error={validationErrors.length > 0}
	></textarea>
	
	<div class="form-actions">
		<small>Anonymous comment - Hash ID will be generated</small>
		<div class="form-meta">
			<span class="char-count" class:warning={commentText.length > 800}>
				{commentText.length}/1000
			</span>
		</div>
		<button 
			on:click={postComment}
			disabled={!commentText.trim() || posting || validationErrors.length > 0}
		>
			{posting ? 'Posting...' : 'Post Comment'}
		</button>
	</div>
</div>

<style>
	.comment-form {
		background: #404040;
		border-radius: 6px;
		padding: 1rem;
		margin-top: 1rem;
	}
	
	textarea {
		width: 100%;
		min-height: 80px;
		background: #2d2d2d;
		border: 1px solid #555;
		color: #fff;
		padding: 0.8rem;
		border-radius: 6px;
		resize: vertical;
		font-family: inherit;
		font-size: 0.9rem;
	}
	
	textarea:focus {
		outline: none;
		border-color: #4ade80;
	}
	
	textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	textarea.error {
		border-color: #dc2626;
		background: rgba(220, 38, 38, 0.05);
	}
	
	.validation-errors {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid #dc2626;
		border-radius: 4px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
	}
	
	.validation-warnings {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid #f59e0b;
		border-radius: 4px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
	}
	
	.error-message {
		color: #fca5a5;
		font-size: 0.8rem;
		margin-bottom: 0.2rem;
	}
	
	.warning-message {
		color: #fbbf24;
		font-size: 0.8rem;
		margin-bottom: 0.2rem;
	}
	
	.form-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.8rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	
	.form-actions small {
		color: #999;
		font-size: 0.8rem;
	}
	
	.form-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.char-count {
		color: #999;
		font-size: 0.8rem;
		font-family: monospace;
	}
	
	.char-count.warning {
		color: #f59e0b;
	}
	
	.form-actions button {
		background: #4ade80;
		color: #000;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		font-size: 0.9rem;
	}
	
	.form-actions button:hover:not(:disabled) {
		background: #22c55e;
	}
	
	.form-actions button:disabled {
		background: #555;
		color: #999;
		cursor: not-allowed;
	}
</style>