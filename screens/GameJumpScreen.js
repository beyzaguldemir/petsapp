import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { usePet } from '../context/PetContext';

// ── Physics & layout constants ────────────────────────────────────
const PET_SIZE    = 48;
const PET_HALF    = PET_SIZE / 2;
const PLAT_H      = 14;
const COIN_SIZE   = 22;
const COIN_HALF   = COIN_SIZE / 2;
const JUMP_VEL    = 19;     // world-units/frame upward velocity on jump
const GRAVITY     = 0.60;   // world-units/frame² downward acceleration
const MAX_FALL    = 19;     // cap on fall speed
// GAP and PLAT_W are now computed dynamically from screen size (see generatePlatforms)
const COIN_CHANCE = 0.36;   // probability a platform spawns a coin above it
const CAM_RATIO   = 0.58;   // pet stays at (1-CAM_RATIO)×screenH from top while rising
const ACCEL       = 0.7;    // horizontal acceleration per frame while key/btn held
const FRICTION    = 0.80;   // horizontal velocity multiplier when no key held
const MAX_SPD     = 9;      // maximum horizontal speed (px/frame)

// ── Mini pet component ────────────────────────────────────────────
function DoodlePet({ mouthOpen, palette, bounceAnim }) {
  const headColor = palette?.body   || '#90caf9';
  const earColor  = palette?.ear    || '#64b5f6';
  const shadowClr = palette?.shadow || '#5599e0';
  return (
    <Animated.View style={[petS.wrap, { transform: [{ scale: bounceAnim }] }]}>
      <View style={[petS.ear, petS.earL, { backgroundColor: earColor }]} />
      <View style={[petS.ear, petS.earR, { backgroundColor: earColor }]} />
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
    </Animated.View>
  );
}

