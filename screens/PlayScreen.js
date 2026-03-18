import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import Pet from '../components/Pet';
import { usePet } from '../context/PetContext';
import PetStatusBar from '../components/PetStatusBar';
import StatBars from '../components/StatBars';

const ACTIVITIES = [
  { emoji: '🎾', label: 'Fetch',   boost: 10, color: '#d4f5d4', desc: 'Toss a ball!' },
  { emoji: '🧸', label: 'Cuddle',  boost: 12, color: '#fce4f5', desc: 'Give a hug!' },
  { emoji: '🎮', label: 'Games',   boost: 15, color: '#e0d4f5', desc: 'Play together!' },
  { emoji: '🚶', label: 'Walk',    boost: 8,  color: '#d4ecf5', desc: 'Go outside!' },
  { emoji: '🎵', label: 'Music',   boost: 7,  color: '#fff5d4', desc: 'Dance around!' },
  { emoji: '🛁', label: 'Bath',    boost: 6,  color: '#d4f0f5', desc: 'Stay clean!' },
];

// ── Soft toast banner ────────────────────────────────────────
function Toast({ message, visible }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [-12, 0] }) }],
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function PlayScreen({ navigation }) {
  const { happiness, energy, triggerPlay, isSleeping } = usePet();

  const [toastMsg,    setToastMsg]    = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer                    = useRef(null);

  // track "shown low-energy hint" to prevent spam
  const shownLowEnergyHint = useRef(false);

  // Show one-time soft hint when energy dips below 20
  useEffect(() => {
    if (energy < 20 && energy > 0 && !shownLowEnergyHint.current) {
      shownLowEnergyHint.current = true;
      showToast('Buddy is getting tired 😪\nVisit the Sleep tab 💤');
    }
    if (energy >= 20) {
      shownLowEnergyHint.current = false;
    }
  }, [energy]);

  function showToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  }

  function handleActivity(act) {
    if (energy < 10) {
      showToast('Buddy is very sleepy 🥺\nLet\'s give it some rest 💤');
      return;
    }
    triggerPlay(act.boost);
  }

  const isExhausted = energy < 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#eef2ff' }}>
    <PetStatusBar />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Toast */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Play Time</Text>
        <Text style={styles.subtitle}>Make Buddy happy!</Text>
      </View>

      {/* Mini Games Banner */}
      <TouchableOpacity
        style={styles.miniGamesBanner}
        onPress={() => navigation.navigate('Games')}
        activeOpacity={0.8}
      >
        <Text style={styles.miniGamesEmoji}>🕹️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniGamesTitle}>Play Mini Games</Text>
          <Text style={styles.miniGamesDesc}>Earn coins by playing Jump, Match & Catch!</Text>
        </View>
        <Text style={styles.miniGamesArrow}>›</Text>
      </TouchableOpacity>

      {/* Pet */}
      <Pet name="Buddy" type="Golden Retriever 🐶" />

      <StatBars showHappiness />

      {/* Exhausted banner */}
      {isExhausted && (
        <View style={styles.exhaustedBanner}>
          <Text style={styles.exhaustedText}>
            😴  Buddy is too tired to play!{'\n'}
            Go to the 🌙 Sleep tab to restore energy.
          </Text>
        </View>
      )}

      {/* Activity grid */}
      <Text style={styles.sectionLabel}>Choose an activity</Text>
      <View style={styles.activityGrid}>
        {ACTIVITIES.map((act) => (
          <TouchableOpacity
            key={act.emoji}
            style={[
              styles.activityButton,
              { backgroundColor: isExhausted ? '#e0e0e0' : act.color },
            ]}
            onPress={() => handleActivity(act)}
            activeOpacity={isExhausted ? 1 : 0.75}
          >
            <Text style={[styles.activityEmoji, isExhausted && styles.dimmed]}>
              {isExhausted ? '😴' : act.emoji}
            </Text>
            <Text style={[styles.activityLabel, isExhausted && styles.dimmed]}>
              {act.label}
            </Text>
            <Text style={[styles.activityDesc, isExhausted && styles.dimmed]}>
              {isExhausted ? 'Too tired' : act.desc}
            </Text>
            <Text style={[styles.activityBoost, isExhausted && styles.dimmed]}>
              +{act.boost} 💜  +3 🪙
            </Text>
            <Text style={[styles.activityHunger, isExhausted && styles.dimmed]}>
              -10 🍖  -10 ⚡
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>

    {/* ── Sleep lock ── */}
    {isSleeping && (
      <View style={sleepLock.overlay}>
        <Text style={sleepLock.emoji}>😴</Text>
        <Text style={sleepLock.title}>Buddy is sleeping...</Text>
        <Text style={sleepLock.hint}>Go to Sleep tab and wake him up first!</Text>
      </View>
    )}
    </View>
  );
}

const sleepLock = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,30,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 99,
  },
  emoji:  { fontSize: 72 },
  title:  { fontSize: 22, fontWeight: '900', color: '#c5cae9', textAlign: 'center' },
  hint:   { fontSize: 14, fontWeight: '600', color: '#9fa8da', textAlign: 'center', paddingHorizontal: 30 },
});

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#eef2ff' },
  content:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  /* toast */
  toast: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    backgroundColor: '#3d2c6e',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* header */
  header: { marginBottom: 8 },

  /* mini games banner */
  miniGamesBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#3d2c6e',
    borderRadius: 18, padding: 16,
    marginBottom: 16, gap: 12,
    shadowColor: '#3d2c6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  miniGamesEmoji: { fontSize: 30 },
  miniGamesTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  miniGamesDesc:  { fontSize: 12, color: '#c4b0f0', marginTop: 2 },
  miniGamesArrow: { fontSize: 28, color: '#c4b0f0', fontWeight: '300' },
  title:    { fontSize: 26, fontWeight: '800', color: '#3a3a5c' },
  subtitle: { fontSize: 14, color: '#7a7a9d', marginTop: 2 },

  /* exhausted banner */
  exhaustedBanner: {
    backgroundColor: '#fdecea',
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#ef9a9a',
    marginBottom: 14, alignItems: 'center',
  },
  exhaustedText: {
    fontSize: 14, fontWeight: '700',
    color: '#c62828', textAlign: 'center', lineHeight: 22,
  },

  /* activity grid */
  sectionLabel: {
    fontSize: 16, fontWeight: '700', color: '#3a3a5c', marginBottom: 12,
  },
  activityGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, justifyContent: 'space-between',
  },
  activityButton: {
    width: '47%', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  activityEmoji:  { fontSize: 32, marginBottom: 4 },
  activityLabel:  { fontSize: 14, fontWeight: '700', color: '#3a3a5c' },
  activityDesc:   { fontSize: 11, color: '#7a7a9d', marginTop: 2 },
  activityBoost:  { fontSize: 12, fontWeight: '700', color: '#9c6fe4', marginTop: 4 },
  activityHunger: { fontSize: 11, fontWeight: '600', color: '#e07070', marginTop: 1 },
  dimmed:         { color: '#aaa' },
});
