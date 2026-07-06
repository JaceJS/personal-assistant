import { DEFAULT_BACK_FALLBACK, resolveBackAction } from '../backNavigationUtils';

describe('resolveBackAction', () => {
  it('pops the stack whenever history exists', () => {
    expect(resolveBackAction(true)).toEqual({ type: 'back' });
    expect(resolveBackAction(true, '/(app)/accounts')).toEqual({ type: 'back' });
  });

  it('falls back to home when the stack is empty', () => {
    expect(resolveBackAction(false)).toEqual({ type: 'replace', href: DEFAULT_BACK_FALLBACK });
  });

  it('uses the custom fallback when the stack is empty', () => {
    expect(resolveBackAction(false, '/(app)/accounts')).toEqual({
      type: 'replace',
      href: '/(app)/accounts',
    });
  });
});
