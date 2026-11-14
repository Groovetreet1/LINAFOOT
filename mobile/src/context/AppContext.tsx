import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, apiRequest } from '@/lib/api';
import { deleteSessionItem, getSessionItem, setSessionItem } from '@/lib/session-storage';
import type {
  Bet,
  FootballMatch,
  SelectedOutcome,
  SelectionId,
  User,
  WalletTransaction,
} from '@/types';

const TOKEN_KEY = 'linafoot.session';
const USER_KEY = 'linafoot.demo-user';

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
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  selectOutcome: (match: FootballMatch, selectionId: SelectionId) => void;
  clearSelection: () => void;
  placeBet: (stake: number, idempotencyKey: string) => Promise<Bet>;
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

  const loadAccount = useCallback(async (sessionToken: string) => {
    const [walletResponse, betsResponse] = await Promise.all([
      apiRequest<{ balance: number; transactions: WalletTransaction[] }>('/wallet', {
        token: sessionToken,
      }),
      apiRequest<{ bets: Bet[] }>('/bets', { token: sessionToken }),
    ]);
    setBalance(walletResponse.balance);
    setTransactions(walletResponse.transactions);
    setBets(betsResponse.bets);
  }, []);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getSessionItem(TOKEN_KEY),
          getSessionItem(USER_KEY),
        ]);
        if (storedToken) {
          await loadAccount(storedToken);
          if (active) {
            setToken(storedToken);
            if (storedUser) setUser(JSON.parse(storedUser) as User);
          }
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

  const signIn = useCallback(async (displayName: string) => {
    const response = await apiRequest<{ token: string; user: User; balance: number }>('/auth/demo', {
      method: 'POST',
      body: { displayName },
    });
    await Promise.all([
      setSessionItem(TOKEN_KEY, response.token),
      setSessionItem(USER_KEY, JSON.stringify(response.user)),
    ]);
    setToken(response.token);
    setUser(response.user);
    setBalance(response.balance);
    setBets([]);
    setTransactions([]);
    setMatches([]);
  }, []);

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
      logout: clearLocalSession,
      refreshData,
      selectOutcome,
      clearSelection: () => setSelected(null),
      placeBet,
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
      clearLocalSession,
      refreshData,
      selectOutcome,
      placeBet,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp doit être utilisé dans AppProvider.');
  return context;
}
