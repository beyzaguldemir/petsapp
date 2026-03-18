import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { usePet } from '../context/PetContext';
import { SHOP_ITEMS } from '../constants/shopItems';
import PetStatusBar from '../components/PetStatusBar';

export default function ShopScreen() {
  const { coins, ownedItems, equippedItems, buyItem, toggleEquip, isSleeping } = usePet();

  const getStatus = (item) => {
    if (!ownedItems.includes(item.id)) return 'buy';
    if (equippedItems[item.slot] === item.id) return 'equipped';
    return 'owned';
  };

  const handlePress = (item) => {
    const status = getStatus(item);
    if (status === 'buy') {
      buyItem(item);
    } else {
      toggleEquip(item);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#eef2ff' }}>
      <PetStatusBar />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text style={styles.title}>🛍️ Shop</Text>
          <Text style={styles.subtitle}>Dress up Buddy!</Text>
        </View>

        {/* ── Equipped preview strip ──────────────────── */}
        <View style={styles.equippedRow}>
          <Text style={styles.equippedLabel}>Wearing:</Text>
          {Object.values(equippedItems).length === 0 ? (
            <Text style={styles.equippedNone}>Nothing equipped</Text>
          ) : (
            SHOP_ITEMS
              .filter(i => equippedItems[i.slot] === i.id)
              .map(i => (
                <View key={i.id} style={styles.equippedChip}>
                  <Text style={styles.equippedChipText}>{i.emoji} {i.name}</Text>
                </View>
              ))
          )}
        </View>

        {/* ── Item grid ───────────────────────────────── */}
        <View style={styles.grid}>
          {SHOP_ITEMS.map(item => {
            const status  = getStatus(item);
            const canAfford = coins >= item.price;

            return (
              <View key={item.id} style={[
                styles.card,
                status === 'equipped' && styles.cardEquipped,
                status === 'owned'    && styles.cardOwned,
              ]}>
                {/* Equipped badge */}
                {status === 'equipped' && (
                  <View style={styles.equippedBadge}>
                    <Text style={styles.equippedBadgeText}>✓ On</Text>
                  </View>
                )}

                {/* Emoji */}
                <Text style={styles.itemEmoji}>{item.emoji}</Text>

                {/* Info */}
                <Text style={styles.itemName}>{item.name}</Text>

                {status === 'buy' ? (
                  <Text style={[styles.itemPrice, !canAfford && styles.itemPriceGray]}>
                    💰 {item.price}
                  </Text>
                ) : (
                  <Text style={styles.itemOwned}>✓ Owned</Text>
                )}

                {/* Action button */}
                <TouchableOpacity
                  style={[
                    styles.btn,
                    status === 'buy'      && (canAfford ? styles.btnBuy  : styles.btnDisabled),
                    status === 'owned'    && styles.btnEquip,
                    status === 'equipped' && styles.btnRemove,
                  ]}
                  onPress={() => handlePress(item)}
                  disabled={status === 'buy' && !canAfford}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnText}>
                    {status === 'buy'      && (canAfford ? `Buy  💰${item.price}` : `Need 💰${item.price}`)}
                    {status === 'owned'    && '👕 Equip'}
                    {status === 'equipped' && '✕ Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  header: { marginBottom: 14 },
  title:  { fontSize: 26, fontWeight: '800', color: '#3a3a5c' },
  subtitle: { fontSize: 13, color: '#7a7a9d', marginTop: 2 },

  /* equipped preview */
  equippedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  equippedLabel: { fontSize: 13, fontWeight: '700', color: '#7a7a9d' },
  equippedNone:  { fontSize: 13, color: '#b0b0c8', fontStyle: 'italic' },
  equippedChip: {
    backgroundColor: '#e8e0f7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  equippedChipText: { fontSize: 13, fontWeight: '700', color: '#5c3d9e' },

  /* grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  /* item card */
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  cardOwned:    { borderColor: '#a5b4fc' },
  cardEquipped: { borderColor: '#7c5cbf', backgroundColor: '#f3eeff' },

  equippedBadge: {
    position: 'absolute',
    top: 8, right: 10,
    backgroundColor: '#7c5cbf',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  equippedBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  itemEmoji: { fontSize: 44, marginBottom: 6, marginTop: 4 },
  itemName:  { fontSize: 14, fontWeight: '700', color: '#3a3a5c', textAlign: 'center', marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#b8860b', marginBottom: 8 },
  itemPriceGray: { color: '#b0b0c8' },
  itemOwned: { fontSize: 12, fontWeight: '600', color: '#7c5cbf', marginBottom: 8 },

  /* buttons */
  btn: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnBuy:      { backgroundColor: '#7c5cbf' },
  btnDisabled: { backgroundColor: '#d8d8e8' },
  btnEquip:    { backgroundColor: '#4caf50' },
  btnRemove:   { backgroundColor: '#ef5350' },
  btnText:     { fontSize: 13, fontWeight: '800', color: '#fff' },
});
