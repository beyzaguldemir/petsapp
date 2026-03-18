import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { usePet } from '../context/PetContext';
import { findItem } from '../constants/shopItems';

// Pet colours now come from context (level-based palette)

// ── Pet body size — all accessory positions derive from this ──
const PET_SIZE = 130;

// Mood only drives face expression + badge
function getMoodConfig(happiness) {
  if (happiness > 70) return { label: 'Happy', badgeColor: '#6bcb77', showBlush: true,  cheekColor: '#f48fb1' };
  if (happiness >= 30) return { label: 'Okay',  badgeColor: '#f4a261', showBlush: false, cheekColor: 'transparent' };
  return                      { label: 'Sad',   badgeColor: '#e07070', showBlush: false, cheekColor: 'transparent' };
}

function Smile()        { return <View style={styles.smile} />; }
function NeutralMouth() { return <View style={styles.neutralMouth} />; }
function Frown()        { return <View style={styles.frown} />; }
function OpenMouth()    { return <View style={styles.openMouth} />; }

// Tired eye: top eyelid drooping down + two dark-circle lines below
function TiredEye({ color }) {
  return (
    <View style={styles.tiredEyeWrap}>
      <View style={styles.eye}>
        <View style={styles.pupil} />
        <View style={styles.eyeShine} />
        <View style={[styles.topEyelid, { backgroundColor: color }]} />
      </View>
      <View style={styles.eyeBagLine1} />
      <View style={styles.eyeBagLine2} />
    </View>
  );
}

