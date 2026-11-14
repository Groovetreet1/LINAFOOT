import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { teamInitials } from '@/lib/format';

const FLAG_MAP: Record<string, string> = {
  Portugal: 'pt',
  Denmark: 'dk',
  'Northern Ireland': 'gb-nir',
  Ukraine: 'ua',
  Austria: 'at',
  'Republic of Ireland': 'ie',
  Romania: 'ro',
  Poland: 'pl',
  Sweden: 'se',
  'Bosnia-Herzegovina': 'ba',
  Norway: 'no',
  Wales: 'gb-wls',
  Japan: 'jp',
  Brazil: 'br',
  Ecuador: 'ec',
  'Costa Rica': 'cr',
  Haiti: 'ht',
  'United States': 'us',
  Jamaica: 'jm',
  Mexico: 'mx',
  'New Zealand': 'nz',
  India: 'in',
};

function candidates(uri?: string, name?: string): string[] {
  const list: string[] = [];
  if (uri) list.push(uri);
  if (name && FLAG_MAP[name]) {
    const code = FLAG_MAP[name];
    list.push(`https://flagcdn.com/w160/${code}.png`);
    list.push(`https://flagcdn.com/h80/${code}.png`);
  }
  return [...new Set(list.filter(Boolean))];
}

export function TeamLogo({ uri, name, size = 46 }: { uri?: string; name: string; size?: number }) {
  const sourceKey = `${uri ?? ''}|${name}`;
  const [state, setState] = useState({ key: sourceKey, idx: 0 });
  const urls = useMemo(() => candidates(uri, name), [uri, name]);
  const idx = state.key === sourceKey ? state.idx : 0;
  const current = urls[idx];

  if (current) {
    return (
      <Image
        key={current}
        source={{ uri: current }}
        style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#0f1724' }}
        resizeMode="contain"
        onError={() =>
          setState((prev) => ({
            key: sourceKey,
            idx: (prev.key === sourceKey ? prev.idx : 0) + 1,
          }))
        }
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size * 0.32 }]}> 
      <Text style={[styles.text, { fontSize: Math.max(11, size * 0.28) }]}>{teamInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.accent, fontWeight: '900' },
});
