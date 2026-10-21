/** Every YouTube video id is 11 characters from this alphabet. */
const VIDEO_ID = /^[\w-]{11}$/;

/** Paths that carry the id as their second segment: `/embed/<id>`, `/shorts/<id>`, `/live/<id>`. */
const ID_PATH = /^\/(?:embed|shorts|live)\/([^/]+)/;

/**
 * The id of a YouTube video, from a bare id or any link YouTube hands out (share, watch, Shorts, embed),
 * so a link can be pasted as it is. Null when the value is not a YouTube video.
 */
export function youtubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (VIDEO_ID.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(?:www|m)\./, '');
  let candidate: string | null = null;
  if (host === 'youtu.be') candidate = url.pathname.split('/')[1] ?? null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    candidate = url.searchParams.get('v') ?? ID_PATH.exec(url.pathname)?.[1] ?? null;
  }

  return candidate !== null && VIDEO_ID.test(candidate) ? candidate : null;
}

/** The thumbnail every video has (480x360), shown until the player is asked for. */
export function youtubePoster(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * The privacy-enhanced player, which sets no cookies until it plays. It is only created after a press,
 * so it starts playing at once.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
}
