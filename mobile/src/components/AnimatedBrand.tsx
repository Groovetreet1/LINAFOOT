import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

export function AnimatedBrand({ size = 20, showMark = true }: { size?: number; showMark?: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [shine] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const shineLoop = Animated.loop(
      Animated.timing(shine, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }),
    );
    pulseLoop.start();
    shineLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      shineLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, shine, spin]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-80, 180] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.row}>
      {showMark && (
        <Animated.View style={[styles.mark, { transform: [{ scale }], opacity: glow }]}> 
          <Animated.Text style={[styles.ball, { transform: [{ rotate }] }]}>⚽</Animated.Text>
        </Animated.View>
      )}
      <View style={styles.textWrap}>
        <Text style={[styles.brand, { fontSize: size }]}>LINA<Text style={styles.accent}>FOOT</Text></Text>
        <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX }, { rotate: '18deg' }] }]} />
      </View>
      <Animated.View style={[styles.liveDot, { opacity: glow, transform: [{ scale }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  ball: { fontSize: 16 },
  textWrap: { overflow: 'hidden', borderRadius: 6, paddingRight: 2 },
  brand: { color: colors.text, fontWeight: '900', letterSpacing: 0.8 },
  accent: { color: colors.accent },
  shine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 28,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: -2,
  },
});
