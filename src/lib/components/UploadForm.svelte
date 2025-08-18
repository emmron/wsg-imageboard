<script>
	import { videos } from '$lib/stores.js';
	import { generateHash } from '$lib/utils.js';
	import { validateFile, validateTitle, validateTags, sanitizeText, getVideoMetadata } from '$lib/validation.js';
	import { ChunkedUploader, shouldUseChunkedUpload } from '$lib/chunked-upload.ts';
	import { fly, scale, fade } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	
	export let onUploadComplete = () => {};
	
	let title = '';
	let videoFile = null;
	let tags = '';
	let uploading = false;
	let dragOver = false;
	let fileInput;
	let validationErrors = [];
	let validationWarnings = [];
	let showGuidelines = false;
	let uploadProgress = 0;
	let dragCounter = 0;
	let filePreview = null;
	let successMessage = false;
	let uploadError = null;
	let currentUploader = null;
	
	function handleFileSelect(event) {
		const file = event.target.files[0];
		if (file) {
			uploadError = null; // Clear previous errors
			const validation = validateFile(file);
			if (validation.valid) {
				videoFile = file;
				createFilePreview(file);
				validateForm();
			} else {
				validationErrors = validation.errors;
				validationWarnings = validation.warnings;
			}
		}
	}
	
	async function createFilePreview(file) {
		if (file && file.type.startsWith('video/')) {
			// Get video metadata for better preview
			try {
				const metadata = await getVideoMetadata(file);
				
				filePreview = {
					name: file.name,
					size: formatFileSize(file.size),
					type: file.type,
					url: URL.createObjectURL(file),
					duration: metadata.duration,
					dimensions: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : null,
					canPlayInBrowser: metadata.canPlayInBrowser
				};
				
				// Add warning if video can't play in browser
				if (!metadata.canPlayInBrowser) {
					validationWarnings = [...validationWarnings, 'Video format may not play in all browsers. Will be converted for web compatibility.'];
				}
			} catch (error) {
				console.warn('Could not extract video metadata:', error);
				
				// Fallback to basic preview
				filePreview = {
					name: file.name,
					size: formatFileSize(file.size),
					type: file.type,
					url: URL.createObjectURL(file),
					canPlayInBrowser: false
				};
			}
		}
	}
	
	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
	
	function handleDragEnter(event) {
		event.preventDefault();
		dragCounter++;
		dragOver = true;
	}
	
	function handleDrop(event) {
		event.preventDefault();
		dragOver = false;
		dragCounter = 0;
		const file = event.dataTransfer.files[0];
		if (file) {
			uploadError = null; // Clear previous errors
			const validation = validateFile(file);
			if (validation.valid) {
				videoFile = file;
				createFilePreview(file);
				validateForm();
			} else {
				validationErrors = validation.errors;
				validationWarnings = validation.warnings;
			}
		}
	}
	
	function handleDragOver(event) {
		event.preventDefault();
		dragOver = true;
	}
	
	function handleDragLeave(event) {
		event.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			dragOver = false;
		}
	}
	
	function validateForm() {
		const errors = [];
		const warnings = [];
		
		// Validate title
		if (title.trim()) {
			const titleValidation = validateTitle(title);
			errors.push(...titleValidation.errors);
			warnings.push(...titleValidation.warnings);
		}
		
		// Validate tags
		if (tags.trim()) {
			const tagsValidation = validateTags(tags);
			errors.push(...tagsValidation.errors);
			warnings.push(...tagsValidation.warnings);
		}
		
		validationErrors = errors;
		validationWarnings = warnings;
	}
	
	async function uploadVideo() {
		if (!videoFile || !title.trim()) return;
		
		// Final validation
		const titleValidation = validateTitle(title);
		const tagsValidation = validateTags(tags);
		const fileValidation = validateFile(videoFile);
		
		if (!titleValidation.valid || !tagsValidation.valid || !fileValidation.valid) {
			validationErrors = [
				...titleValidation.errors,
				...tagsValidation.errors,
				...fileValidation.errors
			];
			return;
		}
		
		uploading = true;
		uploadError = null;
		uploadProgress = 0;
		
		try {
			// Use chunked uploader for actual server upload
			currentUploader = new ChunkedUploader({
				file: videoFile,
				onProgress: (progress) => {
					uploadProgress = progress;
				},
				onChunkComplete: (chunkIndex, totalChunks) => {
					if (process.env.NODE_ENV === 'development') {
						console.log(`Chunk ${chunkIndex + 1}/${totalChunks} completed`);
					}
				},
				onError: (error) => {
					uploadError = error.message;
					uploading = false;
				},
				metadata: {
					title: sanitizeText(title.trim()),
					tags: tagsValidation.cleanTags.join(', ')
				}
			});
			
			const result = await currentUploader.upload();
			
			if (result.success && result.fileUrl) {
				// Create video object with server response
				const newVideo = {
					id: result.videoId || generateHash(title),
					hash: result.videoId || generateHash(title),
					title: sanitizeText(title.trim()),
					url: result.fileUrl,
					tags: tagsValidation.cleanTags,
					timestamp: Date.now(),
					comments: [],
					needsConversion: result.needsConversion || false
				};
				
				// Add to store
				videos.update(currentVideos => [newVideo, ...currentVideos]);
				
				// Show success
				successMessage = true;
				setTimeout(() => successMessage = false, 5000);
				
				// Reset form
				title = '';
				tags = '';
				videoFile = null;
				filePreview = null;
				validationErrors = [];
				validationWarnings = [];
				
				onUploadComplete();
			} else {
				uploadError = result.message || 'Upload failed. Please try again.';
			}
			
		} catch (error) {
			console.error('Upload failed:', error);
			uploadError = error.message || 'Upload failed. Please try again.';
		} finally {
			uploading = false;
			currentUploader = null;
		}
	}
