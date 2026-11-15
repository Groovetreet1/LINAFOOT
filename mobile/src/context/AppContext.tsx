import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, apiRequest } from '@/lib/api';
import { deleteSessionItem, getSessionItem, setSessionItem } from '@/lib/session-storage';
import type {
  Bet,
  FootballMatch,
  LoginResult,
  SelectedOutcome,
  SelectionId,
  User,
  WalletTransaction,
} from '@/types';

const TOKEN_KEY = 'linafoot.session';
const USER_KEY = 'linafoot.user';

interface AuthResponse {
  token: string;
  user: User;
  balance: number;
}

interface AppContextValue {
  token: string | null;
  user: User | null;
  balance: number;
  matches: FootballMatch[];
  bets: Bet[];
  transactions: WalletTransaction[];
  selected: SelectedOutcome | null;
  isRestoring: boolean;
  isRefreshing: boolean;
  signIn: (displayName: string) => Promise<void>;
  login: (email: string, password: string, remember?: boolean) => Promise<LoginResult>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  verifyTwoFactorLogin: (challengeToken: string, code: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  selectOutcome: (match: FootballMatch, selectionId: SelectionId) => void;
  clearSelection: () => void;
  placeBet: (stake: number, idempotencyKey: string) => Promise<Bet>;
  updateProfile: (input: { displayName?: string; phone?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  startTwoFactorSetup: (password: string) => Promise<{ secret: string; otpauthUri: string }>;
  enableTwoFactor: (code: string) => Promise<void>;
  disableTwoFactor: (password: string) => Promise<void>;
  isBettableSelection: (selectionId: string) => selectionId is SelectionId;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [selected, setSelected] = useState<SelectedOutcome | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearLocalSession = useCallback(async () => {
    await Promise.all([
      deleteSessionItem(TOKEN_KEY).catch(() => undefined),
      deleteSessionItem(USER_KEY).catch(() => undefined),
    ]);
    setToken(null);
    setUser(null);
    setBalance(0);
    setMatches([]);
    setBets([]);
    setTransactions([]);
    setSelected(null);
  }, []);

  const persistUser = useCallback(async (nextUser: User) => {
    setUser(nextUser);
    try {
      const storedToken = await getSessionItem(TOKEN_KEY);
      if (storedToken) await setSessionItem(USER_KEY, JSON.stringify(nextUser));
    } catch {
      // Caching the profile locally is best-effort only.
    }
  }, []);

  const loadAccount = useCallback(async (sessionToken: string) => {
    const [walletResponse, betsResponse, profileResponse] = await Promise.all([
      apiRequest<{ balance: number; transactions: WalletTransaction[] }>('/wallet', {
        token: sessionToken,
      }),
      apiRequest<{ bets: Bet[] }>('/bets', { token: sessionToken }),
      apiRequest<{ user: User }>('/profile', { token: sessionToken }),
    ]);
    setBalance(walletResponse.balance);
    setTransactions(walletResponse.transactions);
    setBets(betsResponse.bets);
    await persistUser(profileResponse.user);
  }, [persistUser]);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const storedToken = await getSessionItem(TOKEN_KEY);
        if (storedToken) {
          await loadAccount(storedToken);
          if (active) setToken(storedToken);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearLocalSession();
        }
      } finally {
        if (active) setIsRestoring(false);
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, [clearLocalSession, loadAccount]);

  const applyAuth = useCallback(async (response: AuthResponse, remember = true) => {
    if (remember) {
      await Promise.all([
        setSessionItem(TOKEN_KEY, response.token),
        setSessionItem(USER_KEY, JSON.stringify(response.user)),
      ]);
    } else {
      // "Se souvenir de moi" unchecked: keep the session in memory only so the
      // next app launch starts logged out.
      await Promise.all([
        deleteSessionItem(TOKEN_KEY).catch(() => undefined),
        deleteSessionItem(USER_KEY).catch(() => undefined),
      ]);
    }
    setToken(response.token);
    setUser(response.user);
    setBalance(response.balance);
    setBets([]);
    setTransactions([]);
    setMatches([]);
    setSelected(null);
  }, []);

  const signIn = useCallback(async (displayName: string) => {
    const response = await apiRequest<AuthResponse>('/auth/demo', {
      method: 'POST',
      body: { displayName },
    });
    await applyAuth(response);
  }, [applyAuth]);

  const login = useCallback(async (email: string, password: string, remember = true): Promise<LoginResult> => {
    const response = await apiRequest<AuthResponse | { requiresTwoFactor: true; challengeToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if ('requiresTwoFactor' in response) {
      return { requiresTwoFactor: true, challengeToken: response.challengeToken };
    }
    await applyAuth(response, remember);
    return { requiresTwoFactor: false };
  }, [applyAuth]);

  const verifyTwoFactorLogin = useCallback(async (challengeToken: string, code: string, remember = true) => {
    const response = await apiRequest<AuthResponse>('/auth/login/2fa', {
      method: 'POST',
      body: { challengeToken, code },
    });
    await applyAuth(response, remember);
  }, [applyAuth]);

  const signup = useCallback(async (displayName: string, email: string, password: string) => {
    const response = await apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { displayName, email, password },
    });
    await applyAuth(response);
  }, [applyAuth]);

  const refreshData = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const [matchResponse] = await Promise.all([
        apiRequest<{ matches: FootballMatch[] }>('/matches?filter=all', { token }),
        loadAccount(token),
      ]);
      setMatches(matchResponse.matches);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await clearLocalSession();
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [clearLocalSession, loadAccount, token]);

