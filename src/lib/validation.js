// Client-side validation helpers
export const VALIDATION_RULES = {
	maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
	maxTitleLength: 100,
	maxTagLength: 30,
	maxTags: 10,
	maxCommentLength: 1000,
	allowedVideoTypes: [
		'video/mp4',
		'video/webm',
		'video/ogg',
		'video/avi',
		'video/mov',
		'video/wmv'
	],
	bannedKeywords: [
		// Add problematic terms that should trigger warnings
		'leak', 'leaked', 'stolen', 'hacked', 'revenge',
		'underage', 'minor', 'child', 'kid',
		'private', 'personal', 'secret'
	]
};

export function validateFile(file) {
	const errors = [];
	
	if (!file) {
		errors.push('No file selected');
		return { valid: false, errors };
	}
	
	// File size check
	if (file.size > VALIDATION_RULES.maxFileSize) {
		errors.push(`File too large. Max size: ${Math.round(VALIDATION_RULES.maxFileSize / 1024 / 1024 / 1024)}GB`);
	}
	
	// File type check
	if (!VALIDATION_RULES.allowedVideoTypes.includes(file.type)) {
		errors.push('Invalid file type. Only video files allowed.');
	}
	
	// Filename check for suspicious content
	const suspiciousPatterns = /(?:leak|stolen|hack|revenge|private|personal)/i;
	if (suspiciousPatterns.test(file.name)) {
		errors.push('Filename contains inappropriate content');
	}
	
	return {
		valid: errors.length === 0,
		errors,
		warnings: []
	};
}

export function validateTitle(title) {
	const errors = [];
	const warnings = [];
	
	if (!title || title.trim().length === 0) {
		errors.push('Title is required');
		return { valid: false, errors, warnings };
	}
	
	if (title.length > VALIDATION_RULES.maxTitleLength) {
		errors.push(`Title too long. Max ${VALIDATION_RULES.maxTitleLength} characters.`);
	}
	
	// Check for banned keywords
	const lowerTitle = title.toLowerCase();
	const foundKeywords = VALIDATION_RULES.bannedKeywords.filter(keyword => 
		lowerTitle.includes(keyword.toLowerCase())
	);
	
	if (foundKeywords.length > 0) {
		warnings.push('Title may contain inappropriate content. Please review community guidelines.');
	}
	
	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

export function validateTags(tagsString) {
	const errors = [];
	const warnings = [];
	
	if (!tagsString || tagsString.trim().length === 0) {
		return { valid: true, errors: [], warnings: [], cleanTags: [] };
	}
	
	const tags = tagsString.split(',')
		.map(tag => tag.trim())
		.filter(tag => tag.length > 0);
	
	if (tags.length > VALIDATION_RULES.maxTags) {
		errors.push(`Too many tags. Max ${VALIDATION_RULES.maxTags} allowed.`);
	}
	
	const longTags = tags.filter(tag => tag.length > VALIDATION_RULES.maxTagLength);
	if (longTags.length > 0) {
		errors.push(`Tags too long. Max ${VALIDATION_RULES.maxTagLength} characters per tag.`);
	}
	
	// Check tags for inappropriate content
	const problematicTags = tags.filter(tag => {
		const lowerTag = tag.toLowerCase();
		return VALIDATION_RULES.bannedKeywords.some(keyword => 
			lowerTag.includes(keyword.toLowerCase())
		);
	});
	
	if (problematicTags.length > 0) {
		warnings.push('Some tags may be inappropriate. Consider reviewing them.');
	}
	
	// Clean tags (basic sanitization)
	const cleanTags = tags
		.map(tag => tag.replace(/[<>]/g, '')) // Remove potential HTML
		.filter(tag => tag.length > 0);
	
	return {
		valid: errors.length === 0,
		errors,
		warnings,
		cleanTags
	};
}

export function validateComment(text) {
	const errors = [];
	const warnings = [];
	
	if (!text || text.trim().length === 0) {
		errors.push('Comment cannot be empty');
		return { valid: false, errors, warnings };
	}
	
	if (text.length > VALIDATION_RULES.maxCommentLength) {
		errors.push(`Comment too long. Max ${VALIDATION_RULES.maxCommentLength} characters.`);
	}
	
	// Check for problematic content
	const lowerText = text.toLowerCase();
	const foundKeywords = VALIDATION_RULES.bannedKeywords.filter(keyword => 
		lowerText.includes(keyword.toLowerCase())
	);
	
	if (foundKeywords.length > 0) {
		warnings.push('Comment may contain inappropriate content.');
	}
	
	// Basic spam detection
	const repeatedChars = /(.)\1{10,}/; // 10+ repeated characters
	const capsLock = /[A-Z]{20,}/; // 20+ consecutive caps
	
	if (repeatedChars.test(text) || capsLock.test(text)) {
		warnings.push('Comment appears to be spam-like.');
	}
	
	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

export function sanitizeText(text) {
	return text
		.replace(/[<>]/g, '') // Remove potential HTML
		.replace(/javascript:/gi, '') // Remove javascript protocols
		.trim();
}