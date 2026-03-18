import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHOP_ITEMS } from '../constants/shopItems';

// ── Constants ─────────────────────────────────────────────────
const MAX_STAT           = 100;
const SAVE_KEY           = 'petState_v1';
const HAPPINESS_DECAY_MS = 8000; // live: -1 happiness every 8 s

// Offline decay rates (per minute away)
const DECAY = {
  hungerGain:      0.4,   // hunger      +0.4 / min
  happinessLoss:   0.12,  // happiness   -0.12 / min
  cleanlinessLoss: 0.3,   // cleanliness -0.3  / min
};

// ── Level colour palette ───────────────────────────────────────
// level 0 = original blue; 1-7 change the pet's body colour.
export const LEVEL_PALETTE = {
  0: { body: '#90caf9', ear: '#64b5f6', shadow: '#5599e0', name: 'Blue'   },
  1: { body: '#FFD700', ear: '#DEB800', shadow: '#C49A00', name: 'Yellow' },
  2: { body: '#FF4D4D', ear: '#E03030', shadow: '#C41A1A', name: 'Red'    },
  3: { body: '#4CAF50', ear: '#388E3C', shadow: '#276129', name: 'Green'  },
  4: { body: '#9C27B0', ear: '#7B1FA2', shadow: '#5C1280', name: 'Purple' },
  5: { body: '#FF9800', ear: '#E67E00', shadow: '#CC6400', name: 'Orange' },
  6: { body: '#FF69B4', ear: '#E0458E', shadow: '#C0246E', name: 'Pink'   },
  7: { body: '#FFD700', ear: '#FFC107', shadow: '#FFB300', name: 'Gold'   },
};

// index = level number; threshold to REACH that level
export const LEVEL_THRESHOLDS = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];

const clamp = (v) => Math.min(Math.max(Math.round(v), 0), MAX_STAT);

const PetContext = createContext();