const petS = StyleSheet.create({
  wrap: { width: PET_SIZE, height: PET_SIZE, alignItems: 'center' },
  head: {
    width: PET_SIZE, height: PET_SIZE, borderRadius: PET_HALF,
    alignItems: 'center', paddingTop: 11, zIndex: 1,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 5,
  },
  ear:         { width: 19, height: 22, borderRadius: 10, position: 'absolute', top: -3, zIndex: 0 },
  earL:        { left: 7 },
  earR:        { right: 7 },
  eyesRow:     { flexDirection: 'row', gap: 9, marginBottom: 4 },
  eye:         { width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pupil:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#1a1a2e' },
  nose:        { width: 12, height: 8, borderRadius: 6, backgroundColor: '#3a2020', marginBottom: 3 },
  mouthClosed: { width: 18, height: 4, borderRadius: 3, backgroundColor: '#3a2020' },
  mouthOpen:   { width: 26, height: 14, borderRadius: 13, backgroundColor: '#c62828', borderWidth: 2, borderColor: '#3a2020' },
});

// ── Main screen ───────────────────────────────────────────────────
export default function GameJumpScreen({ navigation }) {
  const { addGameCoins, addGameHappiness, petPalette } = usePet();

  const [phase, setPhase] = useState('intro');
  const [frame, setFrame] = useState(0);   // incremented each game tick → re-render

  const areaW      = useRef(0);
  const areaH      = useRef(0);
  const loopRef    = useRef(null);
  const mountedRef = useRef(true);
  const keysRef    = useRef({ left: false, right: false }); // keyboard / button state

  // ── All physics state lives here (never triggers re-renders directly) ──
  const G = useRef({
    petX: 0, petVX: 0, petWorldY: 0, petVY: 0,
    cameraY: 0,
    score: 0,
    coinsCollected: 0,
    happinessEarned: 0,
    platforms: [],
    coins: [],
    mouthOpen: false, mouthTimer: 0,
    justLanded: false,
    highestPlatY: 0,
    nextPlatId: 0, nextCoinId: 0,
    alive: false,
  });

  const finalScore   = useRef(0);
  const finalCoins   = useRef(0);
  const coinsAdded   = useRef(false);
  const gameStartTime = useRef(0);

  // Bounce spring animation (native driver — runs off JS thread)
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, []);

  // Award coins + happiness when result phase begins
  useEffect(() => {
    if (phase === 'result' && !coinsAdded.current) {
      coinsAdded.current = true;
      addGameCoins(Math.floor(finalScore.current / 4) + finalCoins.current * 2);
      addGameHappiness(Math.min(G.current.happinessEarned, 40)); // cap +40 happiness
    }
  }, [phase]);

  // Trigger bounce spring whenever pet just landed
  useEffect(() => {
    if (G.current.justLanded) {
      G.current.justLanded = false;
      bounceAnim.setValue(1.22);
      Animated.spring(bounceAnim, {
        toValue: 1, friction: 3, tension: 260, useNativeDriver: true,
      }).start();
    }
  }, [frame]);

  // ── Keyboard controls (web / desktop) ───────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const down = (e) => {
      if (e.key === 'ArrowLeft')  keysRef.current.left  = true;
      if (e.key === 'ArrowRight') keysRef.current.right = true;
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft')  keysRef.current.left  = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup',   up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup',   up);
    };
  }, []);

  // ── PanResponder: drag to steer left/right ───────────────────────
  const dragStart = useRef({ petX: 0, touchX: 0 });
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => G.current.alive,
    onMoveShouldSetPanResponder:  () => G.current.alive,
    onPanResponderGrant: (_, gs) => {
      G.current.petVX = 0;   // cancel keyboard momentum when drag starts
      dragStart.current = { petX: G.current.petX, touchX: gs.x0 };
    },
    onPanResponderMove: (_, gs) => {
      const W = areaW.current;
      if (!W) return;
      let nx = dragStart.current.petX + (gs.moveX - dragStart.current.touchX);
      // Wrap around screen edges (Doodle Jump style)
      if (nx < -PET_HALF) { nx = W + PET_HALF; dragStart.current = { petX: nx, touchX: gs.moveX }; }
      else if (nx > W + PET_HALF) { nx = -PET_HALF; dragStart.current = { petX: nx, touchX: gs.moveX }; }
      G.current.petX = nx;
    },
  })).current;

  // ── Game logic ────────────────────────────────────────────────────
  function generatePlatforms() {
    const g = G.current;
    const W = areaW.current || 300;
    const H = areaH.current || 600;
    const buffer = H * 2.5;

    // Responsive platform width: ~28% of screen width, clamped between 72–120px
    const platW  = Math.max(72, Math.min(120, W * 0.28));
    // Responsive gap: 15%–22% of screen height → clear visible space between platforms
    const gapMin = H * 0.15;
    const gapMax = H * 0.22;

    while (g.highestPlatY < g.cameraY + buffer) {
      const gap = gapMin + Math.random() * (gapMax - gapMin);
      g.highestPlatY += gap;
      const x = 8 + Math.random() * (W - platW - 16);
      g.platforms.push({ id: g.nextPlatId++, x, worldY: g.highestPlatY, platW });
      if (Math.random() < COIN_CHANCE) {
        g.coins.push({
          id: g.nextCoinId++,
          x:      x + platW / 2,                // center X
          worldY: g.highestPlatY + PLAT_H + COIN_HALF + 10, // center Y
          collected: false,
        });
      }
    }
  }

  function initGame() {
    const g = G.current;
    const W = areaW.current || 300;
    g.petX       = W / 2;
    g.petVX      = 0;
    g.petWorldY  = 90;    // feet height in world units
    g.petVY      = JUMP_VEL;
    g.cameraY    = 0;
    g.score      = 0;
    g.happinessEarned = 0;
    g.coinsCollected = 0;
    g.platforms  = [];
    g.coins      = [];
    g.mouthOpen  = false;
    g.mouthTimer = 0;
    g.justLanded = false;
    g.highestPlatY = 0;
    g.nextPlatId = 0;
    g.nextCoinId = 0;
    g.alive      = true;
    // Spawn starter platform directly under pet (responsive width)
    const startPlatW = Math.max(72, Math.min(120, W * 0.28));
    g.platforms.push({ id: g.nextPlatId++, x: W / 2 - startPlatW / 2, worldY: 68, platW: startPlatW });
    g.highestPlatY = 68;
    generatePlatforms();
  }

  function gameTick() {
    const g = G.current;
    if (!g.alive) return;

    // ── Physics ───────────────────────────────────────────────────
    const prevY = g.petWorldY;
    g.petVY     = Math.max(g.petVY - GRAVITY, -MAX_FALL);
    g.petWorldY += g.petVY;

    // Horizontal acceleration — builds up while key/btn held, decelerates on release
    if (keysRef.current.left) {
      g.petVX = Math.max(g.petVX - ACCEL, -MAX_SPD);
    } else if (keysRef.current.right) {
      g.petVX = Math.min(g.petVX + ACCEL, MAX_SPD);
    } else {
      g.petVX *= FRICTION;
      if (Math.abs(g.petVX) < 0.15) g.petVX = 0;
    }
    g.petX += g.petVX;

    // Horizontal wrap
    const W = areaW.current;
    if (g.petX < -PET_HALF)       g.petX = W + PET_HALF;
    else if (g.petX > W + PET_HALF) g.petX = -PET_HALF;

    // ── Platform landing (only while falling) ────────────────────
    if (g.petVY < 0) {
      for (const plat of g.platforms) {
        // Pet bottom (prevY→petWorldY) crossed platform surface (plat.worldY)
        if (prevY >= plat.worldY && g.petWorldY <= plat.worldY) {
          const pL = g.petX - PET_HALF + 8;   // narrow hitbox for fairness
          const pR = g.petX + PET_HALF - 8;
          if (pR > plat.x && pL < plat.x + (plat.platW || 96)) {
            g.petWorldY  = plat.worldY;
            g.petVY      = JUMP_VEL;
            g.mouthOpen  = true;
            g.mouthTimer = 10;
            g.justLanded = true;
            g.happinessEarned += 2; // +2 happiness per platform landing
            break;
          }
        }
      }
    }

    if (g.mouthTimer > 0 && --g.mouthTimer === 0) g.mouthOpen = false;

    // ── Camera: only scrolls upward ───────────────────────────────
    const targetCam = g.petWorldY - areaH.current * CAM_RATIO;
    if (targetCam > g.cameraY) g.cameraY = targetCam;

    // ── Score: max height reached ─────────────────────────────────
    g.score = Math.max(g.score, Math.floor(g.cameraY / 8));

    // ── Coin collection ───────────────────────────────────────────
    const petCY = g.petWorldY + PET_HALF;
    for (const coin of g.coins) {
      if (coin.collected) continue;
      if (
        Math.abs(coin.x - g.petX) < PET_HALF + COIN_HALF &&
        Math.abs(coin.worldY - petCY) < PET_HALF + COIN_HALF
      ) {
        coin.collected = true;
        g.coinsCollected++;
        g.happinessEarned += 3; // +3 happiness per coin collected
      }
    }

    // ── Generate & clean up platforms ────────────────────────────
    generatePlatforms();
    const cutoff = g.cameraY - areaH.current * 0.6;
    g.platforms = g.platforms.filter(p => p.worldY > cutoff);
    g.coins     = g.coins.filter(c => c.worldY > cutoff);

    // ── Game over: pet fell below screen ─────────────────────────
    if (g.petWorldY - g.cameraY < -(PET_SIZE + 30)) {
      g.alive = false;
      stopGameLoop();
      finalScore.current = g.score;
      finalCoins.current = g.coinsCollected;
      coinsAdded.current = false;
      if (mountedRef.current) setTimeout(() => setPhase('result'), 150);
    }
  }

  function startGameLoop() {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(() => {
      gameTick();
      if (mountedRef.current) setFrame(f => (f + 1) & 0xFFFF);
    }, 16);
  }

  function stopGameLoop() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
  }

  function startGame() {
    coinsAdded.current  = false;
    gameStartTime.current = Date.now();
    initGame();
    startGameLoop();
    setPhase('playing');
  }

  // ── Render-time helpers (called 60×/s during play) ───────────────
  const g   = G.current;
  const cam = g.cameraY;
  const H   = areaH.current;

  // worldY → position of TOP of the object from screen BOTTOM
  // bottom: worldY - cam         → object bottom at worldY - cam above screen-bottom
  // For platforms: bottom = worldY - cam - PLAT_H  (top at worldY - cam)
  // For coins:     bottom = worldY - cam - COIN_HALF (center at worldY - cam)
  // For pet:       bottom = worldY - cam             (feet at worldY - cam)
  const visiblePlats = phase === 'playing'
    ? g.platforms.filter(p => { const b = p.worldY - cam; return b > -PLAT_H && b < H + PLAT_H; })
    : [];
  const visibleCoins = phase === 'playing'
    ? g.coins.filter(c => { if (c.collected) return false; const b = c.worldY - cam; return b > -COIN_SIZE && b < H + COIN_SIZE; })
    : [];

  const petScreenBottom = g.petWorldY - cam;
  const petScreenLeft   = g.petX - PET_HALF;
  const showDragHint    = phase === 'playing' && Date.now() - gameStartTime.current < 3500;
  const totalCoins      = Math.floor(finalScore.current / 4) + finalCoins.current * 2;

  return (
    <View style={styles.screen}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { stopGameLoop(); navigation.goBack(); }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Games</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>🦘 Jump Game</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* ── Arena (always rendered so onLayout fires early) ── */}
      <View
        style={styles.arena}
        onLayout={({ nativeEvent: { layout } }) => {
          areaW.current = layout.width;
          areaH.current = layout.height;
        }}
      >
        {/* Layered sky background */}
        <View style={[StyleSheet.absoluteFill, styles.skyTop]} />
        <View style={[StyleSheet.absoluteFill, styles.skyBottom]} />

        {/* ── PLAYING ── */}
        {phase === 'playing' && (
          <>
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>

            {/* HUD */}
            <View style={styles.hud}>
              <View style={styles.hudPill}>
                <Text style={styles.hudText}>📏 {g.score}m</Text>
              </View>
              <View style={styles.hudPill}>
                <Text style={styles.hudText}>🪙 {g.coinsCollected}</Text>
              </View>
            </View>

            {/* Platforms */}
            {visiblePlats.map(p => (
              <View
                key={p.id}
                style={[styles.platform, {
                  left:   p.x,
                  bottom: p.worldY - cam - PLAT_H,
                  width:  p.platW || 96,
                }]}
              >
                {/* Grass tufts */}
                <View style={styles.platGrass} />
              </View>
            ))}

            {/* Coins */}
            {visibleCoins.map(c => (
              <View
                key={c.id}
                style={[styles.coinItem, {
                  left:   c.x - COIN_HALF,
                  bottom: c.worldY - cam - COIN_HALF,
                }]}
              >
                <Text style={styles.coinEmoji}>🪙</Text>
              </View>
            ))}

            {/* Pet */}
            <View
              style={{
                position: 'absolute',
                bottom: petScreenBottom,
                left:   petScreenLeft,
                width:  PET_SIZE,
                height: PET_SIZE,
              }}
            >
              <DoodlePet
                mouthOpen={g.mouthOpen}
                palette={petPalette}
                bounceAnim={bounceAnim}
              />
            </View>

            {/* Control hint (first 3.5s) */}
            {showDragHint && (
              <View style={styles.hintWrap} pointerEvents="none">
                <Text style={styles.hintText}>⬅ Arrow keys or buttons to move ➡</Text>
              </View>
            )}
          </View>

          {/* ◀ ▶ On-screen control buttons — outside PanResponder so they get taps */}
          <View style={styles.ctrlRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPressIn={() => { keysRef.current.left = true; }}
              onPressOut={() => { keysRef.current.left = false; }}
              activeOpacity={0.7}
            >
              <Text style={styles.ctrlBtnText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPressIn={() => { keysRef.current.right = true; }}
              onPressOut={() => { keysRef.current.right = false; }}
              activeOpacity={0.7}
            >
              <Text style={styles.ctrlBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
          </>
        )}

        {/* ── INTRO overlay ── */}
        {phase === 'intro' && (
          <View style={styles.overlay}>
            <Text style={styles.introEmoji}>🦘</Text>
            <Text style={styles.buddyMsg}>Buddy is jumping! 🐾</Text>
            <Text style={styles.instrTitle}>How to Play</Text>
            <Text style={styles.instrText}>
              Buddy auto-jumps on every platform!{'\n'}
              Steer him <Text style={{ fontWeight: '900' }}>left/right</Text> using:{'\n'}
              <Text style={{ fontWeight: '900' }}>⌨️  ← → Arrow Keys</Text> (keyboard){'\n'}
              <Text style={{ fontWeight: '900' }}>◀  ▶ Buttons</Text> at the bottom{'\n'}
              Collect <Text style={{ fontWeight: '900' }}>🪙 coins</Text> and don't fall! 💨
            </Text>
            <View style={styles.rewardBox}>
              <Text style={styles.rewardLine}>🏔️  Score = height reached (metres)</Text>
              <Text style={styles.rewardLine}>🪙  +5 coins per coin collected</Text>
              <Text style={styles.rewardLine}>🎁  Height bonus added at end!</Text>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>▶  Start Jump!</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RESULT overlay ── */}
        {phase === 'result' && (
          <View style={styles.overlay}>
            <Text style={styles.resultEmoji}>
              {finalScore.current >= 300 ? '🏆' : finalScore.current >= 100 ? '🌟' : '🎉'}
            </Text>
            <Text style={styles.resultTitle}>
              {finalScore.current >= 300 ? 'Legendary!' : finalScore.current >= 100 ? 'Amazing!' : 'Great jump Buddy!'}
            </Text>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>HEIGHT</Text>
                <Text style={styles.resultValue}>{finalScore.current} m</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>COINS COLLECTED</Text>
                <Text style={styles.resultValue}>🪙 ×{finalCoins.current}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>TOTAL REWARD</Text>
                <Text style={[styles.resultValue, { color: '#a07800', fontSize: 22 }]}>
                  {totalCoins} 🪙
                </Text>
              </View>
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
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#c8e6f8' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#2e7d32',
  },
  backBtn:   { padding: 4 },
  backText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  gameTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },

  arena: { flex: 1, overflow: 'hidden', position: 'relative' },

  skyTop: {
    backgroundColor: '#d6eeff',
    top: 0, left: 0, right: 0, height: '55%',
  },
  skyBottom: {
    backgroundColor: '#b8d8f0',
    bottom: 0, left: 0, right: 0, height: '45%',
  },

  // ── HUD
  hud: {
    position: 'absolute', top: 10, left: 12,
    flexDirection: 'row', gap: 8, zIndex: 10,
  },
  hudPill: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  hudText: { fontSize: 14, fontWeight: '900', color: '#2e7d32' },

  // ── Platform
  platform: {
    position: 'absolute',
    height: PLAT_H,
    backgroundColor: '#43a047',
    borderRadius: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#1b5e20',
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
    overflow: 'hidden',
  },
  platGrass: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 4, backgroundColor: '#66bb6a', borderRadius: 4,
  },

  // ── Coin
  coinItem: {
    position: 'absolute',
    width: COIN_SIZE, height: COIN_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  coinEmoji: { fontSize: COIN_SIZE - 2 },

  // ── Drag hint
  hintWrap: {
    position: 'absolute', bottom: 100, left: 0, right: 0,
    alignItems: 'center',
  },
  hintText: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 14, fontSize: 13, fontWeight: '700', color: '#3a3a5c',
    overflow: 'hidden',
  },

  // ── Overlay base (intro + result)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240,250,255,0.93)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, gap: 12,
  },
  introEmoji:  { fontSize: 72 },
  buddyMsg:    { fontSize: 20, fontWeight: '900', color: '#2e7d32', textAlign: 'center' },
  instrTitle:  { fontSize: 15, fontWeight: '900', color: '#3a3a5c', marginTop: 4 },
  instrText:   { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 22 },
  rewardBox: {
    backgroundColor: '#e8f5e9', borderRadius: 14,
    padding: 14, width: '100%',
    borderWidth: 1.5, borderColor: '#81c784', gap: 4,
  },
  rewardLine:  { fontSize: 13, fontWeight: '700', color: '#2e7d32', textAlign: 'center' },
  startBtn: {
    backgroundColor: '#2e7d32', borderRadius: 18,
    paddingVertical: 15, paddingHorizontal: 52, marginTop: 6,
    shadowColor: '#2e7d32', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // ── Result overlay
  resultEmoji: { fontSize: 72 },
  resultTitle: { fontSize: 22, fontWeight: '900', color: '#2e7d32', textAlign: 'center' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 2, borderColor: '#a5d6a7',
    width: '100%', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  resultDivider: { height: 1, backgroundColor: '#e8f5e9' },
  resultLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1 },
  resultValue: { fontSize: 18, fontWeight: '900', color: '#2e7d32' },

  backGameBtn: {
    borderWidth: 2, borderColor: '#2e7d32', borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 30, marginTop: 6,
  },
  backGameBtnText: { color: '#2e7d32', fontSize: 15, fontWeight: '800' },
  playAgainBtn: {
    backgroundColor: '#2e7d32', borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 30,
    shadowColor: '#2e7d32', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  playAgainBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── On-screen control buttons
  ctrlRow: {
    position: 'absolute',
    bottom: 20, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 30,
  },
  ctrlBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(46,125,50,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  ctrlBtnText: { fontSize: 26, color: '#fff', fontWeight: '900', lineHeight: 30 },
});
