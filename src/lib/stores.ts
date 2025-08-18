import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export interface Comment {
  id: string;
  userHash: string; // Anonymous hash like "Anonymous #a1b2c3d4"
  text: string;
  timestamp: number;
}

export interface Video {
  id: string;
  uploaderHash: string; // Anonymous hash like "Anonymous #e5f6g7h8"
  title: string;
  url: string;
  thumbnailUrl?: string; // Optional thumbnail URL for video preview
  tags: string[];
  timestamp: number;
  comments: Comment[];
}

// Using persistent storage for videos (localStorage)
export const videos = persistentAtom<Video[]>('videos', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// Regular atoms for UI state
export const selectedTags = atom<string[]>([]);
export const searchQuery = atom<string>('');
export const selectedVideo = atom<Video | null>(null);
export const showUploadModal = atom<boolean>(false);

// Computed values and actions
export function addVideo(video: Video) {
  videos.set([video, ...videos.get()]);
}

export function addComment(videoId: string, comment: Comment) {
  const currentVideos = videos.get();
  const updatedVideos = currentVideos.map(video => {
    if (video.id === videoId) {
      return {
        ...video,
        comments: [...video.comments, comment]
      };
    }
    return video;
  });
  videos.set(updatedVideos);
}

export function clearFilters() {
  selectedTags.set([]);
  searchQuery.set('');
}

export function toggleTag(tag: string) {
  const currentTags = selectedTags.get();
  if (currentTags.includes(tag)) {
    selectedTags.set(currentTags.filter(t => t !== tag));
  } else {
    selectedTags.set([...currentTags, tag]);
  }
}