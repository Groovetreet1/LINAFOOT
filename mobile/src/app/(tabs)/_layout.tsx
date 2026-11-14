import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

function SupportPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIcon}><Ionicons name="headset" size={20} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Support LINAFOOT</Text>
              <Text style={styles.sheetSubtitle}>Besoin d’aide ? On est là pour toi.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={18} color={colors.text} /></Pressable>
          </View>

          <Pressable style={styles.action} onPress={() => Linking.openURL('mailto:support@linafoot.app?subject=Support%20LINAFOOT')}>
            <Ionicons name="mail-outline" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Email</Text>
              <Text style={styles.actionText}>support@linafoot.app</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <Pressable style={styles.action} onPress={() => Linking.openURL('https://wa.me/212600000000')}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>WhatsApp</Text>
              <Text style={styles.actionText}>Chat rapide avec le support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.noteText}>Mode démo (crédits virtuels). Si un match/pari semble bloqué, actualise l’écran — les matchs et gains se mettent à jour en temps réel.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const { token, isRestoring } = useApp();
  const [supportOpen, setSupportOpen] = useState(false);
  if (!isRestoring && !token) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Matchs',
            tabBarIcon: ({ color, size }) => <Ionicons name="football-outline" color={color as string} size={size} />,
          }}
        />
        <Tabs.Screen
          name="bets"
          options={{
            title: 'Mes paris',
            tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color as string} size={size} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Compte',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color as string} size={size} />,
          }}
        />
      </Tabs>

      <Pressable style={styles.fab} onPress={() => setSupportOpen(true)} accessibilityRole="button" accessibilityLabel="Support">
        <Ionicons name="headset" size={20} color={colors.background} />
      </Pressable>
      <SupportPopup visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 86,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    paddingBottom: 28,
    gap: 12,
  },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 3, backgroundColor: colors.border, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  sheetIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sheetSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceRaised, borderRadius: radius.medium, padding: 13, borderWidth: 1, borderColor: colors.border },
  actionTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  actionText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  noteBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 2 },
  noteText: { color: colors.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
