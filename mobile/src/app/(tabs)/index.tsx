import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { MatchCard } from '@/components/MatchCard';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import type { FootballMatch, Selection } from '@/types';

type Filter = 'ALL' | 'LIVE' | 'UPCOMING';

const filters: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tous' },
  { id: 'LIVE', label: 'En direct' },
  { id: 'UPCOMING', label: 'À venir' },
];

export default function MatchesScreen() {
  const { token, balance, matches, isRefreshing, refreshData, selectOutcome } = useApp();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [error, setError] = useState('');
  const initialLoadDone = useRef(false);

  async function refresh() {
    setError('');
    try {
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les matchs.');
    }
  }

  useEffect(() => {
    if (!token || initialLoadDone.current) return;
    initialLoadDone.current = true;
    refreshData().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les matchs.');
    });
  }, [token, refreshData]);

  const visibleMatches = useMemo(
    () => matches.filter((match) => filter === 'ALL' || match.status === filter),
    [filter, matches],
  );
  const liveMatches = useMemo(() => matches.filter((match) => match.status === 'LIVE'), [matches]);
  const liveCount = liveMatches.length;

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshData().catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshData]);

  function openSelection(match: FootballMatch, selection: Selection) {
    if (selection.id === 'home' || selection.id === 'draw' || selection.id === 'away') {
      selectOutcome(match, selection.id);
      router.push('/bet-slip');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader balance={balance} />
      <FlatList
        data={visibleMatches}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => <MatchCard match={item} onSelect={openSelection} onOpen={(m) => router.push(`/match/${m.id}` as never)} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
        ListHeaderComponent={
          <View>
            {liveMatches.length > 0 ? (
              <View style={styles.liveBarSection}>
                <View style={styles.liveBarHeader}>
                  <View style={styles.liveBarTitleRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveBarTitle}>Matchs en direct</Text>
                  </View>
                  <Text style={styles.liveBarHint}>Glisse →</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveBarContent}>
                  {liveMatches.map((match) => (
                    <Pressable key={match.id} style={styles.liveChip} onPress={() => router.push(`/match/${match.id}` as never)}>
                      <View style={styles.liveChipTop}>
                        <Text style={styles.liveChipLeague} numberOfLines={1}>{match.league}</Text>
                        <View style={styles.liveChipBadge}><View style={styles.liveChipDot} /><Text style={styles.liveChipMinute}>{match.displayMinute ?? `${match.minute ?? 0}'`}</Text></View>
                      </View>
                      <View style={styles.liveChipRow}>
                        <TeamLogo uri={match.homeTeamLogo} name={match.homeTeam} size={22} />
                        <Text style={styles.liveChipTeam} numberOfLines={1}>{match.homeTeam}</Text>
                        <Text style={styles.liveChipScore}>{match.homeScore}</Text>
                      </View>
                      <View style={styles.liveChipRow}>
                        <TeamLogo uri={match.awayTeamLogo} name={match.awayTeam} size={22} />
                        <Text style={styles.liveChipTeam} numberOfLines={1}>{match.awayTeam}</Text>
                        <Text style={styles.liveChipScore}>{match.awayScore}</Text>
                      </View>
                      <Text style={styles.liveChipInfo} numberOfLines={2}>{match.info ?? 'En direct'}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.eyebrow}>LINAFOOT · MARCHÉS LIVE</Text>
                <Text style={styles.title}>Choisissez votre match.</Text>
              </View>
              <View style={styles.liveSummary}>
                <View style={styles.liveDot} />
                <Text style={styles.liveSummaryText}>{liveCount} live</Text>
              </View>
            </View>
            <View style={styles.filters}>
              {filters.map((item) => (
                <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[styles.filter, filter === item.id && styles.filterActive]}>
                  {item.id === 'LIVE' && <View style={[styles.filterDot, filter === item.id && styles.filterDotActive]} />}
                  <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            {error ? (
              <Pressable style={styles.errorBox} onPress={refresh}>
                <Ionicons name="cloud-offline-outline" size={19} color={colors.live} />
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retry}>Réessayer</Text>
              </Pressable>
            ) : null}
            {isRefreshing && matches.length === 0 ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
          </View>
        }
        ListEmptyComponent={
          isRefreshing ? undefined : <EmptyState icon="calendar-outline" title="Aucun match ici" description="Essayez un autre filtre ou actualisez la liste." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, marginBottom: 20, gap: 10 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 7 },
  title: { color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5, maxWidth: 270 },
  liveSummary: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  liveDot: { backgroundColor: colors.live, width: 6, height: 6, borderRadius: 3 },
  liveSummaryText: { color: colors.live, fontSize: 11, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filter: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: colors.background },
  filterDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.live },
  filterDotActive: { backgroundColor: colors.background },
  errorBox: { backgroundColor: '#2D1820', borderRadius: radius.medium, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { color: colors.live, fontSize: 11, lineHeight: 16, flex: 1 },
  retry: { color: colors.text, fontWeight: '800', fontSize: 11 },
  loader: { marginVertical: 35 },
  liveBarSection: { marginTop: 6, marginBottom: 18 },
  liveBarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  liveBarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveBarTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  liveBarHint: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  liveBarContent: { gap: 10, paddingRight: 4 },
  liveChip: {
    width: 220,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#3A2430',
    borderRadius: radius.medium,
    padding: 12,
  },
  liveChipTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  liveChipLeague: { color: colors.muted, fontSize: 10, fontWeight: '700', flex: 1 },
  liveChipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#351B29', paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  liveChipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.live },
  liveChipMinute: { color: colors.live, fontSize: 9, fontWeight: '800' },
  liveChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  liveChipTeam: { color: colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
  liveChipScore: { color: colors.text, fontSize: 14, fontWeight: '900', width: 18, textAlign: 'right' },
  liveChipInfo: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
});
