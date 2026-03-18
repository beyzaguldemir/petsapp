import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import PetStatusBar from '../components/PetStatusBar';
import { usePet } from '../context/PetContext';

const GAMES = [
  {
    id: 'GameJump',
    emoji: '🦘',
    title: 'Jump Game',
    desc: 'Tap as fast as you can! Each tap makes Buddy jump and earns coins.',
    detail: '15 sec · Tap speed · +2 coins/tap',
    color: '#d4f5e4',
    border: '#88ccaa',
    accent: '#2e8b5a',
  },
  {
    id: 'GameMatch',
    emoji: '🧩',
    title: 'Match Game',
    desc: 'Flip cards and find matching pairs before time runs out!',
    detail: '60 sec · Memory · +10 coins/pair',
    color: '#f0e4fc',
    border: '#c088d4',
    accent: '#7b2fa8',
  },
  {
    id: 'GameCatch',
    emoji: '🍎',
    title: 'Catch Game',
    desc: 'Move left and right to catch the falling food items!',
    detail: '25 sec · Reflexes · +4 coins/catch',
    color: '#fff5d4',
    border: '#d4b84a',
    accent: '#a07800',
  },
];

export default function GamesScreen({ navigation }) {
  const { coins } = usePet();

  return (
    <View style={{ flex: 1, backgroundColor: '#eef2ff' }}>
      <PetStatusBar />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>🕹️ Mini Games</Text>
            <Text style={styles.subtitle}>Pick a game and earn coins!</Text>
          </View>
          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙 {coins}</Text>
          </View>
        </View>

        {/* Buddy message */}
        <View style={styles.buddyBanner}>
          <Text style={styles.buddyEmoji}>🐶</Text>
          <Text style={styles.buddyMsg}>Buddy is excited to play! Choose a game to start earning coins 🎉</Text>
        </View>

        {/* Game cards */}
        {GAMES.map(game => (
          <View key={game.id} style={[styles.card, { backgroundColor: game.color, borderColor: game.border }]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardEmoji}>{game.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: game.accent }]}>{game.title}</Text>
                <Text style={styles.cardDetail}>{game.detail}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>{game.desc}</Text>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: game.accent }]}
              onPress={() => navigation.navigate(game.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.playBtnText}>▶  Play Now</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  backBtn:  { padding: 6 },
  backText: { fontSize: 15, fontWeight: '700', color: '#7c5cbf' },
  title:    { fontSize: 22, fontWeight: '900', color: '#3a3a5c' },
  subtitle: { fontSize: 13, color: '#7a7a9d', marginTop: 1 },

  coinBadge: {
    backgroundColor: '#fff8e1',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#f4c542',
  },
  coinText: { fontSize: 14, fontWeight: '800', color: '#a07800' },

  buddyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  buddyEmoji: { fontSize: 32 },
  buddyMsg:   { flex: 1, fontSize: 13, color: '#4a4a6a', lineHeight: 20, fontWeight: '600' },

  card: {
    borderRadius: 20, padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardEmoji:  { fontSize: 40 },
  cardTitle:  { fontSize: 18, fontWeight: '900' },
  cardDetail: { fontSize: 12, color: '#888', marginTop: 3, fontWeight: '600' },
  cardDesc:   { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 14 },

  playBtn: {
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  playBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
