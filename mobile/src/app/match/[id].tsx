import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamLogo } from '@/components/TeamLogo';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { formatKickoff } from '@/lib/format';
import type { Market, MatchEvent, MatchStats, Selection } from '@/types';

function MarketCard({ market, onSelect, canBet }: { market: Market; onSelect: (selection: Selection) => void; canBet: (id: string) => boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{market.name}</Text>
      <View style={styles.options}>
        {market.selections.map((selection) => {
          const bettable = canBet(selection.id);
          return (
            <Pressable
              key={selection.id}
              disabled={!bettable}
              onPress={() => onSelect(selection)}
              style={({ pressed }) => [styles.option, bettable && pressed && styles.optionPressed, !bettable && styles.optionInfo]}
            >
              <View style={styles.optionTop}>
                <Text style={styles.optionLabel} numberOfLines={2}>{selection.label}</Text>
                <Text style={[styles.optionOdd, !bettable && styles.optionOddMuted]}>{selection.odds.toFixed(2)}</Text>
              </View>
              <View style={styles.probRow}>
                <View style={styles.probTrack}><View style={[styles.probFill, { width: `${Math.min(100, selection.probability ?? 0)}%` }]} /></View>
                <Text style={styles.probText}>{(selection.probability ?? 0).toFixed(1)}%</Text>
              </View>
              {!bettable && <Text style={styles.infoOnly}>Info marché</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StatRow({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  const awayPct = (away / total) * 100;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statValue}>{home}{suffix}</Text>
      <View style={styles.statCenter}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statBars}>
          <View style={styles.statTrack}><View style={[styles.statFillHome, { width: `${homePct}%` }]} /></View>
          <View style={styles.statTrack}><View style={[styles.statFillAway, { width: `${awayPct}%` }]} /></View>
        </View>
      </View>
      <Text style={styles.statValueRight}>{away}{suffix}</Text>
    </View>
  );
}

function EventItem({ event, homeTeam, awayTeam }: { event: MatchEvent; homeTeam: string; awayTeam: string }) {
  const icon = event.type === 'goal' ? 'football' : event.type === 'card' ? 'square' : event.type === 'sub' ? 'swap-horizontal' : event.type === 'var' ? 'tv-outline' : 'information-circle';
  const iconColor = event.type === 'goal' ? colors.accent : event.type === 'card' ? '#F4C542' : event.team === 'home' ? '#7DD3FC' : event.team === 'away' ? '#FCA5A5' : colors.muted;
  const side = event.team === 'home' ? homeTeam : event.team === 'away' ? awayTeam : 'Match';
  return (
    <View style={styles.eventItem}>
      <View style={styles.eventMinute}><Text style={styles.eventMinuteText}>{event.minute}′</Text></View>
      <View style={styles.eventBody}>
        <View style={styles.eventHead}><Ionicons name={icon as any} size={14} color={iconColor} /><Text style={styles.eventSide}>{side}</Text></View>
        <Text style={styles.eventText}>{event.text}</Text>
      </View>
    </View>
  );
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, refreshData, selectOutcome, isBettableSelection } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const match = useMemo(() => matches.find((item) => item.id === id), [id, matches]);

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshData().catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshData]);

  async function onRefresh() {
    setRefreshing(true);
    try { await refreshData(); } finally { setRefreshing(false); }
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.safeArea}><Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}><Text style={styles.emptyText}>Match introuvable.</Text></View>
      </SafeAreaView>
    );
  }

  const live = match.status === 'LIVE';
  const details = match.details;
  const stats: MatchStats | undefined = details?.stats;

  function pick(selection: Selection) {
    if ((selection.id === 'home' || selection.id === 'draw' || selection.id === 'away') && match) {
      selectOutcome(match, selection.id);
      router.push('/bet-slip');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22} /></Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.league}>{match.league}</Text>
            {live && <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE {match.displayMinute ?? `${match.minute ?? 0}'`}</Text></View>}
            {match.status === 'FINISHED' && <View style={styles.ftBadge}><Text style={styles.ftText}>TERMINÉ · {match.displayMinute ?? 'FT'}</Text></View>}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.hero}>
          <View style={styles.team}><TeamLogo uri={match.homeTeamLogo} name={match.homeTeam} size={56} /><Text style={styles.teamName}>{match.homeTeam}</Text><Text style={styles.teamTag}>Domicile</Text></View>
          <View style={styles.scoreBox}>
            {live || match.status === 'FINISHED' ? <Text style={styles.score}>{match.homeScore} : {match.awayScore}</Text> : <Text style={styles.vs}>VS</Text>}
            <Text style={styles.time}>{live ? `En direct · ${match.displayMinute ?? `${match.minute ?? 0}'`}` : match.status === 'FINISHED' ? `Terminé · ${match.displayMinute ?? 'FT'}` : formatKickoff(match.kickoff)}</Text>
          </View>
          <View style={styles.team}><TeamLogo uri={match.awayTeamLogo} name={match.awayTeam} size={56} /><Text style={styles.teamName}>{match.awayTeam}</Text><Text style={styles.teamTag}>Extérieur</Text></View>
        </View>

        <View style={styles.pairBanner}><Text style={styles.pairBannerText}>{match.homeTeam}  vs  {match.awayTeam}</Text></View>

        {match.info ? <View style={styles.infoCard}><Ionicons name="flash" size={16} color={colors.accent} /><Text style={styles.infoText}>{match.info}</Text></View> : null}

        <View style={styles.updateRow}><Ionicons name="sync-outline" size={14} color={colors.accent} /><Text style={styles.updateText}>Mise à jour en temps réel (toutes les 5 secondes)</Text></View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations du match</Text>
          <View style={styles.factsGrid}>
            <View style={styles.fact}><Text style={styles.factLabel}>Compétition</Text><Text style={styles.factValue}>{details?.stage ?? match.league}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>Coup d’envoi</Text><Text style={styles.factValue}>{new Date(match.kickoff).toLocaleString('fr-FR')}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>Stade</Text><Text style={styles.factValue}>{details?.venue ?? '—'}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>Arbitre</Text><Text style={styles.factValue}>{details?.referee ?? '—'}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>Météo</Text><Text style={styles.factValue}>{details?.weather ?? '—'}</Text></View>
            <View style={styles.fact}><Text style={styles.factLabel}>Diffusion</Text><Text style={styles.factValue}>{details?.broadcast ?? 'LINAFOOT Live'}</Text></View>
          </View>
        </View>

        {stats ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Statistiques</Text>
            <View style={styles.statTeams}><Text style={styles.statTeamName} numberOfLines={1}>{match.homeTeam}</Text><Text style={styles.statTeamNameRight} numberOfLines={1}>{match.awayTeam}</Text></View>
            <StatRow label="Possession" home={stats.possessionHome} away={stats.possessionAway} suffix="%" />
            <StatRow label="Tirs" home={stats.shotsHome} away={stats.shotsAway} />
            <StatRow label="Tirs cadrés" home={stats.shotsOnTargetHome} away={stats.shotsOnTargetAway} />
            <StatRow label="Corners" home={stats.cornersHome} away={stats.cornersAway} />
            <StatRow label="Fautes" home={stats.foulsHome} away={stats.foulsAway} />
            <StatRow label="Cartons jaunes" home={stats.yellowCardsHome} away={stats.yellowCardsAway} />
            <StatRow label="Arrêts" home={stats.savesHome} away={stats.savesAway} />
            <StatRow label="Passes" home={stats.passesHome} away={stats.passesAway} />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Temps forts & événements</Text>
          {details?.events?.length ? (
            <View style={styles.eventsList}>
              {[...details.events].sort((a, b) => b.minute - a.minute).map((event, idx) => (
                <EventItem key={`${event.minute}-${idx}`} event={event} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyInline}>Aucun événement pour le moment. Les temps forts apparaîtront en direct.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Marchés & probabilités</Text>
        {match.markets.map((market) => (
          <MarketCard key={market.id} market={market} onSelect={pick} canBet={(id) => isBettableSelection(id) && match.status !== 'FINISHED'} />
        ))}

        <Text style={styles.note}>Les statistiques, événements et probabilités évoluent en temps réel (simulation). Les paris démo sont disponibles sur le marché 1X2.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerCenter: { alignItems: 'center', gap: 6, flex: 1 },
  league: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#351B29', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.live },
  liveText: { color: colors.live, fontSize: 10, fontWeight: '800' },
  ftBadge: { backgroundColor: colors.surfaceRaised, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  ftText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.large, padding: 18, marginBottom: 10 },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: { color: colors.text, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  teamTag: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  scoreBox: { width: 96, alignItems: 'center' },
  score: { color: colors.text, fontSize: 28, fontWeight: '900' },
  vs: { color: colors.muted, fontWeight: '800' },
  time: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: 'center' },
  pairBanner: { backgroundColor: '#172235', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center', marginBottom: 14 },
  pairBannerText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: '#172235', borderRadius: radius.medium, padding: 14, marginBottom: 14, alignItems: 'flex-start' },
  infoText: { color: colors.text, fontSize: 12, lineHeight: 18, flex: 1 },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  updateText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 14, marginBottom: 12 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 10 },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { width: '48%', backgroundColor: colors.surfaceRaised, borderRadius: radius.small, padding: 10 },
  factLabel: { color: colors.muted, fontSize: 10, marginBottom: 4 },
  factValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  statTeams: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statTeamName: { color: colors.text, fontSize: 10, fontWeight: '700', flex: 1 },
  statTeamNameRight: { color: colors.text, fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'right' },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  statValue: { color: colors.text, fontSize: 11, fontWeight: '800', width: 42 },
  statValueRight: { color: colors.text, fontSize: 11, fontWeight: '800', width: 42, textAlign: 'right' },
  statCenter: { flex: 1 },
  statLabel: { color: colors.muted, fontSize: 10, textAlign: 'center', marginBottom: 4 },
  statBars: { flexDirection: 'row', gap: 4 },
  statTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  statFillHome: { height: 6, backgroundColor: colors.accent },
  statFillAway: { height: 6, backgroundColor: '#60A5FA' },
  eventsList: { gap: 10 },
  eventItem: { flexDirection: 'row', gap: 10 },
  eventMinute: { width: 34, height: 24, borderRadius: 7, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  eventMinuteText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  eventBody: { flex: 1 },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  eventSide: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  eventText: { color: colors.text, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 4, marginBottom: 10 },
  options: { gap: 8 },
  option: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.small, padding: 11 },
  optionPressed: { borderColor: colors.accent, backgroundColor: '#27351D' },
  optionInfo: { opacity: 0.95 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  optionLabel: { color: colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
  optionOdd: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  optionOddMuted: { color: colors.text },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  probTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  probFill: { height: 6, backgroundColor: colors.accent },
  probText: { color: colors.muted, fontSize: 10, width: 42, textAlign: 'right', fontWeight: '700' },
  infoOnly: { color: colors.muted, fontSize: 9, marginTop: 6 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted },
  emptyInline: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
