import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
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

export default function WelcomeScreen() {
  const { token, isRestoring, signIn } = useApp();
  const [name, setName] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (token) return <Redirect href="/(tabs)" />;

  async function startDemo() {
    if (!adultConfirmed || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await signIn(name.trim() || 'Joueur Lina');
      router.replace('/(tabs)');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de démarrer la démo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AnimatedBrand size={22} />

          <View style={styles.heroIcon}>
            <View style={styles.heroCircleOuter}>
              <View style={styles.heroCircleInner}>
                <Ionicons name="football-outline" color={colors.accent} size={66} />
              </View>
            </View>
            <View style={styles.demoPill}><Text style={styles.demoPillText}>SANDBOX</Text></View>
          </View>

          <Text style={styles.eyebrow}>LE FOOTBALL, AUTREMENT.</Text>
          <Text style={styles.title}>Vos pronostics.{'\n'}<Text style={styles.titleAccent}>Zéro risque.</Text></Text>
          <Text style={styles.subtitle}>Matchs en direct, cotes et coupons avec des crédits 100% virtuels.</Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>VOTRE PSEUDO</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Joueur Lina"
                placeholderTextColor={colors.muted}
                style={styles.input}
                maxLength={30}
                autoCapitalize="words"
                editable={!isRestoring && !submitting}
              />
            </View>

            <Pressable style={styles.confirmRow} onPress={() => setAdultConfirmed((value) => !value)}>
              <View style={[styles.checkbox, adultConfirmed && styles.checkboxChecked]}>
                {adultConfirmed && <Ionicons name="checkmark" color={colors.background} size={15} />}
              </View>
              <Text style={styles.confirmText}>Je confirme avoir 18 ans ou plus et comprendre qu’il s’agit uniquement d’une simulation.</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, (!adultConfirmed || submitting || isRestoring) && styles.buttonDisabled]}
              disabled={!adultConfirmed || submitting || isRestoring}
              onPress={startDemo}
            >
              {submitting || isRestoring ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>DÉMARRER LA DÉMO</Text>
                  <Ionicons name="arrow-forward" color={colors.background} size={19} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.muted} />
            <Text style={styles.footerText}>Aucun dépôt · Aucun retrait · Aucun prix en argent</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28 },
  heroIcon: { alignSelf: 'center', alignItems: 'center', marginTop: 38, marginBottom: 28 },
  heroCircleOuter: { width: 152, height: 152, borderRadius: 76, backgroundColor: '#111A29', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroCircleInner: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#1B281B', alignItems: 'center', justifyContent: 'center' },
  demoPill: { position: 'absolute', bottom: -8, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  demoPillText: { color: colors.background, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  eyebrow: { color: colors.accent, fontWeight: '800', fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
  title: { color: colors.text, fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1 },
  titleAccent: { color: colors.accent },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 330 },
  formCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.large, padding: 18, marginTop: 28 },
  inputLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 9 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderRadius: radius.small, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 14 },
  confirmRow: { flexDirection: 'row', gap: 11, marginVertical: 17, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  confirmText: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radius.medium, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  primaryButtonText: { color: colors.background, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  buttonDisabled: { opacity: 0.42 },
  error: { color: colors.live, fontSize: 12, lineHeight: 18, marginBottom: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 20 },
  footerText: { color: colors.muted, fontSize: 10 },
});
