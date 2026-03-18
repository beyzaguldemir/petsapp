import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Dimensions,
} from 'react-native';
import { usePet } from '../context/PetContext';

// ── Grid constants ────────────────────────────────────────────────
const ROWS        = 8;
const COLS        = 8;
const GAME_DURATION = 60;
const NUM_COLORS  = 5;
const CELL_GAP    = 3;
const { width: SCREEN_W } = Dimensions.get('window');
const AVAIL_W     = Math.min(SCREEN_W, 420) - 32;
const CELL_SIZE   = Math.floor((AVAIL_W - CELL_GAP * (COLS - 1)) / COLS);
const GRID_W      = CELL_SIZE * COLS + CELL_GAP * (COLS - 1);

// ── 5 pet colour themes ────────────────────────────────────────────
const PET_COLORS = [
  { bg: '#7b1fa2', shine: '#e040fb', border: '#4a0072', label: 'purple' },
  { bg: '#f57f17', shine: '#ffee58', border: '#7f4000', label: 'yellow' },
  { bg: '#c62828', shine: '#ff8a80', border: '#7f0000', label: 'red'    },
  { bg: '#2e7d32', shine: '#69f0ae', border: '#1a4a1e', label: 'green'  },
  { bg: '#0d47a1', shine: '#82b1ff', border: '#002171', label: 'blue'   },
];

// ── Pure helpers ──────────────────────────────────────────────────
function createInitialGrid() {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let color;
      do {
        color = Math.floor(Math.random() * NUM_COLORS);
      } while (
        (c >= 2 && g[r][c - 1] === color && g[r][c - 2] === color) ||
        (r >= 2 && g[r - 1][c] === color && g[r - 2][c] === color)
      );
      g[r][c] = color;
    }
  }
  return g;
}

function cloneGrid(g) {
  return g.map(row => [...row]);
}

function findMatches(g) {
  const matched = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let s = 0;
    while (s < COLS) {
      let e = s;
      while (e + 1 < COLS && g[r][e + 1] === g[r][s]) e++;
      if (e - s >= 2) for (let c = s; c <= e; c++) matched.add(`${r},${c}`);
      s = e + 1;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let s = 0;
    while (s < ROWS) {
      let e = s;
      while (e + 1 < ROWS && g[e + 1][c] === g[s][c]) e++;
      if (e - s >= 2) for (let r = s; r <= e; r++) matched.add(`${r},${c}`);
      s = e + 1;
    }
  }
  return matched;
}

function applyGravity(g, matched) {
  const ng = cloneGrid(g);
  matched.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    ng[r][c] = null;
  });
  for (let c = 0; c < COLS; c++) {
    let wr = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (ng[r][c] !== null) {
        if (wr !== r) { ng[wr][c] = ng[r][c]; ng[r][c] = null; }
        wr--;
      }
    }
    for (let r = wr; r >= 0; r--) {
      ng[r][c] = Math.floor(Math.random() * NUM_COLORS);
    }
  }
  return ng;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Pet cell ──────────────────────────────────────────────────────
const EYE_R  = Math.max(3, Math.round(CELL_SIZE * 0.115));
const MOUTH_W = Math.round(CELL_SIZE * 0.38);
const EAR_W  = Math.round(CELL_SIZE * 0.22);
const EAR_H  = Math.round(CELL_SIZE * 0.24);

