import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { usePet } from '../context/PetContext';
import PetStatusBar from '../components/PetStatusBar';
import { findItem } from '../constants/shopItems';

// ── screen metrics ───────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const CENTER = SCREEN_W / 2;

// ── water drop columns, spread around screen center ──────────
const DROPS = [-56,-40,-24,-10,4,18,32,46,60,74].map(o => ({ left: CENTER + o }));

// Pet colours come from context (level-based palette)

// ── BathPet body size ─────────────────────────────────────────
const PET_SIZE = 150;

// Mood drives only blush display
function getMood(happiness) {
  if (happiness > 70) return { showBlush: true,  cheekColor: '#f48fb1' };
  return                     { showBlush: false, cheekColor: 'transparent' };
}

// ── Inline pet face — no card, no stats, no labels ───────────
function BathPet() {
  const { happiness, isEating, isPlaying, cleanliness, equippedItems, petPalette } = usePet();
  const hatItem       = findItem(equippedItems.hat);
  const glassesItem   = findItem(equippedItems.glasses);
  const shoesItem     = findItem(equippedItems.shoes);
  const isDarkGlasses = glassesItem?.type === 'dark_glasses';

  const bounceY  = useRef(new Animated.Value(0)).current;
  const eatScale = useRef(new Animated.Value(1)).current;

  const mood = getMood(happiness);

  useEffect(() => {
    if (isEating) {
      Animated.sequence([
        Animated.spring(eatScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.spring(eatScale, { toValue: 1.0, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [isEating]);

  useEffect(() => {
    if (isPlaying) {
      Animated.sequence([
        Animated.timing(bounceY, { toValue: -22, duration: 130, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue:   4, duration: 100, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: -12, duration:  90, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue:   0, duration:  80, useNativeDriver: true }),
      ]).start();
    }
  }, [isPlaying]);

  return (
    <Animated.View style={{
      alignItems: 'center',
      transform: [{ scale: eatScale }, { translateY: bounceY }],
    }}>
      {/* ── Hat ─────────────────────────────────────── */}
      {hatItem && (
        <View style={fp.accessoryHat} pointerEvents="none">
          <Text style={fp.accessoryHatEmoji}>{hatItem.emoji}</Text>
        </View>
      )}

      {/* Ears */}
      <View style={fp.earsRow}>
        <View style={[fp.ear, { backgroundColor: petPalette.ear }]}>
          <View style={[fp.earInner, { backgroundColor: petPalette.body }]} />
        </View>
        <View style={[fp.ear, { backgroundColor: petPalette.ear }]}>
          <View style={[fp.earInner, { backgroundColor: petPalette.body }]} />
        </View>
      </View>

      {/* Body circle */}
      <View style={[fp.body, {
        backgroundColor: petPalette.body,
        shadowColor: petPalette.shadow,
        overflow: 'hidden',
      }]}>
        {/* Eyes — hidden whenever any glasses are equipped */}
        {!glassesItem && (
          <View style={fp.eyesRow}>
            <View style={fp.eye}><View style={fp.pupil} /><View style={fp.shine} /></View>
            <View style={fp.eye}><View style={fp.pupil} /><View style={fp.shine} /></View>
          </View>
        )}

        {/* Nose */}
        <View style={fp.nose} />

        {/* Mouth */}
        <View style={fp.mouthArea}>
          {isEating ? (
            <View style={fp.openMouth} />
          ) : happiness > 70 ? (
            <View style={fp.smile} />
          ) : happiness >= 30 ? (
            <View style={fp.neutral} />
          ) : (
            <View style={fp.frown} />
          )}
        </View>

        {/* Blush */}
        {mood.showBlush && (
          <View style={fp.blushRow}>
            <View style={[fp.blush, { backgroundColor: mood.cheekColor }]} />
            <View style={[fp.blush, { backgroundColor: mood.cheekColor }]} />
          </View>
        )}

        {/* Dirty spots */}
        {cleanliness < 30 && (
          <>
            <View style={[fp.dirt, { top: 14, left: 12, width: 18, height: 12 }]} />
            <View style={[fp.dirt, { top: 58, right: 10, width: 14, height: 10 }]} />
            <View style={[fp.dirt, { bottom: 22, left: 32, width: 16, height: 11 }]} />
          </>
        )}
      </View>

      {/* ── Glasses ─────────────────────────────────── */}
      {glassesItem && (
        <View style={fp.accessoryGlasses} pointerEvents="none">
          <Text style={fp.accessoryGlassesEmoji}>{glassesItem.emoji}</Text>
        </View>
      )}

      {/* ── Shoes (right below body) ────────────────── */}
      {shoesItem && (
        <View style={fp.accessoryShoes} pointerEvents="none">
          <Text style={fp.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
          <Text style={fp.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
        </View>
      )}

      {/* Ground shadow */}
      <View style={[fp.shadow, { opacity: happiness < 30 ? 0.12 : 0.22 }]} />
    </Animated.View>
  );
}

// ── fp = face-pet styles ─────────────────────────────────────
const fp = StyleSheet.create({
  earsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 116,
    marginBottom: -22,
    zIndex: 2,
  },
  ear: {
    width: 34,
    height: 38,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 7,
  },
  earInner: {
    width: 16,
    height: 20,
    borderRadius: 9,
    opacity: 0.5,
  },
  body: {
    width: PET_SIZE,
    height: PET_SIZE,
    borderRadius: PET_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 1,
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 6,
    marginTop: 12,
  },
  eye: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2c2c3e',
  },
  shine: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  nose: {
    width: 9,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#5a3e6e',
    opacity: 0.5,
    marginBottom: 5,
  },
  mouthArea: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  smile: {
    width: 34,
    height: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#3a2a50',
  },
  neutral: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3a2a50',
    opacity: 0.6,
  },
  frown: {
    width: 30,
    height: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#3a2a50',
    marginTop: 6,
  },
  openMouth: {
    width: 30,
    height: 20,
    borderRadius: 14,
    backgroundColor: '#3a2a50',
    opacity: 0.85,
  },
  blushRow: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    gap: 56,
  },
  blush: {
    width: 20,
    height: 11,
    borderRadius: 10,
    opacity: 0.55,
  },
  dirt: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#6b4c2a',
    opacity: 0.45,
  },
  shadow: {
    width: 80,
    height: 10,
    borderRadius: 40,
    backgroundColor: '#888',
    marginTop: 6,
  },

  /* accessories — all values scale with PET_SIZE */
  accessoryHat: {
    position: 'absolute',
    top: -10,
    width: Math.round(PET_SIZE * 0.6),
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  accessoryHatEmoji: { fontSize: Math.round(PET_SIZE * 0.32) },
  accessoryGlasses: {
    position: 'absolute',
    top: Math.round(PET_SIZE * 0.20),
    left: 0, right: 0, alignItems: 'center', zIndex: 15,
  },
  accessoryGlassesEmoji: { fontSize: 58 },
  accessoryShoes: {
    flexDirection: 'row',
    gap: Math.round(PET_SIZE * 0.12),
    marginTop: 0,
    zIndex: 3,
  },
  accessoryShoesEmoji: { fontSize: Math.round(PET_SIZE * 0.22) },
});

// ── Main BathScreen ──────────────────────────────────────────
export default function BathScreen() {
  const { cleanliness, triggerBath, isSleeping } = usePet();
  const [isShowering, setIsShowering] = useState(false);

  const dropAnims  = useRef(DROPS.map(() => new Animated.Value(0))).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const waveAnim   = useRef(new Animated.Value(0)).current;
  const pulseRef   = useRef(null);
  const dropLoops  = useRef([]);

  // perpetual wave
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // button pulse
  useEffect(() => {
    if (pulseRef.current) { pulseRef.current.stop(); pulseRef.current = null; }
    if (cleanliness < 100) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();
    } else {
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
    }
    return () => { if (pulseRef.current) pulseRef.current.stop(); };
  }, [cleanliness]);

  // water drops
  useEffect(() => {
    if (isShowering) {
      dropLoops.current = dropAnims.map((anim, i) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(i * 110),
            Animated.timing(anim, { toValue: 1, duration: 520, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0,   useNativeDriver: true }),
          ])
        );
        loop.start();
        return loop;
      });
    } else {
      dropLoops.current.forEach(l => l && l.stop());
      dropLoops.current = [];
      dropAnims.forEach(a => a.setValue(0));
    }
  }, [isShowering]);

  const handleShower = () => {
    if (isShowering || cleanliness >= 100) return;
    setIsShowering(true);
    triggerBath(25);
    setTimeout(() => setIsShowering(false), 1700);
  };

  const waveX = waveAnim.interpolate({ inputRange: [0,1], outputRange: [0,-20] });

  return (
    <View style={s.scene}>

      {/* ── Global pet stats HUD ────────────────────── */}
      <PetStatusBar />

      {/* ── Clean badge (left) ──────────────────────── */}
      <View style={s.cleanBadge}>
        <Text style={s.cleanIcon}>🧼</Text>
        <View style={s.miniBarBg}>
          <View style={[s.miniBarFill, { width: `${cleanliness}%` }]} />
        </View>
        <Text style={s.cleanPct}>{cleanliness}</Text>
      </View>

      {/* ── Shower head ────────────────────────────── */}
      <View style={s.showerHead}>
        <View style={s.pipe} />
        <View style={s.arm} />
        <Text style={s.showerEmoji}>🚿</Text>
      </View>

      {/* ── Water drops (absolute overlay) ─────────── */}
      {isShowering && DROPS.map((drop, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[s.drop, {
            left: drop.left,
            transform: [{
              translateY: dropAnims[i].interpolate({
                inputRange:  [0, 1],
                outputRange: [130, 390],
              }),
            }],
            opacity: dropAnims[i].interpolate({
              inputRange:  [0, 0.1, 0.88, 1],
              outputRange: [0,   1,    1,  0],
            }),
          }]}
        />
      ))}

      {/* ── Bathtub + pet ──────────────────────────── */}
      <View style={s.tubWrap}>

        {/* Rim highlight */}
        <View style={s.rimHighlight} />

        {/* Tub oval */}
        <View style={s.tub}>
          {/* Pet face only — no card */}
          <View style={s.petArea}>
            <BathPet />
          </View>

          {/* Animated wave */}
          <Animated.View style={[s.wave, { transform: [{ translateX: waveX }] }]}>
            <Text style={s.waveText}>〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰〰</Text>
          </Animated.View>

          {/* Deep water */}
          <View style={s.deepWater} />
        </View>

        {/* Feet */}
        <View style={s.feet}>
          <View style={s.foot} /><View style={s.foot} /><View style={s.foot} />
        </View>
      </View>

      {/* ── Shower button ──────────────────────────── */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 22 }}>
        <TouchableOpacity
          style={[
            s.btn,
            isShowering        && s.btnActive,
            cleanliness >= 100 && s.btnDone,
          ]}
          onPress={handleShower}
          disabled={isShowering || cleanliness >= 100}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>
            {cleanliness >= 100 ? '✨ All Clean!'
              : isShowering    ? '🚿 Showering...'
              :                  '🚿 Shower'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {cleanliness >= 100 && (
        <Text style={s.cleanMsg}>Buddy is sparkling clean! 😄✨</Text>
      )}

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

// ── scene styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  scene: {
    flex: 1,
    backgroundColor: '#d6eaf8',
    alignItems: 'center',
  },

  /* HUD */
  cleanBadge: {
    position: 'absolute', top: 98, left: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
  },
  cleanIcon: { fontSize: 14 },
  miniBarBg: {
    width: 60, height: 7,
    backgroundColor: '#cce5f5', borderRadius: 4, overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%', borderRadius: 4, backgroundColor: '#29b6f6',
  },
  cleanPct: { fontSize: 12, fontWeight: '700', color: '#0277bd' },

  /* shower head */
  showerHead: { marginTop: 28, alignItems: 'center', marginBottom: 2 },
  pipe:  { width: 6, height: 26, backgroundColor: '#90a4ae', borderRadius: 3 },
  arm:   { width: 46, height: 6, backgroundColor: '#90a4ae', borderRadius: 3, marginTop: -3 },
  showerEmoji: { fontSize: 30, marginTop: -2 },

  /* water drop */
  drop: {
    position: 'absolute', zIndex: 5,
    width: 5, height: 16, borderRadius: 4,
    backgroundColor: '#4fc3f7',
  },

  /* tub */
  tubWrap: { alignItems: 'center', width: '100%', marginTop: 6 },
  rimHighlight: {
    width: '82%', height: 14,
    backgroundColor: '#f0f8ff',
    borderTopLeftRadius: 50, borderTopRightRadius: 50,
    marginBottom: -7, zIndex: 2,
  },
  tub: {
    width: '84%',
    backgroundColor: '#e1f5fe',
    borderRadius: 110,
    borderWidth: 6, borderColor: '#c9dde8',
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 18,
  },
  petArea: {
    alignItems: 'center',
    marginBottom: -12,
    zIndex: 2,
  },
  wave: {
    width: '140%',
    zIndex: 3,
    paddingVertical: 2,
    backgroundColor: 'rgba(79,195,247,0.45)',
  },
  waveText: { fontSize: 13, color: '#0288d1', letterSpacing: 2 },
  deepWater: {
    width: '100%', height: 44,
    backgroundColor: '#81d4fa',
    borderBottomLeftRadius: 104, borderBottomRightRadius: 104,
  },

  /* feet */
  feet: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '50%',
  },
  foot: {
    width: 12, height: 20,
    backgroundColor: '#c9dde8',
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
  },

  /* button */
  btn: {
    backgroundColor: '#29b6f6',
    paddingVertical: 14, paddingHorizontal: 44,
    borderRadius: 30,
    shadowColor: '#29b6f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12,
    elevation: 8,
  },
  btnActive: { backgroundColor: '#0288d1', shadowColor: '#0288d1' },
  btnDone:   { backgroundColor: '#66bb6a', shadowColor: '#66bb6a' },
  btnText:   { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  cleanMsg:  { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#2e7d32' },
});
