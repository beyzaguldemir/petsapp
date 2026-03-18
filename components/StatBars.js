import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePet } from '../context/PetContext';

const ALL_BARS = [
  { key: 'hunger',    label: '🍗 Hunger',    color: '#a8d8ea', prop: 'showHunger'    },
  { key: 'happiness', label: '💜 Happiness',  color: '#c3aed6', prop: 'showHappiness' },
  { key: 'energy',    label: '⚡ Energy',     color: '#ffe082', prop: 'showEnergy'    },
];

export default function StatBars({
  showHunger    = false,
  showHappiness = false,
  showEnergy    = false,
}) {
  const { hunger, happiness, energy } = usePet();
  const vals  = { hunger, happiness, energy };
  const flags = { showHunger, showHappiness, showEnergy };
  const active = ALL_BARS.filter(b => flags[b.prop]);

  if (active.length === 0) return null;

  return (
    <View style={styles.card}>
      {active.map(({ key, label, color }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${vals[key]}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.value}>{vals[key]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f4ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 104,
    fontSize: 13,
    fontWeight: '600',
    color: '#5a5a7a',
  },
  barBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0ef',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  value: {
    width: 28,
    fontSize: 13,
    fontWeight: '600',
    color: '#5a5a7a',
    textAlign: 'right',
  },
});
