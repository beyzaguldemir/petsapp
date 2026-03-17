import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import MoodTracker from './components/MoodTracker';
import Pet from './components/Pet';
import DeveloperCard from './components/DeveloperCard';

export default function App() {
  const [selectedMood, setSelectedMood] = useState(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor="#eef2ff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐾 PetsApp</Text>
        <Text style={styles.headerSubtitle}>Your virtual pet companion</Text>
      </View>

      <MoodTracker selectedMood={selectedMood} onMoodChange={setSelectedMood} />

      <Pet name="Buddy" type="Golden Retriever 🐶" />

      <DeveloperCard name="Alex Rivera" expertise="React Native Developer" level={5} />

      <Text style={styles.footer}>Made with ❤️ using Expo</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3a3a5c',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7a7a9d',
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    color: '#aaa',
  },
});