export default function Pet({ name, type }) {
  const { hunger, happiness, isEating, isPlaying, cleanliness, energy, equippedItems, petPalette } = usePet();

  // Resolve equipped accessory emojis (null when slot empty)
  const hatItem      = findItem(equippedItems.hat);
  const glassesItem  = findItem(equippedItems.glasses);
  const shoesItem    = findItem(equippedItems.shoes);
  const isDarkGlasses = glassesItem?.type === 'dark_glasses';

  const feedScale = useRef(new Animated.Value(1)).current;
  const bounceY   = useRef(new Animated.Value(0)).current;
  const baseScale = useRef(new Animated.Value(1)).current;

  const mood = getMoodConfig(happiness);

  // Scale pet based on happiness level
  useEffect(() => {
    const target = happiness > 70 ? 1.08 : happiness < 30 ? 0.88 : 1.0;
    Animated.spring(baseScale, {
      toValue: target,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [happiness]);

  // Scale pop when eating
  useEffect(() => {
    if (isEating) {
      Animated.sequence([
        Animated.spring(feedScale, { toValue: 1.28, friction: 3, useNativeDriver: true }),
        Animated.spring(feedScale, { toValue: 1.0,  friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [isEating]);

  // Bounce when playing
  useEffect(() => {
    if (isPlaying) {
      Animated.sequence([
        Animated.timing(bounceY, { toValue: -30, duration: 130, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue:   5, duration: 100, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: -14, duration:  90, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue:   0, duration:  80, useNativeDriver: true }),
      ]).start();
    }
  }, [isPlaying]);

  const combinedScale = Animated.multiply(feedScale, baseScale);

  return (
    <View style={styles.card}>

      {/* ── PET CREATURE ── */}
      <Animated.View
        style={{
          alignItems: 'center',
          marginBottom: 14,
          transform: [{ scale: combinedScale }, { translateY: bounceY }],
        }}
      >
        {/* ── Hat (above ears) ────────────────────────── */}
        {hatItem && (
          <View style={styles.accessoryHat} pointerEvents="none">
            <Text style={styles.accessoryHatEmoji}>{hatItem.emoji}</Text>
          </View>
        )}

        {/* Ears */}
        <View style={styles.earsRow}>
          <View style={[styles.ear, { backgroundColor: petPalette.ear }]}>
            <View style={[styles.earInner, { backgroundColor: petPalette.body }]} />
          </View>
          <View style={[styles.ear, { backgroundColor: petPalette.ear }]}>
            <View style={[styles.earInner, { backgroundColor: petPalette.body }]} />
          </View>
        </View>

        {/* Body */}
        <View style={[styles.petBody, { backgroundColor: petPalette.body, shadowColor: petPalette.shadow, overflow: 'hidden' }]}>
          {/* Eyes — hidden whenever any glasses are equipped */}
          {!glassesItem && (
            <View style={styles.eyesRow}>
              {energy < 30 ? (
                <>
                  <TiredEye color={petPalette.body} />
                  <TiredEye color={petPalette.body} />
                </>
              ) : (
                <>
                  <View style={styles.eye}>
                    <View style={styles.pupil} />
                    <View style={styles.eyeShine} />
                  </View>
                  <View style={styles.eye}>
                    <View style={styles.pupil} />
                    <View style={styles.eyeShine} />
                  </View>
                </>
              )}
            </View>
          )}

          {/* Nose */}
          <View style={styles.nose} />

          {/* Mouth */}
          <View style={styles.mouthArea}>
            {isEating
              ? <OpenMouth />
              : happiness > 70 ? <Smile />
              : happiness >= 30 ? <NeutralMouth />
              : <Frown />
            }
          </View>

          {/* Dirty spots — visible when cleanliness < 30 */}
          {cleanliness < 30 && (
            <>
              <View style={[styles.dirtySpot, { top: 14, left: 12, width: 18, height: 12 }]} />
              <View style={[styles.dirtySpot, { top: 58, right: 10, width: 14, height: 10 }]} />
              <View style={[styles.dirtySpot, { bottom: 22, left: 32, width: 16, height: 11 }]} />
            </>
          )}

          {/* Blush cheeks */}
          {mood.showBlush && (
            <View style={styles.blushRow}>
              <View style={[styles.blush, { backgroundColor: mood.cheekColor }]} />
              <View style={[styles.blush, { backgroundColor: mood.cheekColor }]} />
            </View>
          )}
        </View>

        {/* ── Glasses (over eyes area) ────────────────── */}
        {glassesItem && (
          <View style={styles.accessoryGlasses} pointerEvents="none">
            <Text style={styles.accessoryGlassesEmoji}>{glassesItem.emoji}</Text>
          </View>
        )}

        {/* ── Shoes (right below body) ────────────────── */}
        {shoesItem && (
          <View style={styles.accessoryShoes} pointerEvents="none">
            <Text style={styles.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
            <Text style={styles.accessoryShoesEmoji}>{shoesItem.emoji}</Text>
          </View>
        )}

        {/* Ground shadow */}
        <View style={[styles.groundShadow, { opacity: happiness < 30 ? 0.15 : 0.25 }]} />
      </Animated.View>

      {/* Mood badge */}
      <View style={[styles.moodBadge, { backgroundColor: mood.badgeColor }]}>
        <Text style={styles.moodBadgeText}>
          {happiness > 70 ? '😄' : happiness >= 30 ? '😐' : '😢'} {mood.label}
        </Text>
      </View>

      <Text style={styles.petName}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f4ff',
    borderRadius: 24,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  earsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 96,
    marginBottom: -20,
    zIndex: 2,
  },
  ear: {
    width: 30,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  earInner: {
    width: 14,
    height: 18,
    borderRadius: 8,
    opacity: 0.5,
  },
  petBody: {
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
    gap: 18,
    marginBottom: 6,
    marginTop: 10,
  },
  eye: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2c2c3e',
  },
  eyeShine: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  nose: {
    width: 8,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#5a3e6e',
    opacity: 0.5,
    marginBottom: 4,
  },
  mouthArea: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
  },
  smile: {
    width: 30,
    height: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#3a2a50',
  },
  neutralMouth: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3a2a50',
    opacity: 0.6,
  },
  frown: {
    width: 26,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#3a2a50',
    marginTop: 6,
  },
  openMouth: {
    width: 26,
    height: 18,
    borderRadius: 13,
    backgroundColor: '#3a2a50',
    opacity: 0.85,
  },
  tiredEyeWrap: {
    alignItems: 'center',
    gap: 3,
  },
  topEyelid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
  },
  eyeBagLine1: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#7b6080',
  },
  eyeBagLine2: {
    width: 13,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#9e8aae',
  },
  dirtySpot: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#6b4c2a',
    opacity: 0.45,
  },
  blushRow: {
    position: 'absolute',
    bottom: 28,
    flexDirection: 'row',
    gap: 48,
  },
  blush: {
    width: 18,
    height: 10,
    borderRadius: 9,
    opacity: 0.55,
  },
  groundShadow: {
    width: 70,
    height: 10,
    borderRadius: 35,
    backgroundColor: '#888',
    marginTop: 6,
  },
  moodBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  moodBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a3a5c',
    marginBottom: 6,
  },

  /* ── Accessory overlays — all values scale with PET_SIZE ─── */
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
    top: Math.round(PET_SIZE * 0.20),          // eye level
    left: 0, right: 0, alignItems: 'center',
    zIndex: 15,
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
