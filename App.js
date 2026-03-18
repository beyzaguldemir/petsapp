import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { PetProvider } from './context/PetContext';
import HomeScreen       from './screens/HomeScreen';
import FeedScreen       from './screens/FeedScreen';
import PlayScreen       from './screens/PlayScreen';
import BathScreen       from './screens/BathScreen';
import SleepScreen      from './screens/SleepScreen';
import ShopScreen       from './screens/ShopScreen';
import GamesScreen      from './screens/GamesScreen';
import GameJumpScreen   from './screens/GameJumpScreen';
import GameMatchScreen  from './screens/GameMatchScreen';
import GameCatchScreen  from './screens/GameCatchScreen';

const Tab       = createBottomTabNavigator();
const PlayStack = createNativeStackNavigator();

function PlayNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayHome"  component={PlayScreen} />
      <PlayStack.Screen name="Games"     component={GamesScreen} />
      <PlayStack.Screen name="GameJump"  component={GameJumpScreen} />
      <PlayStack.Screen name="GameMatch" component={GameMatchScreen} />
      <PlayStack.Screen name="GameCatch" component={GameCatchScreen} />
    </PlayStack.Navigator>
  );
}

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.55 }}>
      {emoji}
    </Text>
  );
}

export default function App() {
  return (
    <PetProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
              elevation: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              height: 64,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarActiveTintColor: '#7c5cbf',
            tabBarInactiveTintColor: '#aaa',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '700',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Feed"
            component={FeedScreen}
            options={{
              tabBarLabel: 'Feed',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🍔" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Play"
            component={PlayNavigator}
            options={{
              tabBarLabel: 'Play',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Bath"
            component={BathScreen}
            options={{
              tabBarLabel: 'Bath',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🛁" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Sleep"
            component={SleepScreen}
            options={{
              tabBarLabel: 'Sleep',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🌙" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Shop"
            component={ShopScreen}
            options={{
              tabBarLabel: 'Shop',
              tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PetProvider>
  );
}
