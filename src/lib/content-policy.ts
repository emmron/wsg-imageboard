// Content Policy & Moderation Rules for FanConnect
// Defines what content is allowed, restricted, and prohibited

export type ViolationType =
  | 'prohibited_content'
  | 'copyright_infringement'
  | 'non_consensual'
  | 'illegal_content'
  | 'harassment'
  | 'spam'
  | 'impersonation'
  | 'misleading'
  | 'underage'
  | 'doxxing';

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed' | 'under_review';

export type ReportReason =
  | 'non_consensual_content'
  | 'underage_content'
  | 'copyright_violation'
  | 'harassment_or_bullying'
  | 'spam_or_scam'
  | 'impersonation'
  | 'illegal_activity'
  | 'doxxing_personal_info'
  | 'misleading_content'
  | 'other';

export interface ContentReport {
  post_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string;
}

// ── Prohibited keywords that BLOCK content (hard reject) ──
export const BLOCKED_KEYWORDS = [
  // Non-consensual / revenge content
  'revenge porn', 'leaked nudes', 'stolen nudes', 'ex girlfriend', 'ex boyfriend',
  'hidden camera', 'spy cam', 'creepshot', 'upskirt', 'voyeur',
  // Minors - zero tolerance
  'underage', 'minor', 'child porn', 'cp ', 'jailbait', 'preteen', 'loli', 'shota',
  // Non-consent
  'non-consensual', 'nonconsensual', 'without consent', 'forced',
  // Exploitation
  'trafficking', 'exploit', 'blackmail', 'sextortion',
  // Doxxing
  'doxx', 'dox ', 'home address', 'phone number',
];

// ── Warning keywords that FLAG for review (soft warning) ──
export const WARNING_KEYWORDS = [
  'leak', 'leaked', 'stolen', 'hacked',
  'private', 'personal', 'secret', 'exposed',
  'real name', 'found her', 'found his',
];

// ── Filename patterns that should be rejected ──
export const BLOCKED_FILENAME_PATTERNS = [
  /(?:leaked?|stolen|hack(?:ed)?|revenge|creep(?:shot)?|spy|hidden)/i,
  /(?:underage|minor|child|jailbait|preteen)/i,
  /(?:non.?consensual|without.?consent)/i,
];

// ── Content rules that are shown to users ──
export const CONTENT_RULES = {
  allowed: [
    'Original content you created or have rights to share',
    'Content where all participants are 18+ and gave explicit consent',
    'Licensed or royalty-free media with proper attribution',
    'Educational, artistic, or entertainment content',
    'Behind-the-scenes, tutorials, and commentary',
  ],
  prohibited: [
    'Content involving anyone under 18 in any context',
    'Non-consensual intimate content (revenge porn)',
    'Content obtained without the knowledge or consent of participants',
    'Copyrighted material you do not own or have license to use',
    'Hidden camera, spy cam, or voyeuristic content',
    'Content that promotes violence, harassment, or discrimination',
    'Doxxing or sharing private personal information',
    'Spam, scams, or misleading content',
    'Impersonation of other creators or public figures',
    'Content depicting illegal activities',
  ],
  creatorResponsibilities: [
    'Verify all participants are 18+ and have given written consent',
    'Maintain records of consent for all featured individuals',
    'Respond promptly to takedown requests from participants',
    'Accurately describe and tag your content',
    'Do not mislead subscribers about what content they will receive',
    'Respect copyright and intellectual property rights',
  ],
} as const;

// ── Validation functions ──

export interface ContentCheckResult {
  allowed: boolean;
  blocked: boolean;
  warnings: string[];
  violations: ViolationType[];
  blockedTerms: string[];
}

/**
 * Check text content against policy rules.
 * Returns blocked=true if content must be rejected.
 */
export function checkContent(text: string): ContentCheckResult {
  const lower = text.toLowerCase();
  const warnings: string[] = [];
  const violations: ViolationType[] = [];
  const blockedTerms: string[] = [];

  // Check hard blocks
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      blockedTerms.push(keyword);
    }
  }

  if (blockedTerms.length > 0) {
    // Categorize the violation
    if (blockedTerms.some(t => /underage|minor|child|jailbait|preteen|loli|shota|cp /.test(t))) {
      violations.push('underage');
    }
    if (blockedTerms.some(t => /revenge|leaked|stolen|spy|creep|voyeur|hidden|upskirt/.test(t))) {
      violations.push('non_consensual');
    }
    if (blockedTerms.some(t => /non.?consensual|without.?consent|forced/.test(t))) {
      violations.push('non_consensual');
    }
    if (blockedTerms.some(t => /trafficking|exploit|blackmail|sextortion/.test(t))) {
      violations.push('illegal_content');
    }
    if (blockedTerms.some(t => /doxx?|home address|phone number/.test(t))) {
      violations.push('doxxing');
    }

    return {
      allowed: false,
      blocked: true,
      warnings: ['Content violates community guidelines and cannot be posted.'],
      violations: [...new Set(violations)],
      blockedTerms,
    };
  }

  // Check soft warnings
  for (const keyword of WARNING_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      warnings.push(`Content contains "${keyword}" — please ensure this content complies with our guidelines.`);
    }
  }

  return {
    allowed: true,
    blocked: false,
    warnings,
    violations: [],
    blockedTerms: [],
  };
}

/**
 * Check a filename against policy rules.
 */
export function checkFilename(filename: string): ContentCheckResult {
  for (const pattern of BLOCKED_FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      return {
        allowed: false,
        blocked: true,
        warnings: ['Filename suggests prohibited content. Please rename your file and ensure it complies with our content policy.'],
        violations: ['prohibited_content'],
        blockedTerms: [filename],
      };
    }
  }
  return { allowed: true, blocked: false, warnings: [], violations: [], blockedTerms: [] };
}

/**
 * Full content validation for uploads - checks title, tags, and filename.
 */
export function validateUploadContent(title: string, tags: string, filename: string): ContentCheckResult {
  const titleCheck = checkContent(title);
  if (titleCheck.blocked) return titleCheck;

  const tagCheck = checkContent(tags);
  if (tagCheck.blocked) return tagCheck;

  const filenameCheck = checkFilename(filename);
  if (filenameCheck.blocked) return filenameCheck;

  // Merge warnings
  const warnings = [...titleCheck.warnings, ...tagCheck.warnings, ...filenameCheck.warnings];
  return {
    allowed: true,
    blocked: false,
    warnings,
    violations: [],
    blockedTerms: [],
  };
}

/**
 * Report reasons with human-readable labels
 */
export const REPORT_REASONS: Record<ReportReason, string> = {
  non_consensual_content: 'Non-consensual or revenge content',
  underage_content: 'Involves or appears to involve a minor',
  copyright_violation: 'Copyright or intellectual property violation',
  harassment_or_bullying: 'Harassment, bullying, or threats',
  spam_or_scam: 'Spam, scam, or misleading content',
  impersonation: 'Impersonation of another person',
  illegal_activity: 'Depicts illegal activity',
  doxxing_personal_info: 'Sharing private/personal information (doxxing)',
  misleading_content: 'Misleading title, tags, or description',
  other: 'Other violation',
};
