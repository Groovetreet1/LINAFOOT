import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export type ProfileModalKind = 'profile' | 'password' | 'twofa' | 'disable2fa';

interface ProfileModalProps {
  kind: ProfileModalKind;
  onClose: () => void;
  onDone: (message: string) => void;
}

const ICONS: Record<ProfileModalKind, keyof typeof Ionicons.glyphMap> = {
  profile: 'person-outline',
  password: 'lock-closed-outline',
  twofa: 'shield-checkmark-outline',
  disable2fa: 'shield-outline',
};

export function ProfileModal({ kind, onClose, onDone }: ProfileModalProps) {
  const { user, updateProfile, changePassword, startTwoFactorSetup, enableTwoFactor, disableTwoFactor } = useApp();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const title = kind === 'profile'
    ? 'Modifier le profil'
    : kind === 'password'
      ? 'Changer le mot de passe'
      : kind === 'twofa'
        ? (secret ? 'Activer la 2FA' : 'Configurer la 2FA')
        : 'Désactiver la 2FA';

  const subtitle = kind === 'profile'
    ? 'Vos informations sont enregistrées dans la base de données du compte.'
    : kind === 'password'
      ? 'Choisissez un nouveau mot de passe de 6 caractères minimum.'
      : kind === 'twofa'
        ? (secret
          ? 'Ajoutez la clé dans votre application d’authentification, puis validez le code.'
          : 'Protégez votre connexion avec un code temporaire à 6 chiffres.')
        : 'Confirmez votre mot de passe pour retirer la double authentification.';

  const actionLabel = kind === 'profile'
    ? 'Enregistrer'
    : kind === 'password'
      ? 'Modifier'
      : kind === 'twofa'
        ? (secret ? 'Activer' : 'Continuer')
        : 'Désactiver';

  async function submit() {
    if (busy) return;
    setError('');
    setBusy(true);
    let doneMessage: string | null = null;

    try {
      if (kind === 'profile') {
        const trimmedName = displayName.trim();
        if (trimmedName.length < 2) throw new Error('Le nom doit contenir au moins 2 caractères.');
        await updateProfile({ displayName: trimmedName, phone: phone.trim() === '' ? null : phone.trim() });
        doneMessage = 'Profil mis à jour.';
      } else if (kind === 'password') {
        if (!currentPassword) throw new Error('Entrez votre mot de passe actuel.');
        if (newPassword.length < 6) throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères.');
        if (newPassword === currentPassword) throw new Error('Le nouveau mot de passe doit être différent.');
        if (newPassword !== confirmPassword) throw new Error('Les deux mots de passe ne correspondent pas.');
        await changePassword(currentPassword, newPassword);
        doneMessage = 'Mot de passe mis à jour.';
      } else if (kind === 'twofa') {
        if (!secret) {
          if (!currentPassword) throw new Error('Entrez votre mot de passe actuel.');
          const setup = await startTwoFactorSetup(currentPassword);
          setSecret(setup.secret);
          setOtpauthUri(setup.otpauthUri);
          setCurrentPassword('');
        } else {
          if (!/^\d{6}$/.test(code)) throw new Error('Entrez le code à 6 chiffres.');
          await enableTwoFactor(code);
          doneMessage = 'Double authentification activée.';
        }
      } else {
        if (!currentPassword) throw new Error('Entrez votre mot de passe actuel.');
        await disableTwoFactor(currentPassword);
        doneMessage = 'Double authentification désactivée.';
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Opération impossible.');
    } finally {
      setBusy(false);
    }

    if (doneMessage) onDone(doneMessage);
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
        <View style={styles.dialog} testID="profile-modal">
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name={ICONS[kind]} size={22} color={colors.accent} />
            </View>
            <Pressable
              onPress={onClose}
              disabled={busy}
              hitSlop={12}
              style={styles.close}
              testID="profile-modal-close"
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {kind === 'profile' ? (
              <>
                <Text style={styles.label}>Nom d’affichage</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ex: Atlas Fan"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  maxLength={40}
                  autoCapitalize="words"
                  testID="profile-name-input"
                />

                <Text style={styles.label}>Numéro de téléphone marocain</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="06 12 34 56 78"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={30}
                  testID="profile-phone-input"
                />
                <Text style={styles.help}>
                  Formats acceptés : 06 12 34 56 78 ou +212 6 12 34 56 78. Laissez vide pour supprimer le numéro.
                </Text>
              </>
            ) : null}

            {kind === 'password' ? (
              <>
                <Text style={styles.label}>Mot de passe actuel</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={100}
                  testID="password-current-input"
                />

                <Text style={styles.label}>Nouveau mot de passe</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="6 caractères minimum"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={100}
                  testID="password-new-input"
                />

                <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={100}
                  testID="password-confirm-input"
                />
              </>
            ) : null}

            {kind === 'twofa' && !secret ? (
              <>
                <View style={styles.infoBox}>
                  <Ionicons name="apps-outline" size={18} color={colors.accent} />
                  <Text style={styles.infoText}>
                    Utilisez Google Authenticator, Authy ou une application TOTP compatible.
                  </Text>
                </View>
                <Text style={styles.label}>Mot de passe actuel</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={100}
                  testID="two-factor-password-input"
                />
              </>
            ) : null}

            {kind === 'twofa' && secret ? (
              <>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
                  <Text style={styles.stepText}>Ouvrez votre application d’authentification et ajoutez un compte manuellement.</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepText}>Saisissez cette clé secrète :</Text>
                    <View style={styles.secretBox}>
                      <Text selectable style={styles.secretText} testID="two-factor-secret">{secret}</Text>
                    </View>
                    <Text selectable style={styles.uriText}>{otpauthUri}</Text>
                  </View>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepText}>Entrez le code à 6 chiffres affiché par l’application :</Text>
                    <TextInput
                      value={code}
                      onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.codeInput]}
                      keyboardType="number-pad"
                      maxLength={6}
                      testID="two-factor-enable-code"
                    />
                  </View>
                </View>
                <Text style={styles.help}>
                  Conservez cette clé en lieu sûr : elle permet de retrouver vos codes si vous changez de téléphone.
                </Text>
              </>
            ) : null}

            {kind === 'disable2fa' ? (
              <>
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
                  <Text style={styles.warningText}>
                    Votre compte ne demandera plus de code temporaire à la connexion.
                  </Text>
                </View>
                <Text style={styles.label}>Mot de passe actuel</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={100}
                  testID="disable-2fa-password-input"
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={busy}
              testID="profile-modal-cancel"
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[styles.button, kind === 'disable2fa' ? styles.dangerButton : styles.confirmButton, busy && styles.buttonDisabled]}
              onPress={submit}
              disabled={busy}
              testID="profile-modal-submit"
            >
              {busy
                ? <ActivityIndicator color={kind === 'disable2fa' ? '#FFFFFF' : colors.background} />
                : <Text style={kind === 'disable2fa' ? styles.dangerText : styles.confirmText}>{actionLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  dialog: { width: '100%', maxWidth: 400, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  close: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  body: { marginTop: 14 },
  bodyContent: { gap: 8, paddingBottom: 2 },
  label: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  input: { backgroundColor: colors.surfaceRaised, color: colors.text, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  help: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.accentDark, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 12 },
  infoText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  stepBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.accentDark, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumber: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  stepBody: { flex: 1, gap: 7 },
  stepText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  secretBox: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.medium, paddingHorizontal: 12, paddingVertical: 11 },
  secretText: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  uriText: { color: colors.muted, fontSize: 8, lineHeight: 12 },
  codeInput: { textAlign: 'center', fontSize: 22, fontWeight: '800', letterSpacing: 6 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#302919', borderWidth: 1, borderColor: '#4A3D24', borderRadius: radius.medium, padding: 12 },
  warningText: { flex: 1, color: colors.warning, fontSize: 11, lineHeight: 16 },
  error: { color: colors.live, fontSize: 12, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  button: { flex: 1, minHeight: 46, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  buttonDisabled: { opacity: 0.55 },
  cancelButton: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  confirmButton: { backgroundColor: colors.accent },
  dangerButton: { backgroundColor: colors.live },
  cancelText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  confirmText: { color: colors.background, fontSize: 13, fontWeight: '800' },
  dangerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
