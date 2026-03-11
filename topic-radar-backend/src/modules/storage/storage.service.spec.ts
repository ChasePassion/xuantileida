import { NotImplementedException } from '@nestjs/common';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  it('throws when requesting upload url because sdk is not implemented', async () => {
    await expect(
      service.getPresignedUploadUrl('user-1', 'demo.png', 'image/png'),
    ).rejects.toThrow(NotImplementedException);
  });

  it('throws when requesting download url because sdk is not implemented', async () => {
    await expect(service.getPresignedDownloadUrl('uploads/demo.png')).rejects.toThrow(
      NotImplementedException,
    );
  });
});
