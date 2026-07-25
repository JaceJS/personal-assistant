import { File } from 'expo-file-system';

import { persistRecordedAudio } from '../persistRecordedAudio';

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...parts: unknown[]) => ({
    uri: parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/'),
    copy: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    uri: 'file:///doc/audio',
    exists: false,
    create: jest.fn(),
    delete: jest.fn(),
  })),
  Paths: { document: { uri: 'file:///doc' } },
}));

jest.mock('@/lib/utils', () => ({ generateId: () => 'fixed-id' }));

describe('persistRecordedAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the source extension in the destination file name', () => {
    persistRecordedAudio('file:///cache/recording-123.m4a');
    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.m4a');
  });

  it('falls back to .m4a when the source has no extension', () => {
    persistRecordedAudio('file:///cache/recording-123');
    expect(File).toHaveBeenCalledWith(expect.anything(), 'fixed-id.m4a');
  });

  it('returns the destination file uri, not the source uri', () => {
    const result = persistRecordedAudio('file:///cache/recording-123.m4a');
    expect(result).not.toBe('file:///cache/recording-123.m4a');
  });
});
