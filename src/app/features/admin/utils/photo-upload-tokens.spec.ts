import { PhotoUploadError } from '../services/photo-upload.service';
import { uploadErrorKey } from './photo-upload-tokens';
import { PhotoRejectedError } from './prepare-photo';

describe('uploadErrorKey', () => {
  it('should explain why a photo was rejected or could not upload', () => {
    expect(uploadErrorKey(new PhotoRejectedError('too-large'))).toBe(
      'admin.upload.errors.tooLarge'
    );
    expect(uploadErrorKey(new PhotoUploadError('not-allowed'))).toBe(
      'admin.upload.errors.notAllowed'
    );
  });

  it('should call anything unexpected a failed upload', () => {
    expect(uploadErrorKey(new Error('boom'))).toBe('admin.upload.errors.uploadFailed');
  });
});
