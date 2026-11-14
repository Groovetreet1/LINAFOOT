import { StyleSheet, Text, View } from 'react-native';

import { AnimatedBrand } from '@/components/AnimatedBrand';
import { colors } from '@/constants/theme';

export function AppHeader({ balance }: { balance: number }) {
  return (
    <View style={styles.wrapper}>
      <AnimatedBrand size={19} />
      <View style={styles.balance}>
        <View style={styles.coinDot} />
        <Text style={styles.balanceText}>{balance.toLocaleString('fr-FR')}</Text>
        <Text style={styles.balanceLabel}>crédits</Text>
      </View>
      <View style={styles.demoBadge}>
        <Text style={styles.demoText}>MODE DÉMO · AUCUN ARGENT RÉEL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 5,
  },
  coinDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  balanceText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  balanceLabel: { color: colors.muted, fontSize: 10 },
  demoBadge: {
    width: '100%',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#202817',
    alignItems: 'center',
  },
  demoText: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});