function PetCell({ colorIdx, selected, isPopping, popAnim }) {
  if (colorIdx == null) {
    return <View style={[styles.cell, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />;
  }
  const col = PET_COLORS[colorIdx];
  return (
    <Animated.View
      style={[
        styles.cell,
        { backgroundColor: col.bg, borderColor: selected ? '#FFD700' : col.border },
        selected && styles.cellSelected,
        isPopping && { transform: [{ scale: popAnim }] },
      ]}
    >
      {/* Shine */}
      <View style={[styles.shine, { backgroundColor: col.shine }]} />
      {/* Ears */}
      <View style={[styles.ear, styles.earL, { width: EAR_W, height: EAR_H, backgroundColor: col.shine, borderRadius: EAR_W / 2 }]} />
      <View style={[styles.ear, styles.earR, { width: EAR_W, height: EAR_H, backgroundColor: col.shine, borderRadius: EAR_W / 2 }]} />
      {/* Face */}
      <View style={styles.face}>
        <View style={styles.eyesRow}>
          <View style={[styles.eye, { width: EYE_R * 2, height: EYE_R * 2, borderRadius: EYE_R }]} />
          <View style={[styles.eye, { width: EYE_R * 2, height: EYE_R * 2, borderRadius: EYE_R }]} />
        </View>
        <View style={[styles.mouth, { width: MOUTH_W }]} />
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function GameMatchScreen({ navigation }) {
  const { addGameCoins, addGameHappiness } = usePet();

  const [phase,        setPhase]        = useState('intro');
  const [grid,         setGrid]         = useState([]);
  const [selected,     setSelected]     = useState(null); // { row, col } | null
  const [score,        setScore]        = useState(0);
  const [combo,        setCombo]        = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(GAME_DURATION);
  const [poppingCells, setPoppingCells] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg,    setStatusMsg]    = useState('');

  const popAnim      = useRef(new Animated.Value(1)).current;
  const scoreRef     = useRef(0);
  const coinsAdded   = useRef(false);
  const gameActiveRef = useRef(false);
  const mountedRef   = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const tid = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tid);
          gameActiveRef.current = false;
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tid);
  }, [phase]);

  // ── Coins on result ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'result' && !coinsAdded.current) {
      coinsAdded.current = true;
      addGameCoins(scoreRef.current);
    }
  }, [phase]);

  // ── Start game ───────────────────────────────────────────────────
  function startGame() {
    scoreRef.current   = 0;
    coinsAdded.current = false;
    gameActiveRef.current = true;
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_DURATION);
    setSelected(null);
    setPoppingCells(new Set());
    setIsProcessing(false);
    setStatusMsg('Tap a pet to select it');
    setGrid(createInitialGrid());
    setPhase('playing');
  }

  // ── Cell press handler ───────────────────────────────────────────
  function handleCellPress(row, col) {
    if (isProcessing || phase !== 'playing') return;

    if (!selected) {
      setSelected({ row, col });
      setStatusMsg('Now tap an adjacent pet to swap ↕↔');
      return;
    }

    const { row: sr, col: sc } = selected;

    if (row === sr && col === sc) {
      setSelected(null);
      setStatusMsg('Tap a pet to select it');
      return;
    }

    const dr = Math.abs(row - sr);
    const dc = Math.abs(col - sc);

    if (dr + dc === 1) {
      setSelected(null);
      setStatusMsg('');
      attemptSwap(grid, sr, sc, row, col);
    } else {
      setSelected({ row, col });
      setStatusMsg('Now tap an adjacent pet to swap ↕↔');
    }
  }

  // ── Swap + cascade logic (async) ─────────────────────────────────
  async function attemptSwap(currentGrid, r1, c1, r2, c2) {
    if (!mountedRef.current) return;
    setIsProcessing(true);

    let g = cloneGrid(currentGrid);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    setGrid(g);
    await sleep(90);

    if (!mountedRef.current) return;

    let matched = findMatches(g);

    if (matched.size === 0) {
      // Invalid — revert
      await sleep(280);
      if (!mountedRef.current) return;
      [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
      setGrid(cloneGrid(g));
      setStatusMsg('No match! Try again 🔄');
      setTimeout(() => { if (mountedRef.current) setStatusMsg('Tap a pet to select it'); }, 1200);
      setIsProcessing(false);
      return;
    }

    // ── Cascade ────────────────────────────────────────────────────
    let cascadeCount = 0;
    while (matched.size > 0 && gameActiveRef.current) {
      if (!mountedRef.current) return;
      cascadeCount++;

      // Show popping
      setPoppingCells(new Set(matched));
      popAnim.setValue(1);

      // Pop animation
      await new Promise(resolve => {
        Animated.timing(popAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }).start(resolve);
      });

      if (!mountedRef.current) return;

      // Score: matched × 5, with cascade bonus
      const gained = matched.size * 2 * cascadeCount;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setCombo(cascadeCount);
      addGameHappiness(Math.min(matched.size * 2, 15)); // +2 per matched pet, max +15

      if (cascadeCount > 1) {
        setStatusMsg(`🔥 ${cascadeCount}x Combo! +${gained}🪙`);
      }

      // Apply gravity + fill from top
      g = applyGravity(g, matched);
      setPoppingCells(new Set());
      setGrid(cloneGrid(g));
      await sleep(130);
      if (!mountedRef.current) return;

      matched = findMatches(g);
    }

    if (mountedRef.current) {
      setCombo(0);
      setIsProcessing(false);
      if (cascadeCount > 0) {
        setTimeout(() => {
          if (mountedRef.current) setStatusMsg('Tap a pet to select it');
        }, 900);
      } else {
        setStatusMsg('Tap a pet to select it');
      }
    }
  }

  const timerColor = timeLeft <= 10 ? '#e53935' : '#7b2fa8';

  return (
    <View style={styles.screen}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { gameActiveRef.current = false; navigation.goBack(); }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Games</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🧩 Pet Match</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <View style={styles.centerContent}>
          {/* Preview grid sample */}
          <View style={styles.previewRow}>
            {PET_COLORS.map((col, i) => (
              <View key={i} style={[styles.previewCell, { backgroundColor: col.bg, borderColor: col.border }]}>
                <View style={[styles.shine, { backgroundColor: col.shine }]} />
                <View style={styles.face}>
                  <View style={styles.eyesRow}>
                    <View style={[styles.eye, { width: 5, height: 5, borderRadius: 3 }]} />
                    <View style={[styles.eye, { width: 5, height: 5, borderRadius: 3 }]} />
                  </View>
                  <View style={[styles.mouth, { width: 10 }]} />
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.buddyMsg}>Match the Pet Colors! 🐾</Text>
          <Text style={styles.instrTitle}>How to Play</Text>
          <Text style={styles.instrText}>
            Tap a pet to <Text style={{ fontWeight: '900' }}>select</Text> it,{'\n'}
            then tap an <Text style={{ fontWeight: '900' }}>adjacent</Text> pet to swap.{'\n'}
            Match <Text style={{ fontWeight: '900' }}>3 or more</Text> of the same color!{'\n'}
            Chain combos for <Text style={{ fontWeight: '900' }}>bonus coins!</Text>
          </Text>
          <View style={styles.rewardGrid}>
            <Text style={styles.rewardItem}>3-match → 15🪙</Text>
            <Text style={styles.rewardItem}>4-match → 20🪙</Text>
            <Text style={styles.rewardItem}>2× combo → ×2</Text>
            <Text style={styles.rewardItem}>3× combo → ×3</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>▶  Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <ScrollView contentContainerStyle={styles.playContent} scrollEnabled={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>SCORE</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={[styles.statPill, { borderColor: timerColor }]}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={[styles.statValue, { color: timerColor }]}>{timeLeft}s</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>COINS</Text>
              <Text style={[styles.statValue, { color: '#7b2fa8' }]}>{score}🪙</Text>
            </View>
          </View>

          {/* Status / combo message */}
          <View style={styles.statusRow}>
            {combo > 1
              ? <Text style={styles.comboText}>🔥 {combo}× COMBO!</Text>
              : <Text style={styles.statusText}>{statusMsg}</Text>
            }
          </View>

          {/* Grid */}
          <View style={[styles.gridWrap, { width: GRID_W }]}>
            {grid.map((row, r) => (
              <View key={r} style={styles.gridRow}>
                {row.map((colorIdx, c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => handleCellPress(r, c)}
                    activeOpacity={0.75}
                  >
                    <PetCell
                      colorIdx={colorIdx}
                      selected={selected?.row === r && selected?.col === c}
                      isPopping={poppingCells.has(`${r},${c}`)}
                      popAnim={popAnim}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <View style={styles.centerContent}>
          <Text style={styles.resultEmoji}>{score >= 500 ? '🏆' : score >= 200 ? '🌟' : '🎉'}</Text>
          <Text style={styles.resultTitle}>
            {score >= 500 ? 'Legendary!' : score >= 200 ? 'Amazing!' : 'Great job Buddy!'}
          </Text>
          <Text style={styles.resultStat}>
            Final score: <Text style={styles.bold}>{score}</Text>
          </Text>
          <View style={styles.coinResult}>
            <Text style={styles.coinResultText}>You earned  {score} coins 🎉</Text>
          </View>
          <TouchableOpacity style={styles.backGameBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backGameBtnText}>← Back to Games</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playAgainBtn} onPress={startGame}>
            <Text style={styles.playAgainBtnText}>↺  Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a0a2e' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#2d1050',
  },
  backBtn:   { padding: 4 },
  backText:  { color: '#ce93d8', fontSize: 14, fontWeight: '700' },
  gameTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // ── Intro
  centerContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, gap: 12,
  },
  previewRow: {
    flexDirection: 'row', gap: 8, marginBottom: 6,
  },
  previewCell: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 2,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  buddyMsg:   { fontSize: 20, fontWeight: '900', color: '#ce93d8', textAlign: 'center' },
  instrTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 4 },
  instrText:  { fontSize: 13, color: '#ccc', textAlign: 'center', lineHeight: 22 },
  rewardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4,
  },
  rewardItem: {
    backgroundColor: '#2d1050', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    fontSize: 13, fontWeight: '800', color: '#e040fb',
    borderWidth: 1, borderColor: '#7b1fa2',
  },
  startBtn: {
    backgroundColor: '#7b1fa2', borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 48, marginTop: 8,
    shadowColor: '#e040fb', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // ── Playing
  playContent: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 20, alignItems: 'center' },

  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 8, justifyContent: 'center',
  },
  statPill: {
    alignItems: 'center', backgroundColor: '#2d1050',
    borderRadius: 14, paddingVertical: 7, paddingHorizontal: 14,
    borderWidth: 2, borderColor: '#7b1fa2',
    minWidth: 72,
  },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#9e57c4', letterSpacing: 1.5 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#fff' },

  statusRow: {
    height: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statusText: { fontSize: 13, color: '#9e57c4', fontWeight: '600' },
  comboText:  { fontSize: 18, fontWeight: '900', color: '#e040fb', letterSpacing: 1 },

  // ── Grid
  gridWrap: {
    backgroundColor: '#12042a',
    borderRadius: 16, padding: 6,
    borderWidth: 2, borderColor: '#4a0a80',
    shadowColor: '#e040fb', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
    gap: CELL_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },

  // ── Cell
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    borderRadius: Math.round(CELL_SIZE * 0.22),
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellSelected: {
    borderColor: '#FFD700',
    borderWidth: 3,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 10,
  },
  shine: {
    position: 'absolute', top: 3, left: 4,
    width: Math.round(CELL_SIZE * 0.3),
    height: Math.round(CELL_SIZE * 0.3),
    borderRadius: Math.round(CELL_SIZE * 0.15),
    opacity: 0.55,
  },
  ear: { position: 'absolute', top: -Math.round(EAR_H * 0.45), opacity: 0.9 },
  earL: { left: Math.round(CELL_SIZE * 0.08) },
  earR: { right: Math.round(CELL_SIZE * 0.08) },

  face: { alignItems: 'center', gap: 2, marginTop: Math.round(CELL_SIZE * 0.08) },
  eyesRow: { flexDirection: 'row', gap: Math.round(CELL_SIZE * 0.18) },
  eye:     { backgroundColor: '#fff', opacity: 0.92 },
  mouth:   { height: 3, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 2 },

  // ── Result
  resultEmoji:    { fontSize: 72 },
  resultTitle:    { fontSize: 24, fontWeight: '900', color: '#e040fb' },
  resultStat:     { fontSize: 15, color: '#ccc' },
  bold:           { fontWeight: '900', color: '#fff' },
  coinResult: {
    backgroundColor: '#2d1050', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 28,
    borderWidth: 2, borderColor: '#7b1fa2', marginVertical: 4,
    shadowColor: '#e040fb', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  coinResultText: { fontSize: 20, fontWeight: '900', color: '#e040fb', textAlign: 'center' },
  backGameBtn: {
    borderWidth: 2, borderColor: '#7b1fa2', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 32, marginTop: 8,
  },
  backGameBtnText: { color: '#ce93d8', fontSize: 15, fontWeight: '800' },
  playAgainBtn: {
    backgroundColor: '#7b1fa2', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 32,
    shadowColor: '#e040fb', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 4,
  },
  playAgainBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
