import { handleTabPress } from '../tabPressUtils';

describe('handleTabPress', () => {
  it('navigates to tab when not currently focused', () => {
    const navigate = jest.fn();
    const dispatch = jest.fn();
    handleTabPress({
      focused: false,
      routeName: 'settings',
      routeState: { key: 'settings-stack', index: 1 },
      navigate,
      dispatch,
    });
    expect(navigate).toHaveBeenCalledWith('settings');
    expect(dispatch).not.toHaveBeenCalled();
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
