import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { ProfileModal, type ProfileModalKind } from '@/components/ProfileModal';
import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/format';

export default function AccountScreen() {
  const { user, balance, transactions, isRefreshing, refreshData, logout } = useApp();
  const [error, setError] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [modal, setModal] = useState<ProfileModalKind | null>(null);
  const [notice, setNotice] = useState('');
  const hasPassword = Boolean(user?.email);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function handleDone(message: string) {
    setModal(null);
    setNotice(message);
  }

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

        <Pressable
          style={styles.profileCard}
          onPress={() => setModal('profile')}
          accessibilityRole="button"
          accessibilityLabel="Modifier le profil"
          testID="edit-profile-card"
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.displayName ?? 'Joueur Atlas').slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.displayName ?? 'Joueur Atlas'}</Text>
            <Text style={styles.profileMeta}>{user?.phone ? formatPhone(user.phone) : user?.email ?? 'Compte LINAFOOT'}</Text>
          </View>
          <View style={styles.ageBadge}><Text style={styles.ageText}>18+</Text></View>
          <Ionicons name="pencil" size={14} color={colors.accent} style={styles.editIcon} />
        </Pressable>

        {notice ? (
          <View style={styles.notice} testID="profile-notice">
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>MON COMPTE</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="person-outline"
            title="Nom d’affichage"
            value={user?.displayName ?? 'Non renseigné'}
            onPress={() => setModal('profile')}
            testID="settings-name"
          />
          <SettingsRow
            icon="call-outline"
            title="Téléphone"
            value={formatPhone(user?.phone)}
            onPress={() => setModal('profile')}
            testID="settings-phone"
          />
          <SettingsRow
            icon="mail-outline"
            title="Email"
            value={user?.email ?? 'Compte de démonstration'}
            last
          />
        </View>

        <Text style={styles.sectionTitle}>SÉCURITÉ</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="lock-closed-outline"
            title="Mot de passe"
            value={hasPassword ? 'Modifier votre mot de passe' : 'Disponible avec un compte email'}
            onPress={hasPassword ? () => setModal('password') : undefined}
            testID="settings-password"
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Double authentification (2FA)"
            value={user?.twoFactorEnabled ? 'Code temporaire à la connexion' : 'Désactivée'}
            badge={user?.twoFactorEnabled ? 'ACTIVE' : 'OFF'}
            badgeTone={user?.twoFactorEnabled ? 'success' : 'muted'}
            onPress={hasPassword ? () => setModal(user?.twoFactorEnabled ? 'disable2fa' : 'twofa') : undefined}
            last
            testID="settings-2fa"
          />
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

        <Text style={styles.sectionTitle}>TRANSPARENCE</Text>
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

      {modal ? (
        <ProfileModal key={modal} kind={modal} onClose={() => setModal(null)} onDone={handleDone} />
      ) : null}
    </SafeAreaView>
  );
}

function formatPhone(phone?: string | null) {
  if (!phone) return 'Non renseigné';
  const match = /^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone);
  return match ? `0${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}` : phone;
}

function SettingsRow({
  icon,
  title,
  value,
  onPress,
  last = false,
  badge,
  badgeTone = 'muted',
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
  badge?: string;
  badgeTone?: 'success' | 'muted';
  testID?: string;
}) {
  const content = (
    <>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={19} color={onPress ? colors.accent : colors.muted} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsValue} numberOfLines={1}>{value}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, badgeTone === 'success' ? styles.badgeSuccess : styles.badgeMuted]}>
          <Text style={[styles.badgeText, badgeTone === 'success' ? styles.badgeTextSuccess : styles.badgeTextMuted]}>{badge}</Text>
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.settingsRow, !last && styles.settingsBorder]}>{content}</View>;
  }
  return (
    <Pressable style={[styles.settingsRow, !last && styles.settingsBorder]} onPress={onPress} testID={testID}>
      {content}
    </Pressable>
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
  editIcon: { marginLeft: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#153027', borderWidth: 1, borderColor: '#24533F', borderRadius: radius.medium, padding: 12, marginTop: -8, marginBottom: 20 },
  noticeText: { flex: 1, color: colors.success, fontSize: 11, fontWeight: '700' },
  settingsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 15, marginBottom: 24 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  settingsBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  settingsInfo: { flex: 1 },
  settingsTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  settingsValue: { color: colors.muted, fontSize: 10, marginTop: 4 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  badgeSuccess: { backgroundColor: '#153027' },
  badgeMuted: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  badgeTextSuccess: { color: colors.success },
  badgeTextMuted: { color: colors.muted },
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
