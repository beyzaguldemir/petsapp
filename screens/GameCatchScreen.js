import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, PanResponder,
} from 'react-native';
import { usePet } from '../context/PetContext';

// ── Game constants ────────────────────────────────────────────────
const GAME_DURATION   = 30;
const COINS_PER_CATCH = 2;
const PET_SIZE        = 72;
const PET_HALF        = PET_SIZE / 2;
const FOOD_SIZE       = 44;
const FOOD_HALF       = FOOD_SIZE / 2;
const PET_BOTTOM_PAD  = 22;   // game area bottom → pet anchor bottom
const GROUND_H        = 28;   // visual grass strip height
// Mouth Y = areaHeight - PET_BOTTOM_PAD - MOUTH_FROM_BOT
// Derived from: pet top ≈ areaH - 100, mouth at ~51px from pet top → areaH - 49
// MOUTH_FROM_BOT = 49 - PET_BOTTOM_PAD = 49 - 22 = 27, using 30 for generosity
const MOUTH_FROM_BOT  = 30;
const MOUTH_HW        = 34;   // horizontal hitbox half-width
const MOUTH_HH        = 30;   // vertical hitbox half-height
const FALL_BASE_MS    = 2200; // starting fall duration
const FALL_MIN_MS     = 900;  // fastest fall
const FOODS = ['🍎', '🍌', '🍓', '🍊', '🍇', '🥕', '🌽', '🍉', '🥝', '🫐'];

// ── Mini pet component ────────────────────────────────────────────
function GamePet({ mouthOpen, palette }) {
  const headColor = palette?.body   || '#90caf9';
  const earColor  = palette?.ear    || '#64b5f6';
  const shadowClr = palette?.shadow || '#5599e0';

  return (
    <View style={{ width: PET_SIZE, alignItems: 'center' }}>
      {/* Ears */}
      <View style={[petS.ear, { left: 5, backgroundColor: earColor }]} />
      <View style={[petS.ear, { right: 5, backgroundColor: earColor }]} />

      {/* Head */}
      <View style={[petS.head, { backgroundColor: headColor, shadowColor: shadowClr }]}>
        {/* Eyes */}
        <View style={petS.eyesRow}>
          <View style={petS.eye}><View style={petS.pupil} /></View>
          <View style={petS.eye}><View style={petS.pupil} /></View>
        </View>
        {/* Nose */}
        <View style={petS.nose} />
        {/* Mouth */}
        {mouthOpen
          ? <View style={petS.mouthOpen} />
          : <View style={petS.mouthClosed} />
        }
      </View>

      {/* Ground shadow */}
      <View style={petS.groundShadow} />
    </View>
  );
}

const petS = StyleSheet.create({
  head: {
    width: PET_SIZE, height: PET_SIZE, borderRadius: PET_HALF,
    alignItems: 'center', paddingTop: 12, zIndex: 2,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 5,
  },
  ear: {
    width: 22, height: 26, borderRadius: 11,
    position: 'absolute', top: -4, zIndex: 1,
  },
  eyesRow:     { flexDirection: 'row', gap: 10, marginBottom: 4 },
  eye:         { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pupil:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e' },
  nose:        { width: 14, height: 9, borderRadius: 7, backgroundColor: '#3a2020', marginBottom: 4 },
  mouthClosed: { width: 20, height: 5, borderRadius: 3, backgroundColor: '#3a2020' },
  mouthOpen: {
    width: 30, height: 18, borderRadius: 15,
    backgroundColor: '#c62828', borderWidth: 2, borderColor: '#3a2020',
  },
  groundShadow: {
    width: PET_SIZE * 0.62, height: 8, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.13)', marginTop: 4,
  },
});

