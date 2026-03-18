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
import StatBars from '../components/StatBars';
import { findItem } from '../constants/shopItems';

const { width: SCREEN_W } = Dimensions.get('window');

// Pet colours come from context (level-based palette)

// ── SleepPet body size ────────────────────────────────────────
const PET_SIZE = 160;

// Mood drives only blush display
function getMood(happiness) {
  if (happiness > 70) return { showBlush: true,  cheekColor: '#f48fb1' };
  return                     { showBlush: false, cheekColor: 'transparent' };
}

// Tired eye (mirrors Pet.js TiredEye, scaled for larger SleepPet)
function TiredSleepEye({ color }) {
  return (
    <View style={sp.tiredWrap}>
      <View style={sp.eye}>
        <View style={sp.pupil} />
        <View style={sp.shine} />
        <View style={[sp.topEyelid, { backgroundColor: color }]} />
      </View>
      <View style={sp.bagLine1} />
      <View style={sp.bagLine2} />
    </View>
  );
}

// ── Inline sleep pet — face only, no card ────────────────────
function SleepPet({ sleeping }) {
  const { happiness, energy, cleanliness, equippedItems, petPalette } = usePet();
  const mood          = getMood(happiness);
  const hatItem       = findItem(equippedItems.hat);
  const glassesItem   = findItem(equippedItems.glasses);
  const shoesItem     = findItem(equippedItems.shoes);
  const isDarkGlasses = glassesItem?.type === 'dark_glasses';

  // Breathing animation — always runs
  const breathAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: sleeping ? 1.04 : 1.02,
          duration: sleeping ? 2200 : 1400,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: sleeping ? 2200 : 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sleeping]);

  const isTired  = energy < 30;
  const isDirty  = cleanliness < 30;

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: breathAnim }] }}>
      {/* ── Hat ─────────────────────────────────────── */}
      {hatItem && (
        <View style={sp.accessoryHat} pointerEvents="none">
          <Text style={sp.accessoryHatEmoji}>{hatItem.emoji}</Text>
        </View>
      )}

      {/* Ears */}
      <View style={sp.earsRow}>
        <View style={[sp.ear, { backgroundColor: petPalette.ear }]}>
          <View style={[sp.earInner, { backgroundColor: petPalette.body }]} />
        </View>
        <View style={[sp.ear, { backgroundColor: petPalette.ear }]}>
          <View style={[sp.earInner, { backgroundColor: petPalette.body }]} />
        </View>
      </View>

      {/* Body */}
      <View style={[sp.body, {
        backgroundColor: petPalette.body,
        shadowColor: petPalette.shadow,
        overflow: 'hidden',
        opacity: sleeping ? 0.88 : 1,
      }]}>

        {/* Eyes — hidden when dark glasses equipped */}
        {!glassesItem && <View style={sp.eyesRow}>
          {sleeping ? (
            // Fully closed — just a curved line
            <>
              <View style={sp.eyeClosedWrap}>
                <View style={[sp.eyeClosed, { borderColor: '#3a2a50' }]} />
              </View>
              <View style={sp.eyeClosedWrap}>
                <View style={[sp.eyeClosed, { borderColor: '#3a2a50' }]} />
              </View>
            </>
          ) : (
            // Open eyes — tired top-eyelid + eye bags when low energy
            <>
              {isTired ? (
                <>
                  <TiredSleepEye color={petPalette.body} />
                  <TiredSleepEye color={petPalette.body} />
                </>
              ) : (
                <>
                  <View style={sp.eye}>
                    <View style={sp.pupil} />
                    <View style={sp.shine} />
                  </View>
                  <View style={sp.eye}>
                    <View style={sp.pupil} />
                    <View style={sp.shine} />
                  </View>
                </>
              )}
            </>
          )}
        </View>}

        {/* Nose */}
        <View style={sp.nose} />

        {/* Mouth — peaceful when sleeping */}
        <View style={sp.mouthArea}>
          {sleeping ? (
            <View style={sp.sleepSmile} />
          ) : happiness > 70 ? (
            <View style={sp.smile} />
          ) : happiness >= 30 ? (
            <View style={sp.neutral} />
          ) : (
            <View style={sp.frown} />
          )}
        </View>

        {/* Blush */}
        {(mood.showBlush || sleeping) && (
          <View style={sp.blushRow}>
            <View style={[sp.blush, {
              backgroundColor: sleeping ? '#f48fb1' : mood.cheekColor,
            }]} />
            <View style={[sp.blush, {
              backgroundColor: sleeping ? '#f48fb1' : mood.cheekColor,
            }]} />
          </View>
        )}

        {/* Dirty spots */}
        {isDirty && (
          <>
            <View style={[sp.dirt, { top: 16, left: 14, width: 18, height: 12 }]} />
            <View style={[sp.dirt, { top: 62, right: 12, width: 14, height: 10 }]} />
            <View style={[sp.dirt, { bottom: 24, left: 36, width: 16, height: 11 }]} />
          </>
        )}
      </View>

      {/* ── Glasses ─────────────────────────────────── */}
      {glassesItem && (
        <View style={sp.accessoryGlasses} pointerEvents="none">
          <Text style={sp.accessoryGlassesEmoji}>{glassesItem.emoji}</Text>
        </View>
      )}

      {/* ── Shoes (right below body) ────────────────── */}
      {shoesItem && (
        <View style={sp.accessoryShoes} pointerEvents="none">
          <Text style={sp.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
          <Text style={sp.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
        </View>
      )}

      {/* Ground shadow */}
      <View style={[sp.shadow, { opacity: sleeping ? 0.35 : 0.22 }]} />

      {/* Zzz when sleeping */}
      {sleeping && (
        <View style={sp.zzzWrap}>
          <Text style={sp.zzzText}>z z z</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── sp = sleep-pet local styles ──────────────────────────────
const sp = StyleSheet.create({
  earsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: 126, marginBottom: -22, zIndex: 2,
  },
  ear: {
    width: 36, height: 40, borderRadius: 18,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7,
  },
  earInner: { width: 16, height: 20, borderRadius: 9, opacity: 0.5 },
  body: {
    width: PET_SIZE, height: PET_SIZE, borderRadius: PET_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8, zIndex: 1,
  },
  eyesRow: {
    flexDirection: 'row', gap: 22,
    marginBottom: 6, marginTop: 14,
  },
  eye: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pupil: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#2c2c3e' },
  shine: {
    position: 'absolute', top: 3, right: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff',
  },
  tiredWrap: {
    alignItems: 'center',
    gap: 3,
  },
  topEyelid: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '52%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  bagLine1: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#7b6080',
  },
  bagLine2: {
    width: 16,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#9e8aae',
  },
  // Closed eye — curved arc
  eyeClosedWrap: {
    width: 28, height: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  eyeClosed: {
    width: 24, height: 12,
    borderTopWidth: 0, borderBottomWidth: 3,
    borderLeftWidth: 0, borderRightWidth: 0,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  nose: {
    width: 9, height: 6, borderRadius: 4,
    backgroundColor: '#5a3e6e', opacity: 0.5, marginBottom: 5,
  },
  mouthArea: { alignItems: 'center', height: 20, justifyContent: 'center' },
  smile: {
    width: 36, height: 17,
    borderBottomLeftRadius: 17, borderBottomRightRadius: 17,
    borderWidth: 3, borderTopWidth: 0, borderColor: '#3a2a50',
  },
  sleepSmile: {
    width: 28, height: 12,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    borderWidth: 2.5, borderTopWidth: 0, borderColor: '#3a2a50',
    opacity: 0.7,
  },
  neutral: {
    width: 24, height: 3, borderRadius: 2,
    backgroundColor: '#3a2a50', opacity: 0.6,
  },
  frown: {
    width: 30, height: 14,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
    borderWidth: 3, borderBottomWidth: 0, borderColor: '#3a2a50',
    marginTop: 6,
  },
  blushRow: {
    position: 'absolute', bottom: 32,
    flexDirection: 'row', gap: 60,
  },
  blush: { width: 20, height: 11, borderRadius: 10, opacity: 0.5 },
  dirt: {
    position: 'absolute', borderRadius: 8,
    backgroundColor: '#6b4c2a', opacity: 0.45,
  },
  shadow: {
    width: 86, height: 10, borderRadius: 43,
    backgroundColor: '#000', marginTop: 6,
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

  zzzWrap: { position: 'absolute', top: -10, right: -20 },
  zzzText: { fontSize: 16, color: '#c5cae9', fontWeight: '700', letterSpacing: 3 },
});

// ── Main SleepScreen ─────────────────────────────────────────
const STARS = ['✦', '✧', '✦', '✧', '✦', '✧', '✦', '✧', '✦'];

export default function SleepScreen() {
  const { energy, triggerSleep, isSleeping, setIsSleeping } = usePet();
  const lightsOn = !isSleeping;

  const overlayAnim  = useRef(new Animated.Value(0)).current;
  const intervalRef  = useRef(null);

  // Animate overlay + start/stop sleep interval when lights change
  useEffect(() => {
    Animated.timing(overlayAnim, {
      toValue: lightsOn ? 0 : 0.65,
      duration: 900,
      useNativeDriver: true,
    }).start();

    if (!lightsOn) {
      intervalRef.current = setInterval(() => triggerSleep(5), 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lightsOn]);

  const toggleLights = () => setIsSleeping(prev => !prev);

  return (
    <View style={s.scene}>

      {/* ── Global pet stats HUD ────────────────────── */}
      <PetStatusBar />

      {/* ── Stars ──────────────────────────────────── */}
      <View style={s.starsRow} pointerEvents="none">
        {STARS.map((star, i) => (
          <Text
            key={i}
            style={[s.star, {
              opacity: lightsOn ? 0.15 : 0.75,
              fontSize: i % 2 === 0 ? 12 : 8,
              marginHorizontal: (SCREEN_W / STARS.length) * 0.18,
            }]}
          >
            {star}
          </Text>
        ))}
      </View>

      {/* ── Moon ──────────────────────────────────── */}
      <Text style={[s.moon, { opacity: lightsOn ? 0.25 : 0.9 }]}>🌙</Text>

      {/* ── Pet + Pillow ───────────────────────────── */}
      <View style={s.bedArea}>
        {/* Pet on pillow */}
        <View style={s.petOnPillow}>
          <SleepPet sleeping={!lightsOn} />
        </View>

        {/* Pillow */}
        <View style={s.pillow}>
          <View style={s.pillowShine} />
        </View>
      </View>

      {/* ── Energy stat bar ────────────────────────── */}
      <View style={s.statBarsWrap}>
        <StatBars showEnergy />
      </View>

      {/* ── Dark overlay ───────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[s.darkOverlay, { opacity: overlayAnim }]}
      />

      {/* ── Lights button ──────────────────────────── */}
      <View style={s.btnArea}>
        <TouchableOpacity
          style={[s.lightsBtn, !lightsOn && s.lightsBtnOff]}
          onPress={toggleLights}
          activeOpacity={0.85}
        >
          <Text style={s.lightsBtnText}>
            {lightsOn ? '💡 Lights OFF — Let Buddy sleep' : '☀️ Lights ON — Wake up'}
          </Text>
        </TouchableOpacity>

        {!lightsOn && (
          <Text style={s.sleepHint}>Buddy is sleeping... energy restoring 😴</Text>
        )}
        {energy >= 100 && (
          <Text style={s.fullEnergyMsg}>Buddy is fully rested! ⚡😄</Text>
        )}
      </View>
    </View>
  );
}

// ── screen styles ────────────────────────────────────────────
const s = StyleSheet.create({
  scene: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    alignItems: 'center',
  },
  statBarsWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
    zIndex: 5,
  },

  // stars
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 14,
    paddingHorizontal: 10,
  },
  star: { color: '#e8eaf6' },

  // moon
  moon: {
    fontSize: 40,
    marginTop: 4,
    marginBottom: 2,
  },

  // bed area
  bedArea: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  petOnPillow: {
    zIndex: 3,
    marginBottom: -30,
  },
  pillow: {
    width: SCREEN_W * 0.72,
    height: 68,
    backgroundColor: '#f5f0e8',
    borderRadius: 36,
    zIndex: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  pillowShine: {
    width: '50%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 4,
  },

  // dark overlay (absolute full screen)
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070714',
    zIndex: 4,
  },

  // lights button
  btnArea: {
    marginTop: 30,
    alignItems: 'center',
    zIndex: 6,
    paddingHorizontal: 20,
    width: '100%',
  },
  lightsBtn: {
    backgroundColor: '#fdd835',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    shadowColor: '#fdd835',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  lightsBtnOff: {
    backgroundColor: '#3949ab',
    shadowColor: '#3949ab',
  },
  lightsBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a3e',
    textAlign: 'center',
  },
  sleepHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#9fa8da',
    fontWeight: '600',
  },
  fullEnergyMsg: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffe082',
  },
});
