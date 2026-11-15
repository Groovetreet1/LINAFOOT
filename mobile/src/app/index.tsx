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
  const { login, signup, isRestoring } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        await login(normalizedEmail, password);
      } else {
        await signup(displayName.trim(), normalizedEmail, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  // restoring handled by root AuthGate

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AnimatedBrand />
          <View style={styles.hero}>
            <View style={styles.badge}><Ionicons name="shield-checkmark" size={14} color={colors.accent} /><Text style={styles.badgeText}>Crédits virtuels uniquement</Text></View>
            <Text style={styles.title}>LINAFOOT</Text>
            <Text style={styles.subtitle}>Connectez-vous ou créez un compte pour accéder aux matchs, paris simulés et votre portefeuille virtuel (aucun argent réel).</Text>
          </View>

          <View style={styles.card}>
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
  title: { color: colors.text, fontSize: 30, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
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
  error: { color: colors.live, fontSize: 13 },
  button: { backgroundColor: colors.accent, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 6 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.background, fontWeight: '800', fontSize: 16 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  hintLink: { color: colors.accent, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  noticeText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
});