// ── Main screen ───────────────────────────────────────────────────
export default function GameCatchScreen({ navigation }) {
  const { addGameCoins, addGameHappiness, triggerEat, petPalette } = usePet();

  const [phase,      setPhase]      = useState('intro');
  const [score,      setScore]      = useState(0);
  const [missed,     setMissed]     = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(GAME_DURATION);
  const [mouthOpen,  setMouthOpen]  = useState(false);
  const [catchMsg,   setCatchMsg]   = useState(null);
  const [foodActive, setFoodActive] = useState(false);
  const [foodX,      setFoodX]      = useState(0);
  const [foodEmoji,  setFoodEmoji]  = useState('🍎');

  // ── Refs ─────────────────────────────────────────────────────────
  const petXRef        = useRef(150);           // pet center X (pixels)
  const petXAnim       = useRef(new Animated.Value(0)).current;  // left edge
  const foodYAnim      = useRef(new Animated.Value(-FOOD_SIZE)).current;
  const foodXRef       = useRef(0);             // food left edge (static per spawn)
  const foodYValRef    = useRef(-FOOD_SIZE);    // mirrored from addListener
  const foodAnimRef    = useRef(null);
  const foodCaughtRef  = useRef(false);
  const areaWidthRef   = useRef(0);
  const areaHeightRef  = useRef(0);
  const scoreRef       = useRef(0);
  const coinsAdded     = useRef(false);
  const gameActive     = useRef(false);
  const dragStart      = useRef({ petX: 0, touchX: 0 });

  // ── Food Y listener → collision detection ────────────────────────
  useEffect(() => {
    const listenerId = foodYAnim.addListener(({ value }) => {
      foodYValRef.current = value;
      if (!foodCaughtRef.current && gameActive.current) {
        checkCollision(value);
      }
    });
    return () => foodYAnim.removeListener(listenerId);
  }, []);

  // ── Game timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const tid = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tid);
          gameActive.current = false;
          if (foodAnimRef.current) foodAnimRef.current.stop();
          setPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tid);
  }, [phase]);

  // ── Award coins when result ──────────────────────────────────────
  useEffect(() => {
    if (phase === 'result' && !coinsAdded.current) {
      coinsAdded.current = true;
      addGameCoins(scoreRef.current * COINS_PER_CATCH);
    }
  }, [phase]);

  // ── Spawn first food after game starts ───────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setTimeout(() => { if (gameActive.current) spawnFood(); }, 550);
    return () => clearTimeout(t);
  }, [phase]);

  // ── PanResponder — drag pet left/right ───────────────────────────
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (_, gs) => {
      dragStart.current = { petX: petXRef.current, touchX: gs.x0 };
    },
    onPanResponderMove: (_, gs) => {
      const delta = gs.moveX - dragStart.current.touchX;
      const maxX  = areaWidthRef.current - PET_HALF;
      const newX  = Math.max(PET_HALF, Math.min(maxX, dragStart.current.petX + delta));
      petXRef.current = newX;
      petXAnim.setValue(newX - PET_HALF);  // left edge
    },
  })).current;

  // ── Game logic ───────────────────────────────────────────────────
  function spawnFood() {
    if (!gameActive.current) return;
    if (!areaWidthRef.current) {
      setTimeout(() => spawnFood(), 200);
      return;
    }
    const x     = Math.max(8, Math.floor(Math.random() * (areaWidthRef.current - FOOD_SIZE - 8)));
    const emoji = FOODS[Math.floor(Math.random() * FOODS.length)];

    foodXRef.current      = x;
    foodCaughtRef.current = false;
    foodYAnim.setValue(-FOOD_SIZE);
    foodYValRef.current   = -FOOD_SIZE;
    setFoodX(x);
    setFoodEmoji(emoji);
    setFoodActive(true);

    const fallMs = Math.max(FALL_MIN_MS, FALL_BASE_MS - scoreRef.current * 55);
    foodAnimRef.current = Animated.timing(foodYAnim, {
      toValue: areaHeightRef.current + FOOD_SIZE,
      duration: fallMs,
      useNativeDriver: true,
    });
    foodAnimRef.current.start(({ finished }) => {
      if (finished && !foodCaughtRef.current && gameActive.current) {
        onFoodMissed();
      }
    });
  }

  function checkCollision(yVal) {
    if (!areaHeightRef.current) return;
    const petMouthY   = areaHeightRef.current - PET_BOTTOM_PAD - MOUTH_FROM_BOT;
    const foodCenterY = yVal + FOOD_HALF;
    const foodCenterX = foodXRef.current + FOOD_HALF;
    const petCenterX  = petXRef.current;

    if (
      Math.abs(foodCenterY - petMouthY) < MOUTH_HH &&
      Math.abs(foodCenterX - petCenterX) < MOUTH_HW
    ) {
      foodCaughtRef.current = true;
      onFoodCaught();
    }
  }

  function onFoodCaught() {
    if (foodAnimRef.current) foodAnimRef.current.stop();
    setFoodActive(false);
    scoreRef.current += 1;
    setScore(s => s + 1);
    // Open mouth animation
    setMouthOpen(true);
    setTimeout(() => setMouthOpen(false), 420);
    // Feedback + global pet boosts
    showMsg('😋 Caught! +' + COINS_PER_CATCH + '🪙');
    triggerEat(5);
    addGameHappiness(4);  // +4 happiness per catch
    setTimeout(() => { if (gameActive.current) spawnFood(); }, 700);
  }

  function onFoodMissed() {
    setFoodActive(false);
    setMissed(m => m + 1);
    showMsg('💨 Missed!');
    setTimeout(() => { if (gameActive.current) spawnFood(); }, 550);
  }

  function showMsg(msg) {
    setCatchMsg(msg);
    setTimeout(() => setCatchMsg(null), 900);
  }

  function startGame() {
    scoreRef.current   = 0;
    coinsAdded.current = false;
    gameActive.current = true;
    setScore(0);
    setMissed(0);
    setTimeLeft(GAME_DURATION);
    setMouthOpen(false);
    setFoodActive(false);
    setCatchMsg(null);
    // Center pet
    const cx = (areaWidthRef.current || 160);
    petXRef.current = cx;
    petXAnim.setValue(cx - PET_HALF);
    setPhase('playing');
  }

  const coinsEarned = score * COINS_PER_CATCH;
  const timerColor  = timeLeft <= 5 ? '#e53935' : '#a07800';

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            gameActive.current = false;
            if (foodAnimRef.current) foodAnimRef.current.stop();
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Games</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🍎 Catch Game</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <View style={styles.centerContent}>
          <Text style={styles.introEmoji}>🍎</Text>
          <Text style={styles.buddyMsg}>Buddy is ready! 🎮</Text>
          <Text style={styles.instrTitle}>How to Play</Text>
          <Text style={styles.instrText}>
            Food falls from the sky!{'\n'}
            <Text style={{ fontWeight: '900' }}>Drag Buddy</Text> left & right{'\n'}
            to catch food with his mouth!{'\n'}
            You have <Text style={{ fontWeight: '900' }}>{GAME_DURATION} seconds</Text>. 🍽️
          </Text>
          <Text style={styles.rewardLine}>Each catch → +{COINS_PER_CATCH} 🪙 + hunger 🍖</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>▶  Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <View style={styles.playArea}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>CAUGHT</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={[styles.statPill, { borderColor: timerColor }]}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={[styles.statValue, { color: timerColor }]}>{timeLeft}s</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>COINS</Text>
              <Text style={[styles.statValue, { color: '#a07800' }]}>{coinsEarned}🪙</Text>
            </View>
          </View>

          {/* Feedback / hint */}
          <View style={styles.msgRow}>
            {catchMsg
              ? <Text style={[
                  styles.catchMsg,
                  { color: catchMsg.startsWith('😋') ? '#2e8b5a' : '#aaa' },
                ]}>{catchMsg}</Text>
              : <Text style={styles.dragHint}>⟵  Drag Buddy  ⟶</Text>
            }
          </View>

          {/* Game area */}
          <View
            style={styles.gameArea}
            onLayout={({ nativeEvent: { layout } }) => {
              areaWidthRef.current  = layout.width;
              areaHeightRef.current = layout.height;
            }}
            {...panResponder.panHandlers}
          >
            {/* Sky decoration */}
            <Text style={styles.cloud1}>☁️</Text>
            <Text style={styles.cloud2}>☁️</Text>

            {/* Falling food */}
            {foodActive && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.foodItem,
                  { left: foodX, transform: [{ translateY: foodYAnim }] },
                ]}
              >
                <Text style={styles.foodEmoji}>{foodEmoji}</Text>
              </Animated.View>
            )}

            {/* Ground strip */}
            <View style={styles.ground}>
              <Text style={styles.grassEmoji}>🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿</Text>
            </View>

            {/* Pet — draggable, sits on ground */}
            <Animated.View
              pointerEvents="none"
              style={[styles.petAnchor, { left: petXAnim }]}
            >
              <GamePet mouthOpen={mouthOpen} palette={petPalette} />
            </Animated.View>
          </View>
        </View>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <View style={styles.centerContent}>
          <Text style={styles.resultEmoji}>{score === 0 ? '😅' : '🎉'}</Text>
          <Text style={styles.resultTitle}>Great job Buddy!</Text>
          <Text style={styles.resultStat}>
            Caught <Text style={styles.bold}>{score}</Text> item{score !== 1 ? 's' : ''}
            {missed > 0 ? `, missed ${missed}` : ' — no misses!'}!
          </Text>
          <View style={styles.coinResult}>
            <Text style={styles.coinResultText}>You earned  {coinsEarned} coins 🎉</Text>
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
  screen: { flex: 1, backgroundColor: '#fffbf0' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#a07800',
  },
  backBtn:   { padding: 4 },
  backText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  gameTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },

  centerContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  introEmoji:  { fontSize: 72 },
  buddyMsg:    { fontSize: 18, fontWeight: '800', color: '#a07800', textAlign: 'center' },
  instrTitle:  { fontSize: 16, fontWeight: '900', color: '#3a3a5c', marginTop: 8 },
  instrText:   { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 24 },
  rewardLine: {
    backgroundColor: '#fff5d4', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 8,
    fontSize: 15, fontWeight: '800', color: '#a07800',
  },
  startBtn: {
    backgroundColor: '#a07800', borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 48, marginTop: 8,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // ── Play layout
  playArea: { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },

  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 6, justifyContent: 'center',
  },
  statPill: {
    alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 2, borderColor: '#d4b84a',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#3a3a5c' },

  msgRow: { height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catchMsg: { fontSize: 17, fontWeight: '900' },
  dragHint: { fontSize: 13, color: '#bbb', fontWeight: '600', letterSpacing: 0.5 },

  // ── Game area
  gameArea: {
    flex: 1,
    backgroundColor: '#d6eeff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2, borderColor: '#d4b84a',
    position: 'relative',
  },

  cloud1: { position: 'absolute', top: 14, left: '15%', fontSize: 28, opacity: 0.6 },
  cloud2: { position: 'absolute', top: 34, right: '18%', fontSize: 22, opacity: 0.5 },

  foodItem: {
    position: 'absolute', top: 0,
    width: FOOD_SIZE, height: FOOD_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  foodEmoji: { fontSize: FOOD_SIZE - 4 },

  ground: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: GROUND_H,
    backgroundColor: '#5aaa5a',
    borderTopWidth: 2, borderTopColor: '#3d8a3d',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  grassEmoji: { fontSize: 11, letterSpacing: 2, marginTop: 2, opacity: 0.5 },

  petAnchor: {
    position: 'absolute',
    bottom: GROUND_H - 4,
    width: PET_SIZE,
  },

  // ── Result
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { fontSize: 24, fontWeight: '900', color: '#a07800' },
  resultStat:      { fontSize: 15, color: '#555' },
  bold:            { fontWeight: '900', color: '#3a3a5c' },
  coinResult: {
    backgroundColor: '#fff8e1', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 28,
    borderWidth: 2, borderColor: '#f4c542', marginVertical: 4,
  },
  coinResultText: { fontSize: 20, fontWeight: '900', color: '#a07800', textAlign: 'center' },
  backGameBtn: {
    borderWidth: 2, borderColor: '#a07800', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 32, marginTop: 8,
  },
  backGameBtnText: { color: '#a07800', fontSize: 15, fontWeight: '800' },
  playAgainBtn: {
    backgroundColor: '#a07800', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  playAgainBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
