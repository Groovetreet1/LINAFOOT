import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/format';
import type { Bet } from '@/types';

function statusMeta(status: Bet['status']) {
  switch (status) {
    case 'WON':
      return { label: 'GAGNÉ', color: colors.accent, bg: '#1F2E17', dot: colors.accent };
    case 'LOST':
      return { label: 'PERDU', color: colors.live, bg: '#2D1820', dot: colors.live };
    case 'REFUNDED':
      return { label: 'REMBOURSÉ', color: '#60A5FA', bg: '#172235', dot: '#60A5FA' };
    default:
      return { label: 'EN ATTENTE', color: colors.warning, bg: '#302919', dot: colors.warning };
  }
}

function BetCard({ bet }: { bet: Bet }) {
  const meta = statusMeta(bet.status);
  const isWon = bet.status === 'WON';
  const isLost = bet.status === 'LOST';
  return (
    <View style={styles.betCard}>
      <View style={styles.cardTop}>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}><View style={[styles.statusDot, { backgroundColor: meta.dot }]} /><Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text></View>
        <Text style={styles.date}>{formatDate(bet.settledAt ?? bet.createdAt)}</Text>
      </View>
      <View style={styles.teamsRow}>
        <TeamLogo uri={bet.homeTeamLogo} name={bet.homeTeam} size={28} />
        <Text style={styles.teams} numberOfLines={2}>{bet.homeTeam} <Text style={styles.versus}>vs</Text> {bet.awayTeam}</Text>
        <TeamLogo uri={bet.awayTeamLogo} name={bet.awayTeam} size={28} />
      </View>
      <View style={styles.selectionRow}>
        <Text style={styles.selection}>Résultat · {bet.selectionLabel}</Text>
        <Text style={styles.odds}>@{bet.odds.toFixed(2)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.moneyRow}>
        <View><Text style={styles.moneyLabel}>MISE</Text><Text style={styles.moneyValue}>{bet.stake} crédits</Text></View>
        <View style={styles.payout}>
          <Text style={styles.moneyLabel}>{isWon ? 'GAIN CRÉDITÉ' : isLost ? 'RÉSULTAT' : 'GAIN POTENTIEL'}</Text>
          <Text style={[styles.payoutValue, isLost && styles.lostValue, isWon && styles.wonValue]}>
            {isWon ? `+${bet.payoutAmount ?? bet.potentialPayout}` : isLost ? '0' : bet.potentialPayout} crédits
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function BetsScreen() {
  const { balance, bets, isRefreshing, refreshData } = useApp();
  const [error, setError] = useState('');
  const pendingStake = bets.filter((b) => b.status === 'PENDING').reduce((total, bet) => total + bet.stake, 0);
  const wonCount = bets.filter((b) => b.status === 'WON').length;

  async function refresh() {
    try {
      setError('');
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Actualisation impossible.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader balance={balance} />
      <FlatList
        data={bets}
        keyExtractor={(bet) => bet.id}
        renderItem={({ item }) => <BetCard bet={item} />}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>HISTORIQUE</Text>
            <Text style={styles.title}>Mes pronostics</Text>
            <View style={styles.summary}>
              <View style={styles.summaryIcon}><Ionicons name="receipt-outline" color={colors.accent} size={20} /></View>
              <View><Text style={styles.summaryValue}>{bets.length}</Text><Text style={styles.summaryLabel}>paris total</Text></View>
              <View style={styles.summarySeparator} />
              <View><Text style={styles.summaryValue}>{pendingStake}</Text><Text style={styles.summaryLabel}>crédits engagés</Text></View>
              <View style={styles.summarySeparator} />
              <View><Text style={styles.summaryValue}>{wonCount}</Text><Text style={styles.summaryLabel}>gagnés</Text></View>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="Votre coupon est vide" description="Choisissez une cote dans l’onglet Matchs pour placer votre premier pronostic virtuel." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 8, marginBottom: 7 },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 16, marginVertical: 20, gap: 10, flexWrap: 'wrap' },
  summaryIcon: { backgroundColor: colors.surfaceRaised, borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  summarySeparator: { width: 1, height: 30, backgroundColor: colors.border },
  betCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.large, padding: 18, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  date: { color: colors.muted, fontSize: 10 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 9 },
  teams: { color: colors.text, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' },
  versus: { color: colors.muted, fontWeight: '500', fontSize: 11 },
  selectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selection: { color: colors.muted, fontSize: 12 },
  odds: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moneyLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 5 },
  moneyValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  payout: { alignItems: 'flex-end' },
  payoutValue: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  lostValue: { color: colors.live },
  wonValue: { color: colors.accent },
  error: { color: colors.live, fontSize: 12, marginBottom: 14 },
});
