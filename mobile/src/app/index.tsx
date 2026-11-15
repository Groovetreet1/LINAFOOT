import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { AnimatedBrand } from '@/components/AnimatedBrand';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Mode = 'login' | 'signup';

export default function WelcomeScreen() {
  const { login, verifyTwoFactorLogin, signup, isRestoring } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Auth redirection is fully declarative in the root layout (Stack.Protected).
  if (isRestoring) {
    return (
      <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.accent} /></SafeAreaView>
    );
  }

  async function submit() {
    if (submitting) return;
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Entrez un email valide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await login(normalizedEmail, password, rememberMe);
        if (result.requiresTwoFactor && result.challengeToken) {
          setChallengeToken(result.challengeToken);
          setTwoFactorCode('');
          setPassword('');
        }
      } else {
        await signup(displayName.trim(), normalizedEmail, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!challengeToken || submitting) return;
    setError('');
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setError('Entrez le code à 6 chiffres.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyTwoFactorLogin(challengeToken, twoFactorCode, rememberMe);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vérification impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelTwoFactor() {
    setChallengeToken(null);
    setTwoFactorCode('');
    setError('');
  }

  // restoring handled by root AuthGate

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AnimatedBrand />
          <View style={styles.hero}>
            <View style={styles.badge}><Ionicons name="shield-checkmark" size={14} color={colors.accent} /><Text style={styles.badgeText}>Crédits virtuels uniquement</Text></View>
            <Text style={styles.subtitle}>Connectez-vous ou créez un compte pour accéder aux matchs, paris simulés et votre portefeuille virtuel (aucun argent réel).</Text>
          </View>

          <View style={styles.card}>
            {challengeToken ? (
              <>
                <View style={styles.twoFactorHeader}>
                  <View style={styles.twoFactorIcon}>
                    <Ionicons name="shield-checkmark" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.twoFactorCopy}>
                    <Text style={styles.twoFactorTitle}>Double authentification</Text>
                    <Text style={styles.twoFactorText}>Saisissez le code à 6 chiffres généré par votre application d’authentification.</Text>
                  </View>
                </View>

                <Text style={styles.label}>Code de vérification</Text>
                <TextInput
                  value={twoFactorCode}
                  onChangeText={(value) => setTwoFactorCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.codeInput]}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  testID="two-factor-code"
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={submitting}
                  testID="two-factor-submit"
                >
                  {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Vérifier le code</Text>}
                </Pressable>

                <Pressable onPress={cancelTwoFactor} style={styles.backRow}>
                  <Ionicons name="arrow-back" size={15} color={colors.muted} />
                  <Text style={styles.backLink}>Revenir à la connexion</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.tabs}>
                  <Pressable style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => { setMode('login'); setError(''); }}>
                    <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Connexion</Text>
                  </Pressable>
                  <Pressable style={[styles.tab, mode === 'signup' && styles.tabActive]} onPress={() => { setMode('signup'); setError(''); }}>
                    <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Inscription</Text>
                  </Pressable>
                </View>

                {mode === 'signup' ? (
                  <>
                    <Text style={styles.label}>Nom d’affichage</Text>
                    <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Ex: Atlas Fan" placeholderTextColor={colors.muted} style={styles.input} maxLength={40} autoCapitalize="words" />
                  </>
                ) : null}

                <Text style={styles.label}>Email</Text>
                <TextInput value={email} onChangeText={setEmail} placeholder="vous@email.com" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} maxLength={120} />

                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.passwordRow}>
                  <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.muted} style={[styles.input, styles.passwordInput]} secureTextEntry={!showPassword} autoCapitalize="none" maxLength={100} />
                  <Pressable style={styles.eye} onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                  </Pressable>
                </View>

                {mode === 'login' ? (
                  <Pressable
                    style={styles.rememberRow}
                    onPress={() => setRememberMe((value) => !value)}
                    accessibilityRole="checkbox"
                    accessibilityLabel="Se souvenir de moi"
                    accessibilityState={{ checked: rememberMe }}
                    aria-checked={rememberMe}
                    testID="remember-me"
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe ? <Ionicons name="checkmark" size={14} color={colors.background} /> : null}
                    </View>
                    <Text style={styles.rememberText}>Se souvenir de moi</Text>
                  </Pressable>
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>{mode === 'login' ? 'Se connecter' : 'Créer un compte'}</Text>}
                </Pressable>

                <Text style={styles.hint}>
                  {mode === 'login' ? 'Pas de compte ? ' : 'Déjà un compte ? '}
                  <Text style={styles.hintLink} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
                    {mode === 'login' ? 'Inscrivez-vous' : 'Connectez-vous'}
                  </Text>
                </Text>
              </>
            )}
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.noticeText}>Démo : crédits virtuels uniquement, aucun paiement réel. Vos identifiants sont stockés localement dans la base de données de l’app.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 36, gap: 18, paddingBottom: 40 },
  hero: { gap: 10 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accentDark, borderWidth: 1, borderColor: colors.accent },
  badgeText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  twoFactorHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 14, marginBottom: 4 },
  twoFactorIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  twoFactorCopy: { flex: 1 },
  twoFactorTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  twoFactorText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  codeInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  backLink: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.medium, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.small },
  tabActive: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  tabText: { color: colors.muted, fontWeight: '700' },
  tabTextActive: { color: colors.text },
  label: { color: colors.text, fontWeight: '700', marginTop: 2 },
  input: { backgroundColor: colors.surfaceRaised, color: colors.text, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 44 },
  eye: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', paddingVertical: 6, marginTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  rememberText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  error: { color: colors.live, fontSize: 13 },
  button: { backgroundColor: colors.accent, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 6 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.background, fontWeight: '800', fontSize: 16 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  hintLink: { color: colors.accent, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  noticeText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
});
