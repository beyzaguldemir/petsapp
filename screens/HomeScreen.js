import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Pet from '../components/Pet';
import PetStatusBar from '../components/PetStatusBar';
import StatBars from '../components/StatBars';
import { usePet, LEVEL_PALETTE, LEVEL_THRESHOLDS } from '../context/PetContext';

const MAX_LEVEL = 7;

// ── Colour dot ────────────────────────────────────────────────
function ColorDot({ color, size = 18 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    }} />
  );
}

// ── Journey roadmap card ──────────────────────────────────────
function PetJourneyMap() {
  const { totalCoins, level } = usePet();

  const currentBase = LEVEL_THRESHOLDS[level]     ?? 0;
  const nextTarget  = LEVEL_THRESHOLDS[level + 1] ?? null;

  // Progress fraction within the current level segment
  const segmentSize = nextTarget ? nextTarget - currentBase : 1;
  const earned      = nextTarget ? Math.min(totalCoins - currentBase, segmentSize) : segmentSize;
  const pct         = Math.round((earned / segmentSize) * 100);

  const coinsLeft = nextTarget ? Math.max(nextTarget - totalCoins, 0) : 0;
  const nextPal   = nextTarget ? LEVEL_PALETTE[level + 1] : null;

  // Motivational message
  let motivation = '';
  if (!nextTarget) {
    motivation = "You've reached the top! 👑 Buddy is legendary!";
  } else if (pct >= 75) {
    motivation = `Almost there! ✨ Buddy will turn ${nextPal.name} very soon!`;
  } else if (pct >= 50) {
    motivation = `Halfway! 🎨 Keep going — ${nextPal.name} is waiting!`;
  } else if (pct >= 25) {
    motivation = `Good progress! 💪 ${coinsLeft} coins to ${nextPal.name}!`;
  } else {
    motivation = `Start the journey! 🚀 ${coinsLeft} coins to reach ${nextPal?.name ?? 'the top'}!`;
  }

  return (
    <View style={styles.journeyCard}>
      <Text style={styles.journeyTitle}>Your Pet Journey 🌟</Text>

      {/* ── Progress to next level ─────────────────── */}
      {nextTarget ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              Lv.{level} → Lv.{level + 1}
            </Text>
            <Text style={styles.progressCoins}>
              {totalCoins.toLocaleString()} / {nextTarget.toLocaleString()} 💰
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              { width: `${pct}%`, backgroundColor: nextPal.body },
            ]} />
          </View>
          <Text style={styles.motivationText}>{motivation}</Text>
        </View>
      ) : (
        <Text style={styles.motivationText}>{motivation}</Text>
      )}

      {/* ── Level list ─────────────────────────────── */}
      <View style={styles.levelList}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(lvl => {
          const pal       = LEVEL_PALETTE[lvl];
          const threshold = LEVEL_THRESHOLDS[lvl];
          const done      = level >= lvl;
          const isCurrent = level + 1 === lvl;

          return (
            <View
              key={lvl}
              style={[
                styles.levelRow,
                done    && styles.levelRowDone,
                isCurrent && styles.levelRowCurrent,
              ]}
            >
              {/* Left: status icon */}
              <Text style={styles.statusIcon}>
                {done ? '✅' : isCurrent ? '⭐' : '🔒'}
              </Text>

              {/* Middle: level info */}
              <View style={styles.levelInfo}>
                <View style={styles.levelNameRow}>
                  <ColorDot color={pal.body} />
                  <Text style={[styles.levelName, done && styles.levelNameDone]}>
                    Level {lvl} — {pal.name}
                  </Text>
                </View>
                <Text style={styles.levelCoins}>
                  💰 {threshold.toLocaleString()} coins
                </Text>
              </View>

              {/* Right: progress if current */}
              {isCurrent && (
                <Text style={styles.currentPct}>{pct}%</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#eef2ff' }}>
      <PetStatusBar />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🐾 PetsApp</Text>
          <Text style={styles.headerSubtitle}>Your virtual pet companion</Text>
        </View>

        <Pet name="Buddy" type="Golden Retriever 🐶" />

        <StatBars showHunger showHappiness showEnergy />

        <PetJourneyMap />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  header:         { marginBottom: 16 },
  headerTitle:    { fontSize: 30, fontWeight: '800', color: '#3a3a5c', letterSpacing: 1 },
  headerSubtitle: { fontSize: 13, color: '#7a7a9d', marginTop: 2 },

  // ── Journey card ─────────────────────────────────
  journeyCard: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#5a5a9a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  journeyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3a3a5c',
    marginBottom: 14,
    letterSpacing: 0.4,
  },

  // ── Progress block ───────────────────────────────
  progressBlock: { marginBottom: 16 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#5a5a7a' },
  progressCoins: { fontSize: 12, fontWeight: '700', color: '#b8860b' },
  progressBarBg: {
    height: 10,
    backgroundColor: '#ece9f8',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: { height: '100%', borderRadius: 6 },
  motivationText: {
    fontSize: 12,
    color: '#6b6b9a',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },

  // ── Level list ───────────────────────────────────
  levelList: { gap: 8 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f6ff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  levelRowDone: {
    backgroundColor: '#f0faf0',
    borderColor: '#b2dfdb',
  },
  levelRowCurrent: {
    backgroundColor: '#fffde7',
    borderColor: '#f4c842',
  },
  statusIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  levelInfo:  { flex: 1, gap: 2 },
  levelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  levelName:    { fontSize: 13, fontWeight: '700', color: '#3a3a5c' },
  levelNameDone:{ color: '#4caf50' },
  levelCoins:   { fontSize: 11, color: '#8888aa' },
  currentPct:   { fontSize: 13, fontWeight: '800', color: '#b8860b' },
});
