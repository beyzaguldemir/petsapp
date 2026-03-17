import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const FEED_AMOUNT = 10;
const PLAY_AMOUNT = 10;
const MAX_STAT = 100;

export default function Pet({ name, type }) {
  const [hunger, setHunger] = useState(50);
  const [happiness, setHappiness] = useState(50);

  const feed = () => {
    setHunger((prev) => Math.min(prev + FEED_AMOUNT, MAX_STAT));
  };

  const play = () => {
    setHappiness((prev) => Math.min(prev + PLAY_AMOUNT, MAX_STAT));
  };

  const getMoodEmoji = () => {
    if (happiness > 70) return '😄';
    if (happiness >= 30) return '😐';
    return '😢';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{getMoodEmoji()}</Text>
      <Text style={styles.petName}>{name}</Text>
      <Text style={styles.petType}>Type: {type}</Text>

      <View style={styles.statsContainer}>
        <StatBar label="Hunger" value={hunger} color="#a8d8ea" />
        <StatBar label="Happiness" value={happiness} color="#c3aed6" />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.feedButton]} onPress={feed}>
          <Text style={styles.buttonText}>🍖 Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.playButton]} onPress={play}>
          <Text style={styles.buttonText}>🎾 Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatBar({ label, value, color }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f4ff',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 6,
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a3a5c',
  },
  petType: {
    fontSize: 14,
    color: '#7a7a9d',
    marginBottom: 14,
  },
  statsContainer: {
    width: '100%',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    width: 80,
    fontSize: 13,
    color: '#5a5a7a',
    fontWeight: '600',
  },
  barBackground: {
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
  statValue: {
    width: 30,
    fontSize: 13,
    color: '#5a5a7a',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  feedButton: {
    backgroundColor: '#a8d8ea',
  },
  playButton: {
    backgroundColor: '#c3aed6',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3a3a5c',
  },
});
