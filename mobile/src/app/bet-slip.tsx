import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamLogo } from '@/components/TeamLogo';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { createIdempotencyKey } from '@/lib/format';

const quickStakes = [10, 25, 50, 100];



export default function BetSlipScreen() {
  const { token, balance, selected, clearSelection, placeBet } = useApp();
  const [stake, setStake] = useState('25');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef(createIdempotencyKey());

  if (!token) return <Redirect href="/" />;
  if (!selected) return <Redirect href="/(tabs)/matches" />;

  const numericStake = /^\d+$/.test(stake) ? Number(stake) : 0;
  const validStake = numericStake >= 10 && numericStake <= balance;
  const potentialPayout = Math.round(numericStake * selected.selection.odds);

  function close() {
    clearSelection();
    router.back();
  }

  async function submit() {
    if (!validStake || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await placeBet(numericStake, idempotencyKey.current);
      router.replace('/(tabs)/bets');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Le pari n’a pas pu être enregistré.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={close} style={styles.closeButton} accessibilityLabel="Fermer le coupon">
            <Ionicons name="close" color={colors.text} size={23} />
          </Pressable>
          <Text style={styles.headerTitle}>Mon coupon</Text>
          <View style={styles.singleBadge}><Text style={styles.singleText}>SIMPLE</Text></View>
        </View>

        <View style={styles.selectionCard}>
          <View style={styles.liveRow}>
            {selected.match.status === 'LIVE' ? <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE · {selected.match.minute ?? 0}′</Text></View> : null}
            <Text style={styles.league}>{selected.match.league}</Text>
          </View>
          <View style={styles.matchHeader}>
            <View style={styles.side}><TeamLogo uri={selected.match.homeTeamLogo} name={selected.match.homeTeam} size={42} /><Text style={styles.teamName}>{selected.match.homeTeam}</Text></View>
            <Text style={styles.versus}>VS</Text>
            <View style={styles.side}><TeamLogo uri={selected.match.awayTeamLogo} name={selected.match.awayTeam} size={42} /><Text style={styles.teamName}>{selected.match.awayTeam}</Text></View>
          </View>
          <View style={styles.outcomeRow}>
            <View><Text style={styles.outcomeLabel}>RÉSULTAT DU MATCH</Text><Text style={styles.outcome}>{selected.selection.label} · {
              selected.selection.id === 'home' ? selected.match.homeTeam : selected.selection.id === 'away' ? selected.match.awayTeam : 'Match nul'
            }</Text></View>
            <View style={styles.oddsBadge}><Text style={styles.odds}>{selected.selection.odds.toFixed(2)}</Text></View>
          </View>
        </View>

        <View style={styles.stakeSection}>
          <View style={styles.stakeHeader}>
            <Text style={styles.sectionLabel}>VOTRE MISE</Text>
            <Text style={styles.balance}>Disponible : <Text style={styles.balanceValue}>{balance} crédits</Text></Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              value={stake}
              onChangeText={(value) => setStake(value.replace(/[^0-9]/g, '').slice(0, 7))}
              keyboardType="number-pad"
              style={styles.stakeInput}
              placeholder="0"
              placeholderTextColor={colors.muted}
              maxLength={7}
              editable={!submitting}
            />
            <Text style={styles.creditLabel}>crédits</Text>
          </View>
          <View style={styles.quickRow}>
            {quickStakes.map((amount) => (
              <Pressable key={amount} onPress={() => setStake(String(amount))} style={[styles.quickButton, numericStake === amount && styles.quickActive]}>
                <Text style={[styles.quickText, numericStake === amount && styles.quickTextActive]}>{amount}</Text>
              </Pressable>
            ))}
          </View>
          {stake.length > 0 && !validStake ? <Text style={styles.validation}>Mise minimale : 10. La mise ne peut pas dépasser votre solde.</Text> : null}
        </View>

        <View style={styles.payoutCard}>
          <View style={styles.payoutRow}><Text style={styles.payoutLabel}>Mise</Text><Text style={styles.payoutValue}>{numericStake} crédits</Text></View>
          <View style={styles.payoutRow}><Text style={styles.payoutLabel}>Cote</Text><Text style={styles.payoutValue}>× {selected.selection.odds.toFixed(2)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.payoutRow}><Text style={styles.totalLabel}>Gain potentiel</Text><Text style={styles.totalValue}>{potentialPayout}</Text></View>
          <Text style={styles.creditUnit}>CRÉDITS VIRTUELS</Text>
        </View>

        {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={19} color={colors.live} /><Text style={styles.error}>{error}</Text></View> : null}

        <Pressable style={[styles.submitButton, (!validStake || submitting) && styles.submitDisabled]} disabled={!validStake || submitting} onPress={submit}>
          {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.submitText}>VALIDER LE PRONOSTIC</Text>}
          {!submitting && <Ionicons name="arrow-forward" size={19} color={colors.background} />}
        </Pressable>
        <Text style={styles.disclaimer}>Simulation uniquement. Aucun paiement, retrait ou gain en argent réel.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  singleBadge: { backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 9 },
  singleText: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  selectionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.large, padding: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  liveBadge: { backgroundColor: '#351B29', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 8 },
  liveText: { color: colors.live, fontSize: 9, fontWeight: '800' },
  league: { color: colors.muted, fontSize: 10, flex: 1 },
  matchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 18, gap: 8 },
  side: { flex: 1, alignItems: 'center', gap: 8 },

  teamName: { color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  versus: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  outcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  outcomeLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginBottom: 5 },
  outcome: { color: colors.text, fontSize: 12, fontWeight: '700', maxWidth: 240 },
  oddsBadge: { backgroundColor: '#27351D', paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.small },
  odds: { color: colors.accent, fontWeight: '900', fontSize: 17 },
  stakeSection: { marginTop: 25 },
  stakeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  balance: { color: colors.muted, fontSize: 10 },
  balanceValue: { color: colors.text, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 18 },
  stakeInput: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '900', paddingVertical: 15 },
  creditLabel: { color: colors.muted, fontSize: 13 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickButton: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, borderRadius: radius.small, alignItems: 'center' },
  quickActive: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent },
  quickText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  quickTextActive: { color: colors.accent },
  validation: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: 10 },
  payoutCard: { marginTop: 22, backgroundColor: '#131E1C', borderRadius: radius.large, borderWidth: 1, borderColor: '#2C442D', padding: 19 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  payoutLabel: { color: colors.muted, fontSize: 12 },
  payoutValue: { color: colors.text, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#2C442D', marginVertical: 5, marginBottom: 16 },
  totalLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  totalValue: { color: colors.accent, fontSize: 26, fontWeight: '900' },
  creditUnit: { color: colors.accent, fontSize: 8, letterSpacing: 1.1, fontWeight: '800', textAlign: 'right', marginTop: -6 },
  errorBox: { flexDirection: 'row', gap: 9, alignItems: 'center', padding: 13, backgroundColor: '#2D1820', borderRadius: radius.medium, marginTop: 16 },
  error: { color: colors.live, fontSize: 11, lineHeight: 17, flex: 1 },
  submitButton: { marginTop: 20, minHeight: 56, backgroundColor: colors.accent, borderRadius: radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: colors.background, fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 14 },
});
