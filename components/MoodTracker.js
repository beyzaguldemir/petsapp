import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MOODS = [
  { label: 'Happy', emoji: '😄', value: 'Happy' },
  { label: 'Tired', emoji: '😴', value: 'Tired' },
  { label: 'Angry', emoji: '😡', value: 'Angry' },
];

export default function MoodTracker({ selectedMood, onMoodChange }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.currentMood}>
        Current Mood:{' '}
        <Text style={styles.moodHighlight}>
          {selectedMood
            ? `${MOODS.find((m) => m.value === selectedMood)?.emoji} ${selectedMood}`
            : 'Not set'}
        </Text>
      </Text>

      <View style={styles.buttonRow}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.moodButton,
              selectedMood === mood.value && styles.moodButtonActive,
            ]}
            onPress={() => onMoodChange(mood.value)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f0ff',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a3a5c',
    marginBottom: 8,
  },
  currentMood: {
    fontSize: 14,
    color: '#7a7a9d',
    marginBottom: 16,
  },
  moodHighlight: {
    fontWeight: '700',
    color: '#7c5cbf',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moodButton: {
    alignItems: 'center',
    backgroundColor: '#e8e0f7',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonActive: {
    borderColor: '#7c5cbf',
    backgroundColor: '#d5c9f0',
  },
  moodEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5a5a7a',
  },
});
