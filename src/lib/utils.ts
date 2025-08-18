// Using built-in crypto for browser compatibility

export function generateHash(input: string = ''): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  const combined = input + timestamp + random;
  // Simple hash function for browser compatibility
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

export function generateAnonymousHash(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Anonymous #${result}`;
}

export function getAnonymousHashColor(hash: string): string {
  // Generate a consistent color based on hash
  let hashNum = 0;
  for (let i = 0; i < hash.length; i++) {
    hashNum = hash.charCodeAt(i) + ((hashNum << 5) - hashNum);
  }
  
  // Generate pastel colors for better readability
  const hue = Math.abs(hashNum) % 360;
  return `hsl(${hue}, 70%, 80%)`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}