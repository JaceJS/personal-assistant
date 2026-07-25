import { Directory, File } from 'expo-file-system';

import { clearPersistedMedia, persistToAppStorage } from '../persistToAppStorage';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...parts: unknown[]) => ({
    uri: parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/'),
    copy: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    uri: 'file:///doc/receipts',
    exists: false,
    create: jest.fn(),
    delete: jest.fn(),
  })),
  Paths: { document: { uri: 'file:///doc' } },
}));

jest.mock('@/lib/utils', () => ({ generateId: () => 'fixed-id' }));

describe('persistToAppStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the target subdirectory when it does not exist', () => {
    const dir = new Directory();
    (Directory as unknown as jest.Mock).mockImplementationOnce(() => dir);

    persistToAppStorage('file:///cache/tmp123.jpg', 'receipts', '.jpg');

    expect(dir.create).toHaveBeenCalledWith({ intermediates: true });
  });

  it('skips creating the subdirectory when it already exists', () => {
    const dir = new Directory();
    dir.exists = true;
    (Directory as unknown as jest.Mock).mockImplementationOnce(() => dir);

    persistToAppStorage('file:///cache/tmp123.jpg', 'receipts', '.jpg');

    expect(dir.create).not.toHaveBeenCalled();
  });

  it('copies the source file into the target subdirectory', () => {
    persistToAppStorage('file:///cache/tmp123.jpg', 'audio', '.m4a');

    const sourceFileInstance = (File as unknown as jest.Mock).mock.results[1].value;
    expect(sourceFileInstance.copy).toHaveBeenCalled();
  });

  it('keeps the source extension in the destination file name', () => {
    persistToAppStorage('file:///cache/tmp123.png', 'receipts', '.jpg');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.png');
  });

  it('falls back to the given default extension when the source has none', () => {
    persistToAppStorage('file:///cache/tmp123', 'audio', '.m4a');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.m4a');
  });

  it('returns the destination file uri, not the source uri', () => {
    const result = persistToAppStorage('file:///cache/tmp123.jpg', 'receipts', '.jpg');
    expect(result).not.toBe('file:///cache/tmp123.jpg');
  });
});

describe('clearPersistedMedia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the receipts and audio directories when they exist', () => {
    const receiptsDir = { exists: true, delete: jest.fn(), create: jest.fn() };
    const audioDir = { exists: true, delete: jest.fn(), create: jest.fn() };
    (Directory as unknown as jest.Mock)
      .mockImplementationOnce(() => receiptsDir)
      .mockImplementationOnce(() => audioDir);

    clearPersistedMedia();

    expect(receiptsDir.delete).toHaveBeenCalled();
    expect(audioDir.delete).toHaveBeenCalled();
  });

  it('skips deleting a directory that does not exist', () => {
    const dir = { exists: false, delete: jest.fn(), create: jest.fn() };
    (Directory as unknown as jest.Mock).mockImplementation(() => dir);

    clearPersistedMedia();

    expect(dir.delete).not.toHaveBeenCalled();
  });
});
