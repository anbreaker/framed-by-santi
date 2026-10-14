export interface Photo {
  alt: string;
  height: number;
  /** Storage key without extension, for example `post-1/03`. Later the Cloudinary public id. */
  id: string;
  width: number;
}
