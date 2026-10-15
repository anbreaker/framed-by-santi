export interface Photo {
  alt: string;
  /** Optional note about this photo, written by the author in the dashboard. */
  description?: string;
  height: number;
  /** Storage key without extension, for example `post-1/03`. Later the Cloudinary public id. */
  id: string;
  /** Optional short title for this photo. */
  title?: string;
  width: number;
}
