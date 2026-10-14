export const POST_TAGS = ['architecture', 'bw', 'night', 'sky', 'street'] as const;

export type PostTag = (typeof POST_TAGS)[number];
