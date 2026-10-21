import { youtubeEmbedUrl, youtubePoster, youtubeVideoId } from './youtube';

describe('youtubeVideoId', () => {
  it.each([
    ['dQw4w9WgXcQ', 'a bare id'],
    ['https://youtu.be/dQw4w9WgXcQ', 'a short link'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc&t=12', 'a short link with sharing parameters'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'a watch link'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1', 'a mobile watch link'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'a Shorts link'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'an embed link'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'a privacy-enhanced embed link'],
    ['  https://youtu.be/dQw4w9WgXcQ  ', 'a link with spaces around it'],
  ])('should read the id from %s (%s)', (value) => {
    expect(youtubeVideoId(value)).toBe('dQw4w9WgXcQ');
  });

  it.each([
    ['', 'nothing'],
    ['not a video', 'plain text'],
    ['https://vimeo.com/123456789', 'another video site'],
    ['https://www.youtube.com/watch?v=short', 'an id of the wrong length'],
    ['https://www.youtube.com/@channel', 'a channel page'],
  ])('should return null for %s (%s)', (value) => {
    expect(youtubeVideoId(value)).toBeNull();
  });
});

describe('youtubePoster', () => {
  it('should point at the thumbnail every video has, served by YouTube', () => {
    expect(youtubePoster('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

describe('youtubeEmbedUrl', () => {
  it('should use the privacy-enhanced player and start playing, since it only loads after a press', () => {
    const url = new URL(youtubeEmbedUrl('dQw4w9WgXcQ'));

    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/dQw4w9WgXcQ');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
    expect(url.searchParams.get('playsinline')).toBe('1');
  });
});
