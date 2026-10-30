//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// The leaderboard talks to the Rayfin backend; keep the smoke test offline.
vi.mock('@/lib/rayfin-client', () => ({
  getRayfinClient: () => new Promise(() => {}),
}));

import App from '@/App';
import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

const auth: AuthContextValue = {
  session: {
    user: { id: 'user-1', email: 'ada@contoso.com' },
    isAuthenticated: true,
    isAnonymous: false,
  },
  isAuthenticated: true,
  isLoading: false,
  canSignIn: true,
  signIn: async () => {},
  isSigningIn: false,
  signInError: null,
  config: { kind: 'ready' },
  error: null,
};

const renderApp = () =>
  render(
    <AuthContext.Provider value={auth}>
      <App />
    </AuthContext.Provider>
  );

describe('App', () => {
  it('lists every cabinet in the lobby', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Pick a cabinet' })).toBeVisible();
    for (const title of ['Bolt Rush', 'Steel Raid', 'Bug Invasion', 'Snake', 'Duel Cup', 'Game Boy Advance', 'PlayStation']) {
      expect(screen.getByRole('heading', { name: title })).toBeVisible();
    }
  });

  it('opens a game and returns to the lobby', async () => {
    renderApp();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Snake/ })));
    expect(screen.getByLabelText('Snake game board')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading leaderboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All games' }));
    expect(screen.getByRole('heading', { name: 'Pick a cabinet' })).toBeVisible();
  });

  it('opens the emulator and waits for a game file', async () => {
    renderApp();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /PlayStation/ })));
    expect(screen.getByText('Insert a cartridge')).toBeVisible();
    expect(screen.getByLabelText('Choose a game file')).toHaveAttribute('type', 'file');
    fireEvent.click(screen.getByRole('button', { name: 'All games' }));
    expect(screen.getByRole('heading', { name: 'Pick a cabinet' })).toBeVisible();
  });

  it('shows no leaderboard for the two-player game', async () => {
    renderApp();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Duel Cup/ })));
    expect(screen.getByText(/bragging rights/)).toBeVisible();
  });
});
