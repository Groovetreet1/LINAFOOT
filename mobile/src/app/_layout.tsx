import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AppProvider, useApp } from '@/context/AppContext';

function RootNavigator() {
  const { token, isRestoring } = useApp();

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {/*
          Routes are declaratively guarded by the auth token.
          When `token` becomes null, the whole (tabs) stack is removed from the
          navigator and expo-router redirects to the only remaining route: the
          login screen. No manual router.replace() can send us to the matches.
        */}
        <Stack.Protected guard={!token} redirectTo="/(tabs)/matches">
          <Stack.Screen name="index" />
        </Stack.Protected>

        <Stack.Protected guard={!!token} redirectTo="/">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="bet-slip"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="match/[id]" />
        </Stack.Protected>
      </Stack>

      {isRestoring ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
