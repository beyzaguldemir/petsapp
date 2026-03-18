import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import Pet from '../components/Pet';
import { usePet } from '../context/PetContext';
import PetStatusBar from '../components/PetStatusBar';
import StatBars from '../components/StatBars';

const FOODS = [
  { emoji: '🍎', label: 'Apple',  hunger: 15, color: '#ffd6d6' },
  { emoji: '🍔', label: 'Burger', hunger: 25, color: '#ffe4b5' },
  { emoji: '🍕', label: 'Pizza',  hunger: 20, color: '#fff0cc' },
  { emoji: '🍩', label: 'Donut',  hunger: 10, color: '#fce4ec' },
  { emoji: '🥦', label: 'Veggie', hunger: 12, color: '#dff5e1' },
  { emoji: '🍗', label: 'Chicken',hunger: 22, color: '#fff3e0' },
];

export default function FeedScreen() {
  const { triggerEat, isSleeping } = usePet();
  const [flyingFoodEmoji, setFlyingFoodEmoji] = useState(null);
  const foodAnim = useRef(new Animated.Value(0)).current;

  const eatFood = (food) => {
    if (flyingFoodEmoji) return; // prevent double tap mid-animation
    setFlyingFoodEmoji(food.emoji);
    foodAnim.setValue(0);
    Animated.timing(foodAnim, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setFlyingFoodEmoji(null);
        triggerEat(food.hunger);
      }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#eef2ff' }}>
    <PetStatusBar />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽 Feed Time</Text>
        <Text style={styles.subtitle}>Keep Buddy well fed!</Text>
      </View>

      {/* Pet display */}
      <Pet name="Buddy" type="Golden Retriever 🐶" />

      <StatBars showHunger />

      {/* Flying food animation zone */}
      <View style={styles.flyingZone} pointerEvents="none">
        {flyingFoodEmoji && (
          <Animated.Text
            style={[
              styles.flyingEmoji,
              {
                transform: [{
                  translateY: foodAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: [0, -160],
                  }),
                }],
                opacity: foodAnim.interpolate({
                  inputRange:  [0, 0.55, 1],
                  outputRange: [1, 1,    0],
                }),
              },
            ]}
          >
            {flyingFoodEmoji}
          </Animated.Text>
        )}
      </View>

      {/* Food options */}
      <Text style={styles.sectionLabel}>Pick a snack</Text>
      <View style={styles.foodGrid}>
        {FOODS.map((food) => (
          <TouchableOpacity
            key={food.emoji}
            style={[styles.foodButton, { backgroundColor: food.color }]}
            onPress={() => eatFood(food)}
            activeOpacity={0.75}
          >
            <Text style={styles.foodEmoji}>{food.emoji}</Text>
            <Text style={styles.foodLabel}>{food.label}</Text>
            <Text style={styles.foodBoost}>+{food.hunger} 🍖  +5 🪙</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3a3a5c',
  },
  subtitle: {
    fontSize: 14,
    color: '#7a7a9d',
    marginTop: 2,
  },
  flyingZone: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -10,
    marginBottom: 4,
  },
  flyingEmoji: {
    fontSize: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a3a5c',
    marginBottom: 12,
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  foodButton: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  foodEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  foodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3a3a5c',
  },
  foodBoost: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a7a9d',
    marginTop: 2,
  },
});