export function PetProvider({ children }) {
  // ── Core pet stats ────────────────────────────────────────
  const [hunger,      setHunger]      = useState(0);
  const [happiness,   setHappiness]   = useState(0);
  const [isEating,    setIsEating]    = useState(false);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [coins,       setCoins]       = useState(0);
  const [totalCoins,  setTotalCoins]  = useState(0);  // total ever earned
  const [level,       setLevel]       = useState(0);  // derived from totalCoins
  const [cleanliness, setCleanliness] = useState(0);
  const [energy,      setEnergy]      = useState(0);
  const [isSleeping,  setIsSleeping]  = useState(false);

  // ── Shop state ────────────────────────────────────────────
  const [ownedItems,    setOwnedItems]    = useState([]);   // array of item ids
  const [equippedItems, setEquippedItems] = useState({});   // { hat?: id, glasses?: id, shoes?: id }

  const lowEnergyNotified    = useRef(false);
  const saveTimerRef         = useRef(null);
  const prevLevelRef       = useRef(0);         // last confirmed level (for level-up alert)
  const halfwayNotifiedRef = useRef(new Set()); // tracks "halfway" keys already shown

  // ── LOAD: read saved state + apply offline decay ──────────
  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);

        const now  = Date.now();
        const diff = now - (saved.lastUpdated ?? now);
        const mins = diff / (1000 * 60);

        const offlineHunger      = clamp((saved.hunger      ?? 0) + mins * DECAY.hungerGain);
        const offlineHappiness   = clamp((saved.happiness   ?? 0) - mins * DECAY.happinessLoss);
        const offlineCleanliness = clamp((saved.cleanliness ?? 0) - mins * DECAY.cleanlinessLoss);

        setHunger(offlineHunger);
        setHappiness(offlineHappiness);
        const loadedCoins      = saved.coins      ?? 0;
        // Legacy migration: if totalCoins was never saved, seed it from coins
        const loadedTotalCoins = saved.totalCoins ?? loadedCoins;
        setCoins(loadedCoins);
        setTotalCoins(loadedTotalCoins);
        const loadedLevel = saved.level ?? 0;
        setLevel(loadedLevel);

        // Silence startup alerts — mark every already-passed midpoint as notified
        prevLevelRef.current = loadedLevel;
        for (let lvl = 0; lvl < 7; lvl++) {
          const lo  = LEVEL_THRESHOLDS[lvl];
          const hi  = LEVEL_THRESHOLDS[lvl + 1];
          const mid = (lo + hi) / 2;
          if (loadedTotalCoins >= mid) {
            halfwayNotifiedRef.current.add(`${lvl}_${lvl + 1}`);
          }
        }

        setEnergy(saved.energy ?? 0);
        setCleanliness(offlineCleanliness);

        // Shop persistence
        setOwnedItems(saved.ownedItems    ?? []);
        setEquippedItems(saved.equippedItems ?? {});

        if (offlineCleanliness === 0 && (saved.cleanliness ?? 0) > 0) {
          Alert.alert('🛁 Bath Time!', 'Your pet got dirty while you were away! 🛁', [{ text: 'OK' }]);
        }
      })
      .catch(() => {});
  }, []);

  // ── SAVE: debounced write whenever any key state changes ──
  useEffect(() => {
    const snap = {
      hunger, happiness, coins, totalCoins, level,
      cleanliness, energy, ownedItems, equippedItems,
    };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
        ...snap,
        lastUpdated: Date.now(),
      })).catch(() => {});
    }, 1500);

    return () => clearTimeout(saveTimerRef.current);
  }, [hunger, happiness, coins, totalCoins, level, cleanliness, energy, ownedItems, equippedItems]);

  // ── Live happiness decay: -1 every 8 s ───────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setHappiness(prev => Math.max(prev - 1, 0));
    }, HAPPINESS_DECAY_MS);
    return () => clearInterval(id);
  }, []);

  // ── Low-energy one-time flag ──────────────────────────────
  useEffect(() => {
    if (energy < 20 && !lowEnergyNotified.current) lowEnergyNotified.current = true;
    if (energy >= 20) lowEnergyNotified.current = false;
  }, [energy]);

  // ── Level: recalculate + level-up alert ──────────────────
  useEffect(() => {
    let earned = 0;
    if      (totalCoins >= 7000) earned = 7;
    else if (totalCoins >= 6000) earned = 6;
    else if (totalCoins >= 5000) earned = 5;
    else if (totalCoins >= 4000) earned = 4;
    else if (totalCoins >= 3000) earned = 3;
    else if (totalCoins >= 2000) earned = 2;
    else if (totalCoins >= 1000) earned = 1;

    setLevel(prev => {
      const newLevel = Math.max(prev, earned);
      if (newLevel > prevLevelRef.current) {
        const palette = LEVEL_PALETTE[newLevel];
        // setTimeout keeps Alert out of the render cycle
        setTimeout(() => Alert.alert(
          'Level Up! 🎉',
          `Buddy reached Level ${newLevel}!\nColor changed to ${palette.name}! 🎨`,
          [{ text: 'Yay! 🎉' }]
        ), 200);
        prevLevelRef.current = newLevel;
      }
      return newLevel;
    });
  }, [totalCoins]);

  // ── Halfway notification: fires once at the midpoint of each level journey ──
  useEffect(() => {
    for (let lvl = 0; lvl < 7; lvl++) {
      if (level > lvl) continue;           // already past this segment
      const lo      = LEVEL_THRESHOLDS[lvl];
      const hi      = LEVEL_THRESHOLDS[lvl + 1];
      const mid     = (lo + hi) / 2;       // e.g. 500, 1500, 2500 …
      const key     = `${lvl}_${lvl + 1}`;
      const nextPal = LEVEL_PALETTE[lvl + 1];
      if (totalCoins >= mid && !halfwayNotifiedRef.current.has(key)) {
        halfwayNotifiedRef.current.add(key);
        setTimeout(() => Alert.alert(
          'Halfway there! 🎨',
          `You're halfway to Level ${lvl + 1}!\nKeep going — Buddy will turn ${nextPal.name} soon! 🌟`,
          [{ text: "Let's go! 💪" }]
        ), 200);
        break; // show one alert at a time
      }
    }
  }, [totalCoins, level]);

  // ── Core actions ──────────────────────────────────────────
  const triggerEat = (amount) => {
    setHunger(prev => Math.min(prev + amount, MAX_STAT));
    setCoins(prev => prev + 5);
    setTotalCoins(prev => prev + 5);
    setIsEating(true);
    setTimeout(() => setIsEating(false), 1000);
  };

  const triggerPlay = (amount = 10) => {
    setHappiness(prev => Math.min(prev + amount, MAX_STAT));
    setHunger(prev => Math.max(prev - 10, 0));
    setEnergy(prev => Math.max(prev - 10, 0));
    setCoins(prev => prev + 3);
    setTotalCoins(prev => prev + 3);
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 900);
  };

  const triggerSleep = (amount = 5) => {
    setEnergy(prev => Math.min(prev + amount, MAX_STAT));
  };

  const triggerBath = (amount = 25) => {
    setCleanliness(prev => Math.min(prev + amount, MAX_STAT));
  };

  const addGameCoins = (amount) => {
    if (amount <= 0) return;
    setCoins(prev => prev + amount);
    setTotalCoins(prev => prev + amount);
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 900);
  };

  // Happiness boost during mini-games (no hunger/energy cost)
  const addGameHappiness = (amount = 5) => {
    if (amount <= 0) return;
    setHappiness(prev => Math.min(prev + amount, MAX_STAT));
  };

  // ── Shop actions ──────────────────────────────────────────
  const buyItem = (item) => {
    if (ownedItems.includes(item.id)) return;  // already owned
    if (coins < item.price) return;            // not enough coins
    setCoins(prev => prev - item.price);
    setOwnedItems(prev => [...prev, item.id]);
  };

  const toggleEquip = (item) => {
    if (!ownedItems.includes(item.id)) return; // must own first
    setEquippedItems(prev => {
      if (prev[item.slot] === item.id) {
        // Already equipped — unequip
        const next = { ...prev };
        delete next[item.slot];
        return next;
      }
      // Equip (replaces any other item in same slot)
      return { ...prev, [item.slot]: item.id };
    });
  };

  const petPalette = LEVEL_PALETTE[level] ?? LEVEL_PALETTE[0];

  return (
    <PetContext.Provider
      value={{
        hunger, happiness, isEating, isPlaying,
        coins, totalCoins, level, petPalette,
        cleanliness, energy,
        ownedItems, equippedItems,
        triggerEat, triggerPlay, triggerBath, triggerSleep,
        addGameCoins, addGameHappiness,
        isSleeping, setIsSleeping,
        buyItem, toggleEquip,
      }}
    >
      {children}
    </PetContext.Provider>
  );
}

export function usePet() {
  return useContext(PetContext);
}
