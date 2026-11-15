import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/format';

export default function AccountScreen() {
  const { user, balance, transactions, isRefreshing, refreshData, logout } = useApp();
  const [error, setError] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  async function refresh() {
    try {
      setError('');
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Actualisation impossible.');
    }
  }

  function confirmSignOut() {
    setConfirmingLogout(true);
  }

  async function signOut() {
    setConfirmingLogout(false);
    // Clearing the token makes the root Stack.Protected guard remove the whole
    // (tabs) stack, so expo-router lands on the login screen automatically.
    await logout();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader balance={balance} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
      >
        <Text style={styles.eyebrow}>MON ESPACE</Text>
        <Text style={styles.title}>Mon compte</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.displayName ?? 'Joueur Atlas').slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.displayName ?? 'Joueur Atlas'}</Text>
            <Text style={styles.profileMeta}>{user?.email ?? 'Compte LINAFOOT'}</Text>
          </View>
          <View style={styles.ageBadge}><Text style={styles.ageText}>18+</Text></View>
        </View>

        <Text style={styles.sectionTitle}>ACTIVITÉ DU PORTEFEUILLE</Text>
        <View style={styles.ledgerCard}>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Vos mouvements de crédits apparaîtront ici.</Text>
          ) : transactions.slice(0, 8).map((transaction, index) => (
            <View key={transaction.id} style={[styles.transaction, index > 0 && styles.transactionBorder]}>
              <View style={[styles.transactionIcon, transaction.type === 'CREDIT' ? styles.creditIcon : styles.debitIcon]}>
                <Ionicons name={transaction.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'} size={16} color={transaction.type === 'CREDIT' ? colors.success : colors.warning} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription} numberOfLines={1}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
              </View>
              <View style={styles.transactionValueBlock}>
                <Text style={[styles.transactionAmount, transaction.type === 'CREDIT' ? styles.creditText : styles.debitText]}>{transaction.type === 'CREDIT' ? '+' : '−'}{transaction.amount}</Text>
                <Text style={styles.balanceAfter}>Solde {transaction.balanceAfter}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>SÉCURITÉ & TRANSPARENCE</Text>
        <View style={styles.securityCard}>
          <SecurityRow icon="key-outline" title="Session protégée" description="Jeton conservé dans le stockage chiffré Android." />
          <SecurityRow icon="server-outline" title="Validation serveur" description="Cotes, mises et soldes contrôlés par le backend." />
          <SecurityRow icon="shield-checkmark-outline" title="Argent réel désactivé" description="Aucun paiement ni retrait dans cette version." last />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.logoutButton} onPress={confirmSignOut} testID="logout-button">
          <Ionicons name="log-out-outline" size={19} color={colors.live} />
          <Text style={styles.logoutText}>DÉCONNEXION</Text>
        </Pressable>
        <Text style={styles.version}>ATLASFOOT SANDBOX · VERSION 0.2.0</Text>
      </ScrollView>

      <Modal
        visible={confirmingLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingLogout(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setConfirmingLogout(false)} />
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="log-out-outline" size={24} color={colors.live} />
            </View>
            <Text style={styles.dialogTitle}>Déconnexion</Text>
            <Text style={styles.dialogMessage}>Êtes-vous sûr de vouloir vous déconnecter ?</Text>
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => setConfirmingLogout(false)}
                testID="logout-cancel"
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={signOut}
                testID="logout-confirm"
              >
                <Text style={styles.confirmText}>Oui, me déconnecter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SecurityRow({ icon, title, description, last = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; last?: boolean }) {
  return (
    <View style={[styles.securityRow, !last && styles.securityBorder]}>
      <Ionicons name={icon} size={21} color={colors.accent} />
      <View style={styles.securityInfo}><Text style={styles.securityTitle}>{title}</Text><Text style={styles.securityDescription}>{description}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 8, marginBottom: 7 },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.large, padding: 18, marginVertical: 20 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#29371C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontSize: 15, fontWeight: '900' },
  profileInfo: { flex: 1, marginLeft: 13 },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  profileMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  ageBadge: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  ageText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 6, marginBottom: 10 },
  ledgerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 15, marginBottom: 24 },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 19, paddingVertical: 24, textAlign: 'center' },
  transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 11 },
  transactionBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  transactionIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  creditIcon: { backgroundColor: '#153027' },
  debitIcon: { backgroundColor: '#302919' },
  transactionInfo: { flex: 1 },
  transactionDescription: { color: colors.text, fontSize: 12, fontWeight: '600' },
  transactionDate: { color: colors.muted, fontSize: 9, marginTop: 4 },
  transactionValueBlock: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 13, fontWeight: '800' },
  creditText: { color: colors.success },
  debitText: { color: colors.warning },
  balanceAfter: { color: colors.muted, fontSize: 8, marginTop: 4 },
  securityCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 15 },
  securityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 13 },
  securityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  securityInfo: { flex: 1 },
  securityTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  securityDescription: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  error: { color: colors.live, fontSize: 12, marginTop: 14 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderColor: '#50303A', backgroundColor: '#25171E', borderRadius: radius.medium, paddingVertical: 16, marginTop: 24 },
  logoutText: { color: colors.live, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  version: { color: colors.muted, fontSize: 8, letterSpacing: 1, textAlign: 'center', marginTop: 20 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.65)' },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 22 },
  dialogIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#25171E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  dialogMessage: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  dialogButton: { flex: 1, minHeight: 46, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cancelButton: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  confirmButton: { backgroundColor: colors.live },
  cancelText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  confirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