  const selectOutcome = useCallback(
    (match: FootballMatch, selectionId: SelectionId) => {
      const selection = match.markets
        .find((market) => market.id === 'h2h')
        ?.selections.find((item) => item.id === selectionId);
      if (selection) setSelected({ match, selection });
    },
    [],
  );

  const placeBet = useCallback(
    async (stake: number, idempotencyKey: string) => {
      if (!token || !selected) throw new Error('Aucune sélection active.');
      const response = await apiRequest<{ bet: Bet; balance: number }>('/bets', {
        method: 'POST',
        token,
        body: {
          matchId: selected.match.id,
          selection: selected.selection.id,
          expectedOdds: selected.selection.odds,
          stake,
          idempotencyKey,
        },
      });
      setBalance(response.balance);
      setBets((current) => [response.bet, ...current.filter((bet) => bet.id !== response.bet.id)]);
      await loadAccount(token);
      setSelected(null);
      return response.bet;
    },
    [loadAccount, selected, token],
  );

  const isBettableSelection = (selectionId: string): selectionId is SelectionId =>
    selectionId === 'home' || selectionId === 'draw' || selectionId === 'away';

  const updateProfile = useCallback(async (input: { displayName?: string; phone?: string | null }) => {
    if (!token) throw new Error('Session expirée, reconnectez-vous.');
    const response = await apiRequest<{ user: User }>('/profile', {
      method: 'POST',
      token,
      body: input,
    });
    await persistUser(response.user);
  }, [persistUser, token]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error('Session expirée, reconnectez-vous.');
    await apiRequest<{ ok: boolean }>('/profile/password', {
      method: 'POST',
      token,
      body: { currentPassword, newPassword },
    });
  }, [token]);

  const startTwoFactorSetup = useCallback(async (password: string) => {
    if (!token) throw new Error('Session expirée, reconnectez-vous.');
    return apiRequest<{ secret: string; otpauthUri: string }>('/profile/2fa/setup', {
      method: 'POST',
      token,
      body: { password },
    });
  }, [token]);

  const enableTwoFactor = useCallback(async (code: string) => {
    if (!token) throw new Error('Session expirée, reconnectez-vous.');
    await apiRequest<{ twoFactorEnabled: boolean }>('/profile/2fa/enable', {
      method: 'POST',
      token,
      body: { code },
    });
    if (user) await persistUser({ ...user, twoFactorEnabled: true });
  }, [persistUser, token, user]);

  const disableTwoFactor = useCallback(async (password: string) => {
    if (!token) throw new Error('Session expirée, reconnectez-vous.');
    await apiRequest<{ twoFactorEnabled: boolean }>('/profile/2fa/disable', {
      method: 'POST',
      token,
      body: { password },
    });
    if (user) await persistUser({ ...user, twoFactorEnabled: false });
  }, [persistUser, token, user]);

  const value = useMemo<AppContextValue>(
    () => ({
      token,
      user,
      balance,
      matches,
      bets,
      transactions,
      selected,
      isRestoring,
      isRefreshing,
      signIn,
      login,
      signup,
      verifyTwoFactorLogin,
      logout: clearLocalSession,
      refreshData,
      selectOutcome,
      clearSelection: () => setSelected(null),
      placeBet,
      updateProfile,
      changePassword,
      startTwoFactorSetup,
      enableTwoFactor,
      disableTwoFactor,
      isBettableSelection,
    }),
    [
      token,
      user,
      balance,
      matches,
      bets,
      transactions,
      selected,
      isRestoring,
      isRefreshing,
      signIn,
      login,
      signup,
      verifyTwoFactorLogin,
      clearLocalSession,
      refreshData,
      selectOutcome,
      placeBet,
      updateProfile,
      changePassword,
      startTwoFactorSetup,
      enableTwoFactor,
      disableTwoFactor,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider.');
  return context;
}
