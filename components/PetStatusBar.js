import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePet, LEVEL_THRESHOLDS } from '../context/PetContext';

const STATS = [
  { icon: '🍗', key: 'hunger',    bar: '#f48fb1' },
  { icon: '💜', key: 'happiness', bar: '#ce93d8' },
  { icon: '⚡', key: 'energy',    bar: '#ffe082' },
];

const MAX_LEVEL = 7;

export default function PetStatusBar() {
  const { coins, totalCoins, level, hunger, happiness, energy } = usePet();
  const vals = { hunger, happiness, energy };

  // LEVEL_THRESHOLDS[n] = coins needed to reach level n; next level = level+1
  const nextThreshold = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level + 1] : null;
  const progress = nextThreshold
    ? Math.min(totalCoins / nextThreshold, 1)
    : 1;

  return (
    <View style={styles.topBar}>

      {/* ── Left: Coin + Level ──────────────────────── */}
      <View style={styles.leftGroup}>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>💰 {coins}</Text>
        </View>
        <View style={styles.levelPill}>
          <Text style={styles.levelLabel}>⭐ Lv.{level}</Text>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          {nextThreshold && (
            <Text style={styles.xpText}>{totalCoins}/{nextThreshold}</Text>
          )}
        </View>
      </View>

      {/* ── Right: All 3 stats ──────────────────────── */}
      <View style={styles.statsCard}>
        {STATS.map(({ icon, key, bar }) => (
          <View key={key} style={styles.statItem}>
            <Text style={styles.statIcon}>{icon}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${vals[key]}%`, backgroundColor: bar }]} />
            </View>
            <Text style={styles.statPct}>{vals[key]}</Text>
          </View>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  leftGroup: {
    flexDirection: 'column',
    gap: 5,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff9e6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#f4c842',
    elevation: 2,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b8860b',
  },
  xpBarBg: {
    width: 46,
    height: 5,
    backgroundColor: '#ffe88a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#f4c842',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9a7a00',
  },
  coinPill: {
    backgroundColor: '#fff9e6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#f4c842',
    shadowColor: '#f4c842',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b8860b',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#5a5a9a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statIcon: { fontSize: 11 },
  barBg: {
    width: 30,
    height: 5,
    backgroundColor: '#e8e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  statPct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5a5a7a',
    width: 20,
    textAlign: 'right',
  },
});
