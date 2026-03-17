import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function DeveloperCard({ name, expertise, level }) {
  const [available, setAvailable] = useState(true);

  const handleHire = () => {
    setAvailable(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>

      <Text style={styles.devName}>{name}</Text>
      <Text style={styles.devExpertise}>{expertise}</Text>

      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: available ? '#6bcb77' : '#f4a261' }]} />
        <Text style={styles.statusText}>{available ? 'Available' : 'Busy'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.hireButton, !available && styles.hireButtonDisabled]}
        onPress={handleHire}
        disabled={!available}
      >
        <Text style={styles.hireButtonText}>
          {available ? '✅ Hire' : '💼 Working on Projects'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0fff4',
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
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#a8d8ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3a3a5c',
  },
  devName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3a3a5c',
  },
  devExpertise: {
    fontSize: 14,
    color: '#7a7a9d',
    marginBottom: 10,
  },
  levelBadge: {
    backgroundColor: '#c3aed6',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3a3a5c',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    color: '#5a5a7a',
    fontWeight: '600',
  },
  hireButton: {
    backgroundColor: '#6bcb77',
    paddingVertical: 11,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  hireButtonDisabled: {
    backgroundColor: '#c0c0c0',
  },
  hireButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
