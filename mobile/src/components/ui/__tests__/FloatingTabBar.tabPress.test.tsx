import { handleTabPress } from '../tabPressUtils';

describe('handleTabPress', () => {
  it('pops to root when switching to an unfocused tab that has child screens', () => {
    const navigate = jest.fn();
    const dispatch = jest.fn();
    // Bug: Settings → Categories, switch to Home, tap Settings → must land on Settings root
    handleTabPress({
      focused: false,
      routeName: 'settings',
      routeState: { key: 'settings-stack', index: 1 },
      navigate,
      dispatch,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POP_TO_TOP', target: 'settings-stack' })
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('pops to top when focused tab has sub-screens (index > 0)', () => {
    const navigate = jest.fn();
    const dispatch = jest.fn();
    handleTabPress({
      focused: true,
      routeName: 'settings',
      routeState: { key: 'settings-stack', index: 1 },
      navigate,
      dispatch,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POP_TO_TOP', target: 'settings-stack' })
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates normally when focused tab is already at root (index = 0)', () => {
    const navigate = jest.fn();
    const dispatch = jest.fn();
    handleTabPress({
      focused: true,
      routeName: 'settings',
      routeState: { key: 'settings-stack', index: 0 },
      navigate,
      dispatch,
    });
    expect(navigate).toHaveBeenCalledWith('settings');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('navigates when focused tab has no state (first render)', () => {
    const navigate = jest.fn();
    const dispatch = jest.fn();
    handleTabPress({
      focused: true,
      routeName: 'settings',
      routeState: undefined,
      navigate,
      dispatch,
    });
    expect(navigate).toHaveBeenCalledWith('settings');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
