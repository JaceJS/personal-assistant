import { Directory, File } from 'expo-file-system';

import { persistPickedImage } from '../persistPickedImage';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...parts: unknown[]) => ({
    uri: parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/'),
    copy: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    uri: 'file:///doc/receipts',
    exists: false,
    create: jest.fn(),
  })),
  Paths: { document: { uri: 'file:///doc' } },
}));

jest.mock('@/lib/utils', () => ({ generateId: () => 'fixed-id' }));

describe('persistPickedImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the receipts directory when it does not exist', () => {
    const dir = new Directory();
    (Directory as unknown as jest.Mock).mockImplementationOnce(() => dir);

    persistPickedImage('file:///cache/tmp123.jpg');

    expect(dir.create).toHaveBeenCalledWith({ intermediates: true });
  });

  it('skips creating the directory when it already exists', () => {
    const dir = new Directory();
    dir.exists = true;
    (Directory as unknown as jest.Mock).mockImplementationOnce(() => dir);

    persistPickedImage('file:///cache/tmp123.jpg');

    expect(dir.create).not.toHaveBeenCalled();
  });

  it('copies the source file into the persistent directory', () => {
    persistPickedImage('file:///cache/tmp123.jpg');

    const sourceFileInstance = (File as unknown as jest.Mock).mock.results[1].value;
    expect(sourceFileInstance.copy).toHaveBeenCalled();
  });

  it('keeps the source extension in the destination file name', () => {
    persistPickedImage('file:///cache/tmp123.png');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.png');
  });

  it('falls back to .jpg when the source has no extension', () => {
    persistPickedImage('file:///cache/tmp123');

    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.jpg');
  });

  it('returns the destination file uri, not the source uri', () => {
    const result = persistPickedImage('file:///cache/tmp123.jpg');
    expect(result).not.toBe('file:///cache/tmp123.jpg');
  });
});