</script>

<div class="upload-form" in:fly={{ y: 20, duration: 300, easing: quintOut }}>
	<div 
		class="file-drop"
		class:drag-over={dragOver}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragenter={handleDragEnter}
		on:dragleave={handleDragLeave}
		role="button"
		tabindex="0"
		aria-label="Drop zone for video files"
	>
		{#if videoFile}
			<div class="file-selected" in:scale={{ duration: 200, easing: cubicOut }}>
				{#if filePreview}
					<div class="file-preview">
						{#if filePreview.canPlayInBrowser}
							<video src={filePreview.url} muted class="preview-video"></video>
						{:else}
							<div class="preview-placeholder">
								<div class="file-icon">🎥</div>
								<small>Preview not available</small>
							</div>
						{/if}
						<div class="file-info">
							<div class="file-name">✓ {filePreview.name}</div>
							<div class="file-details">
								{filePreview.size} • {filePreview.type}
								{#if filePreview.duration}
									• {Math.round(filePreview.duration)}s
								{/if}
								{#if filePreview.dimensions}
									• {filePreview.dimensions}
								{/if}
							</div>
							{#if !filePreview.canPlayInBrowser}
								<div class="format-warning">
									⚠ Will be converted for web compatibility
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<span>✓ {videoFile.name}</span>
				{/if}
				<button on:click={() => { videoFile = null; filePreview = null; }} class="remove-btn">
					Remove
				</button>
			</div>
		{:else}
			<div class="drop-zone" class:drag-active={dragOver}>
				{#if dragOver}
					<div class="drop-active" in:scale={{ duration: 150 }}>
						<div class="drop-icon active">⬇️</div>
						<p>Release to upload your video</p>
					</div>
				{:else}
					<div class="drop-idle">
						<div class="drop-icon">📁</div>
						<p>Drop video file here or click to select</p>
						<small>Supports all major video formats (MP4, AVI, MOV, WMV, FLV, WebM, MKV, etc.) • Max 2GB</small>
					</div>
				{/if}
				<input 
					type="file" 
					accept="video/*" 
					on:change={handleFileSelect}
					style="display: none;"
					bind:this={fileInput}
				/>
				<button on:click={() => fileInput.click()} class="choose-file-btn">
					Choose File
				</button>
			</div>
		{/if}
	</div>
	
	<div class="form-group">
		<label for="title">Title</label>
		<input 
			type="text" 
			id="title"
			bind:value={title}
			on:input={validateForm}
			placeholder="Enter video title..."
			required
		/>
	</div>
	
	<div class="form-group">
		<label for="tags">Tags</label>
		<input 
			type="text" 
			id="tags"
			bind:value={tags}
			on:input={validateForm}
			placeholder="tag1, tag2, tag3..."
		/>
		<small>Separate tags with commas</small>
	</div>
	
	{#if validationErrors.length > 0}
		<div class="validation-messages errors">
			{#each validationErrors as error}
				<div class="message error">⚠ {error}</div>
			{/each}
		</div>
	{/if}
	
	{#if validationWarnings.length > 0}
		<div class="validation-messages warnings">
			{#each validationWarnings as warning}
				<div class="message warning">⚠ {warning}</div>
			{/each}
			<button class="guidelines-btn" on:click={() => showGuidelines = !showGuidelines}>
				{showGuidelines ? 'Hide' : 'View'} Community Guidelines
			</button>
		</div>
	{/if}
	
	{#if showGuidelines}
		<div class="guidelines">
			<h4>Community Guidelines</h4>
			<ul>
				<li>Only upload content you own or have permission to share</li>
				<li>No leaked, stolen, or unauthorized content</li>
				<li>No content involving minors</li>
				<li>Respect privacy - no personal/private content without consent</li>
				<li>Keep titles and tags appropriate</li>
				<li>Max file size: 2GB</li>
			</ul>
		</div>
	{/if}
	
	{#if uploading}
		<div class="upload-progress" in:fly={{ y: 10, duration: 200 }}>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {uploadProgress}%"></div>
			</div>
			<p>Uploading... {Math.round(uploadProgress)}%</p>
			{#if shouldUseChunkedUpload(videoFile)}
				<small>Using optimized chunked upload for large file ({formatFileSize(videoFile.size)})</small>
			{:else}
				<small>Uploading {formatFileSize(videoFile.size)} file</small>
			{/if}
			{#if uploadProgress > 0 && uploadProgress < 100}
				<small class="upload-tip">💡 Tip: Keep this tab open to ensure upload completes successfully</small>
			{/if}
		</div>
	{/if}
	
	{#if uploadError}
		<div class="error-message" in:fly={{ y: 10, duration: 200 }}>
			⚠ {uploadError}
			<button class="retry-btn" on:click={() => uploadError = null}>Dismiss</button>
		</div>
	{/if}
	
	{#if successMessage}
		<div class="success-message" in:scale={{ duration: 300, easing: quintOut }}>
			✓ Video uploaded successfully!
		</div>
	{/if}
	
	<button 
		class="upload-btn"
		class:uploading
		on:click={uploadVideo}
		disabled={!videoFile || !title.trim() || uploading || validationErrors.length > 0}
	>
		{#if uploading}
			<div class="btn-spinner"></div>
			Uploading...
		{:else}
			Upload Video
		{/if}
	</button>
</div>

<style>
	.upload-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.file-drop {
		border: 2px dashed #555;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		position: relative;
		background: rgba(45, 45, 45, 0.3);
		backdrop-filter: blur(10px);
		overflow: hidden;
	}
	
	.file-drop::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			45deg,
			transparent 30%,
			rgba(74, 222, 128, 0.1) 50%,
			transparent 70%
		);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
		pointer-events: none;
	}
	
	.file-drop.drag-over {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.15);
		transform: scale(1.02);
		box-shadow: 
			0 8px 32px rgba(74, 222, 128, 0.2),
			0 0 0 1px rgba(74, 222, 128, 0.3);
	}
	
	.file-drop.drag-over::before {
		transform: translateX(100%);
	}
	
	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}
	
	.drop-idle {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	
	.drop-active {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: #4ade80;
	}
	
	.drop-icon {
		font-size: 3rem;
		opacity: 0.6;
		transition: all 0.3s ease;
	}
	
	.drop-icon.active {
		font-size: 4rem;
		opacity: 1;
		animation: bounce 0.6s ease infinite alternate;
	}
	
	@keyframes bounce {
		from { transform: translateY(0); }
		to { transform: translateY(-10px); }
	}
	
	.drop-zone p {
		margin: 0;
		color: #999;
	}
	
	.drop-zone small {
		color: #999;
		font-size: 0.8rem;
		margin-top: -0.5rem;
	}
	
	.choose-file-btn {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
		position: relative;
		overflow: hidden;
	}
	
	.choose-file-btn::before {
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
	
	.choose-file-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(74, 222, 128, 0.4);
	}
	
	.choose-file-btn:hover::before {
		left: 100%;
	}
	
	.file-selected {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.3);
		padding: 1.25rem;
		border-radius: 12px;
		backdrop-filter: blur(10px);
	}
	
	.file-preview {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}
	
	.preview-video {
		width: 60px;
		height: 45px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.preview-placeholder {
		width: 60px;
		height: 45px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	.file-icon {
		font-size: 1.5rem;
		opacity: 0.7;
	}
	
	.preview-placeholder small {
		font-size: 0.6rem;
		color: #999;
		text-align: center;
		margin-top: 2px;
	}
	
	.format-warning {
		color: #fbbf24;
		font-size: 0.75rem;
		margin-top: 2px;
		font-weight: 500;
	}
	
	.file-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.file-name {
		color: #4ade80;
		font-weight: 600;
		font-size: 0.95rem;
	}
	
	.file-details {
		color: #999;
		font-size: 0.8rem;
	}
	
	.file-selected span {
		color: #4ade80;
		font-weight: 500;
	}
	
	.remove-btn {
		background: rgba(220, 38, 38, 0.2);
		color: #dc2626;
		border: 1px solid rgba(220, 38, 38, 0.3);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}
	
	.remove-btn:hover {
		background: #dc2626;
		color: #fff;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-group label {
		color: #4ade80;
		font-weight: 500;
	}
	
	.form-group input {
		background: #404040;
		border: 1px solid #555;
		color: #fff;
		padding: 0.8rem;
		border-radius: 6px;
		font-size: 1rem;
	}
	
	.form-group input:focus {
		outline: none;
		border-color: #4ade80;
	}
	
	.form-group small {
		color: #999;
		font-size: 0.8rem;
	}
	
	.upload-progress {
		background: rgba(45, 45, 45, 0.8);
		border: 1px solid #555;
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		backdrop-filter: blur(10px);
	}
	
	.upload-tip {
		color: #fbbf24 !important;
		font-weight: 500;
		margin-top: 0.5rem;
		display: block;
	}
	
	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 1rem;
		position: relative;
	}
	
	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
		position: relative;
		overflow: hidden;
	}
	
	.progress-fill::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.3),
			transparent
		);
		animation: shimmer 1.5s infinite;
	}
	
	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}
	
	.success-message {
		background: rgba(74, 222, 128, 0.2);
		border: 1px solid rgba(74, 222, 128, 0.4);
		color: #4ade80;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		font-weight: 600;
		backdrop-filter: blur(10px);
	}
	
	.error-message {
		background: rgba(220, 38, 38, 0.2);
		border: 1px solid rgba(220, 38, 38, 0.4);
		color: #fca5a5;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		font-weight: 600;
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	
	.retry-btn {
		background: rgba(220, 38, 38, 0.3);
		color: #fca5a5;
		border: 1px solid rgba(220, 38, 38, 0.5);
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}
	
	.retry-btn:hover {
		background: rgba(220, 38, 38, 0.5);
		color: #fff;
	}
	
	.upload-btn {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		color: #000;
		border: none;
		padding: 1rem 2rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-size: 1rem;
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 16px rgba(74, 222, 128, 0.3);
	}
	
	.upload-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 32px rgba(74, 222, 128, 0.4);
	}
	
	.upload-btn:disabled {
		background: #555;
		color: #999;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
	
	.upload-btn.uploading {
		background: rgba(74, 222, 128, 0.3);
		color: #4ade80;
		pointer-events: none;
	}
	
	.btn-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	.validation-messages {
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	
	.validation-messages.errors {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid #dc2626;
	}
	
	.validation-messages.warnings {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid #f59e0b;
	}
	
	.message {
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}
	
	.message.error {
		color: #fca5a5;
	}
	
	.message.warning {
		color: #fbbf24;
	}
	
	.guidelines-btn {
		background: #f59e0b;
		color: #000;
		border: none;
		padding: 0.3rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		margin-top: 0.5rem;
	}
	
	.guidelines-btn:hover {
		background: #d97706;
	}
	
	.guidelines {
		background: #2d2d2d;
		border: 1px solid #555;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	
	.guidelines h4 {
		margin: 0 0 0.8rem 0;
		color: #4ade80;
	}
	
	.guidelines ul {
		margin: 0;
		padding-left: 1.2rem;
		color: #ccc;
	}
	
	.guidelines li {
		margin-bottom: 0.3rem;
		font-size: 0.9rem;
	}
</style>