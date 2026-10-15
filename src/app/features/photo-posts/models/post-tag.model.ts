export const POST_TAGS = ['architecture', 'bw', 'night', 'sky', 'street'] as const;

export type PostTag = (typeof POST_TAGS)[number];

/** Narrows untrusted values, such as a query parameter, to a known tag. */
export function isPostTag(value: string | null | undefined): value is PostTag {
  return POST_TAGS.some((tag) => tag === value);
}
