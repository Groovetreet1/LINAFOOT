import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { TeamLogo } from '@/components/TeamLogo';
import { colors, radius } from '@/constants/theme';
import { formatKickoff } from '@/lib/format';
import type { FootballMatch, Selection } from '@/types';

interface MatchCardProps {
  match: FootballMatch;
  onSelect: (match: FootballMatch, selection: Selection) => void;
  onOpen?: (match: FootballMatch) => void;
}

function LeagueLogo({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return <Image source={{ uri: logo }} style={styles.leagueLogo} resizeMode="contain" onError={() => setFailed(true)} />;
  }
  return <Ionicons name="trophy-outline" size={13} color={colors.muted} />;
}

export function MatchCard({ match, onSelect, onOpen }: MatchCardProps) {
  const live = match.status === 'LIVE';
  const market = match.markets.find((item) => item.id === 'h2h');

  return (
    <Pressable style={styles.card} onPress={() => onOpen?.(match)}>
      <View style={styles.topRow}>
        <View style={styles.leagueRow}>
          <LeagueLogo name={match.league} logo={match.leagueLogo} />
          <Text style={styles.league} numberOfLines={1}>{match.league}</Text>
        </View>
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{match.displayMinute ?? `${match.minute ?? 0}'`}</Text>
          </View>
        ) : (
          <Text style={styles.kickoff}>{match.status === 'FINISHED' ? (match.displayMinute ?? 'FT') : formatKickoff(match.kickoff)}</Text>
        )}
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.team}>
          <TeamLogo name={match.homeTeam} uri={match.homeTeamLogo} size={46} />
          <Text style={styles.teamName} numberOfLines={2}>{match.homeTeam}</Text>
        </View>
        <View style={styles.scoreBlock}>
          {live || match.status === 'FINISHED' ? (
            <Text style={styles.score}>{match.homeScore} <Text style={styles.scoreDash}>:</Text> {match.awayScore}</Text>
          ) : (
            <Text style={styles.versus}>VS</Text>
          )}
          {live && <Text style={styles.liveLabel}>EN DIRECT</Text>}
          {match.status === 'FINISHED' && <Text style={styles.finishedLabel}>TERMINÉ</Text>}
        </View>
        <View style={styles.team}>
          <TeamLogo name={match.awayTeam} uri={match.awayTeamLogo} size={46} />
          <Text style={styles.teamName} numberOfLines={2}>{match.awayTeam}</Text>
        </View>
      </View>

      {match.info ? <Text style={styles.info} numberOfLines={2}>{match.info}</Text> : null}
      <View style={styles.marketHeader}><Text style={styles.marketLabel}>RÉSULTAT 1X2</Text><Text style={styles.detailHint}>Voir corners, fautes, cartes…</Text></View>
      <View style={styles.oddsRow}>
        {market?.selections.map((selection) => (
          <Pressable
            key={selection.id}
            accessibilityRole="button"
            accessibilityLabel={`${match.homeTeam} contre ${match.awayTeam}, ${selection.label}, cote ${selection.odds}`}
            onPress={(e) => { e.stopPropagation?.(); onSelect(match, selection); }}
            android_ripple={{ color: '#33452A' }}
            style={({ pressed }) => [styles.oddButton, pressed && styles.oddPressed]}
          >
            <Text style={styles.oddLabel}>{selection.label}</Text>
            <View style={styles.oddRight}><Text style={styles.oddValue}>{selection.odds.toFixed(2)}</Text><Text style={styles.prob}>{(selection.probability ?? 0).toFixed(0)}%</Text></View>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  leagueLogo: { width: 16, height: 16 },
  league: { color: colors.muted, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#351B29',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.live },
  liveText: { color: colors.live, fontSize: 11, fontWeight: '800' },
  kickoff: { color: colors.text, fontSize: 11, fontWeight: '600' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22 },
  team: { flex: 1, alignItems: 'center', gap: 10 },
  teamName: { color: colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center', minHeight: 34 },
  scoreBlock: { width: 80, alignItems: 'center' },
  score: { color: colors.text, fontWeight: '900', fontSize: 25 },
  scoreDash: { color: colors.muted },
  versus: { color: colors.muted, fontSize: 12, letterSpacing: 1.2, fontWeight: '800' },
  liveLabel: { color: colors.live, fontSize: 8, letterSpacing: 1, fontWeight: '900', marginTop: 5 },
  finishedLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1, fontWeight: '900', marginTop: 5 },
  info: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  marketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  marketLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  detailHint: { color: colors.accent, fontSize: 9, fontWeight: '700' },
  oddsRow: { flexDirection: 'row', gap: 8 },
  oddButton: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  oddPressed: { backgroundColor: '#27351D', borderColor: colors.accent },
  oddLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  oddRight: { alignItems: 'flex-end' },
  oddValue: { color: colors.text, fontSize: 14, fontWeight: '900' },
  prob: { color: colors.accent, fontSize: 9, fontWeight: '700', marginTop: 1 },
});
