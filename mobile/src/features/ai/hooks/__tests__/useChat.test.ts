// parseSseLines is extracted from streamChatMessage to make the
// non-trivial SSE buffer/parse logic independently testable.
import { parseSseLines } from '@/features/ai/utils/sseUtils';

describe('parseSseLines', () => {
  it('extracts tokens from complete SSE data lines', () => {
    const { tokens, done, rest } = parseSseLines('data: "Hello"\n\ndata: " world"\n\n');
    expect(tokens).toEqual(['Hello', ' world']);
    expect(done).toBe(false);
    expect(rest).toBe('');
  });

  it('buffers an incomplete last line until the next read', () => {
    const { tokens, rest } = parseSseLines('data: "Hello"\n\ndata: " wo');
    expect(tokens).toEqual(['Hello']);
    expect(rest).toBe('data: " wo');
  });

  it('detects [DONE] sentinel and stops parsing further lines', () => {
    const { tokens, done } = parseSseLines('data: "Hi"\n\ndata: [DONE]\n\ndata: "ignored"\n\n');
    expect(tokens).toEqual(['Hi']);
    expect(done).toBe(true);
  });

  it('skips non-data SSE lines (comments, event:, id:)', () => {
    const { tokens } = parseSseLines('event: message\ndata: "token"\n\n');
    expect(tokens).toEqual(['token']);
  });

  it('returns empty tokens and empty rest for an empty buffer', () => {
    const { tokens, done, rest } = parseSseLines('');
    expect(tokens).toEqual([]);
    expect(done).toBe(false);
    expect(rest).toBe('');
  });

  it('handles tokens containing special characters', () => {
    const { tokens } = parseSseLines('data: "line\\nbreak"\n\n');
    expect(tokens).toEqual(['line\nbreak']);
  });
});
