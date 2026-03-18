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
const GROUND_H        = 28;
const LOOP_MS         = 16;   // ~60 fps game loop
const FALL_BASE_MS    = 2200;
const FALL_MIN_MS     = 900;

// Mouth hitbox — derived from actual layout:
//   petAnchor.bottom = GROUND_H - 4 = 24 (from area bottom)
//   GamePet flow height = PET_SIZE(72) + shadow(12) = 84
//   head top = areaH - 24 - 84 = areaH - 108
//   mouth center inside head = paddingTop(12)+eyes(18)+nose(13)+halfMouth(9) = 52
//   → petMouthY = areaH - 108 + 52 = areaH - 56
const MOUTH_Y_OFFSET  = 56;   // areaH - MOUTH_Y_OFFSET = petMouthY
const MOUTH_HW        = 38;   // horizontal half-width  (actual ~15, +23 tolerance)
const MOUTH_HH        = 30;   // vertical half-height   (actual ~9,  +21 tolerance)

// Set to true to draw red/blue hitbox borders for visual alignment check
const DEBUG_HITBOX    = false;

const FOODS = ['🍎', '🍌', '🍓', '🍊', '🍇', '🥕', '🌽', '🍉', '🥝', '🫐'];

// ── Mini pet component ────────────────────────────────────────────
function GamePet({ mouthOpen, palette }) {
  const headColor = palette?.body   || '#90caf9';
  const earColor  = palette?.ear    || '#64b5f6';
  const shadowClr = palette?.shadow || '#5599e0';

  return (
    <View style={{ width: PET_SIZE, alignItems: 'center' }}>
      <View style={[petS.ear, { left: 5, backgroundColor: earColor }]} />
      <View style={[petS.ear, { right: 5, backgroundColor: earColor }]} />
      <View style={[petS.head, { backgroundColor: headColor, shadowColor: shadowClr }]}>
        <View style={petS.eyesRow}>
          <View style={petS.eye}><View style={petS.pupil} /></View>
          <View style={petS.eye}><View style={petS.pupil} /></View>
        </View>
        <View style={petS.nose} />
        {mouthOpen
          ? <View style={petS.mouthOpen} />
          : <View style={petS.mouthClosed} />
        }
      </View>
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
  // Used only when DEBUG_HITBOX=true to force re-renders showing live hitboxes
  const [debugFrame, setDebugFrame] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────
  const petXRef       = useRef(150);   // pet center X, relative to game area
  const petXAnim      = useRef(new Animated.Value(0)).current;  // left edge

  // Food position — driven by JS game loop, not Animated.timing
  const foodYRef      = useRef(-FOOD_SIZE);  // food top edge, relative to game area
  const foodXRef      = useRef(0);           // food left edge (set on spawn)
  const foodYAnim     = useRef(new Animated.Value(-FOOD_SIZE)).current;

  const foodSpeedRef  = useRef(0);     // pixels per LOOP_MS tick
  const foodFalling   = useRef(false); // true while food is in flight

  const gameLoopRef   = useRef(null);  // setInterval id for food movement
  const foodCaughtRef = useRef(false);
  const areaWidthRef  = useRef(0);
  const areaHeightRef = useRef(0);
  const scoreRef      = useRef(0);
  const coinsAdded    = useRef(false);
  const gameActive    = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGameLoop();
    };
  }, []);

  // ── Game timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const tid = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tid);
          gameActive.current = false;
          stopGameLoop();
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

  // ── PanResponder — relative delta movement ───────────────────────
  // Uses gs.dx (total accumulated delta) instead of moveX - x0.
  // gs.dx is always in container-relative coordinates — works identically
  // on web and mobile.
  const dragStartPetX = useRef(0);
  const panResponder  = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      dragStartPetX.current = petXRef.current;
    },
    onPanResponderMove: (_, gs) => {
      // gs.dx is the total translation from the grant point — purely relative,
      // no absolute screen coordinate involved.
      const W    = areaWidthRef.current || 300;
      const newX = Math.max(PET_HALF, Math.min(W - PET_HALF, dragStartPetX.current + gs.dx));
      petXRef.current = newX;
      petXAnim.setValue(newX - PET_HALF);
    },
  })).current;

  // ── Game loop helpers ────────────────────────────────────────────
  function stopGameLoop() {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    foodFalling.current = false;
  }

  function startGameLoop() {
    stopGameLoop();
    foodFalling.current = true;
    gameLoopRef.current = setInterval(gameTick, LOOP_MS);
  }

  // ── Core game tick — runs at ~60fps ──────────────────────────────
  // This is the only place collision is checked, ensuring every frame
  // is evaluated regardless of platform or bridge load.
  function gameTick() {
    if (!gameActive.current || !foodFalling.current) return;

    // 1. Advance food position
    foodYRef.current += foodSpeedRef.current;

    // 2. Drive the Animated.Value from JS (no native driver timing running)
    foodYAnim.setValue(foodYRef.current);

    // 3. Debug re-render trigger
    if (DEBUG_HITBOX) setDebugFrame(f => (f + 1) & 0xFFFF);

    // 4. AABB collision detection
    //    All coordinates are relative to the game area container.
    const aH = areaHeightRef.current;
    if (!aH) return;

    const petMouthY = aH - MOUTH_Y_OFFSET; // mouth center Y from area top

    // Mouth bounding box
    const mL = petXRef.current  - MOUTH_HW;
    const mR = petXRef.current  + MOUTH_HW;
    const mT = petMouthY        - MOUTH_HH;
    const mB = petMouthY        + MOUTH_HH;

    // Food bounding box (top-left origin)
    const fL = foodXRef.current;
    const fR = fL + FOOD_SIZE;
    const fT = foodYRef.current;
    const fB = fT + FOOD_SIZE;

    const hit = fR > mL && fL < mR && fB > mT && fT < mB;

    if (hit) {
      foodCaughtRef.current = true;
      stopGameLoop();
      onFoodCaught();
      return;
    }

    // 5. Missed: food passed the bottom
    if (foodYRef.current > aH + FOOD_SIZE) {
      stopGameLoop();
      if (!foodCaughtRef.current) onFoodMissed();
    }
  }

  // ── Spawn food ───────────────────────────────────────────────────
  function spawnFood() {
    if (!gameActive.current) return;
    if (!areaWidthRef.current || !areaHeightRef.current) {
      setTimeout(() => spawnFood(), 200);
      return;
    }

    const x     = Math.max(8, Math.floor(Math.random() * (areaWidthRef.current - FOOD_SIZE - 8)));
    const emoji = FOODS[Math.floor(Math.random() * FOODS.length)];
    const fallMs = Math.max(FALL_MIN_MS, FALL_BASE_MS - scoreRef.current * 55);
    const totalDist = areaHeightRef.current + FOOD_SIZE * 2;

    foodXRef.current      = x;
    foodYRef.current      = -FOOD_SIZE;
    foodSpeedRef.current  = totalDist / (fallMs / LOOP_MS);
    foodCaughtRef.current = false;

    // Sync Animated.Value before loop starts (avoids stale render)
    foodYAnim.setValue(-FOOD_SIZE);

    setFoodX(x);
    setFoodEmoji(emoji);
    setFoodActive(true);

    startGameLoop();
  }

  function onFoodCaught() {
    setFoodActive(false);
    scoreRef.current += 1;
    setScore(s => s + 1);
    setMouthOpen(true);
    setTimeout(() => setMouthOpen(false), 420);
    showMsg('😋 Caught! +' + COINS_PER_CATCH + '🪙');
    triggerEat(5);
    addGameHappiness(4);
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
    stopGameLoop();
    scoreRef.current   = 0;
    coinsAdded.current = false;
    gameActive.current = true;
    setScore(0);
    setMissed(0);
    setTimeLeft(GAME_DURATION);
    setMouthOpen(false);
    setFoodActive(false);
    setCatchMsg(null);
    const cx = (areaWidthRef.current || 160);
    petXRef.current = cx / 2;
    petXAnim.setValue(cx / 2 - PET_HALF);
    setPhase('playing');
  }

  const coinsEarned = score * COINS_PER_CATCH;
  const timerColor  = timeLeft <= 5 ? '#e53935' : '#a07800';

  // Debug hitbox positions (only used when DEBUG_HITBOX=true)
  const dbgMouthL = petXRef.current  - MOUTH_HW;
  const dbgMouthT = areaHeightRef.current > 0
    ? areaHeightRef.current - MOUTH_Y_OFFSET - MOUTH_HH
    : 0;

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            gameActive.current = false;
            stopGameLoop();
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

            {/* Falling food — position driven by JS game loop via setValue */}
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

            {/* Pet */}
            <Animated.View
              pointerEvents="none"
              style={[styles.petAnchor, { left: petXAnim }]}
            >
              <GamePet mouthOpen={mouthOpen} palette={petPalette} />
            </Animated.View>

            {/* ── Debug hitboxes — set DEBUG_HITBOX=true to enable ── */}
            {DEBUG_HITBOX && (
              <>
                {/* Mouth hitbox (red) */}
                <View pointerEvents="none" style={{
                  position: 'absolute',
                  left:   dbgMouthL,
                  top:    dbgMouthT,
                  width:  MOUTH_HW * 2,
                  height: MOUTH_HH * 2,
                  borderWidth: 2, borderColor: 'red', opacity: 0.7,
                }} />
                {/* Food hitbox (blue) */}
                {foodActive && (
                  <View pointerEvents="none" style={{
                    position: 'absolute',
                    left:   foodXRef.current,
                    top:    foodYRef.current,
                    width:  FOOD_SIZE,
                    height: FOOD_SIZE,
                    borderWidth: 2, borderColor: 'blue', opacity: 0.7,
                  }} />
                )}
              </>
            )}
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
