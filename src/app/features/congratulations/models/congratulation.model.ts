import { Photo } from '@features/photo-posts/models/photo.model';

/** A photo uploaded to Cloudinary from the dashboard, delivered like the photos of the sets. */
export interface CongratulationPhoto {
  kind: 'photo';
  photo: Photo;
}

/** A YouTube video by its id. */
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

/** What the owner writes in the dashboard: who sends it, the words and an optional photo or video. */
export interface CongratulationDraft {
  /** Who sends it, as it should read. */
  from: string;
  media?: CongratulationMedia;
  /** The message as the friend wrote it; line breaks are kept. */
  message: string;
}

/** One friend's message to Santi, as saved in Firestore (`congratulations/{id}`). */
export interface Congratulation extends CongratulationDraft {
  /** When it was first saved, in milliseconds; messages are shown oldest first. */
  createdAt: number;
  id: string;
}

/** Limits the security rules enforce; the form checks them first. */
export const MAX_FROM_LENGTH = 80;
export const MAX_MESSAGE_LENGTH = 4000;
