/** A photo by its URL: a file under `public/` (`/assets/...`) or a full Cloudinary delivery URL. */
export interface CongratulationPhoto {
  /** What the photo shows, for screen readers. */
  alt: string;
  kind: 'photo';
  src: string;
}

/** A YouTube video by its id or any link YouTube hands out (share, watch, Shorts). */
export interface CongratulationYoutube {
  kind: 'youtube';
  video: string;
}

/** A video uploaded to Cloudinary, by its full public id. */
export interface CongratulationCloudinaryVideo {
  kind: 'cloudinary';
  publicId: string;
}

export type CongratulationMedia =
  CongratulationCloudinaryVideo | CongratulationPhoto | CongratulationYoutube;

/** One friend's message to Santi, with an optional photo or video beside it. */
export interface Congratulation {
  /** Who sends it, as it should read. */
  from: string;
  /** Stable and unique among the messages. */
  id: string;
  media?: CongratulationMedia;
  /** The message as the friend wrote it; line breaks are kept. */
  message: string;
}
