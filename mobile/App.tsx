import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View, StyleSheet } from 'react-native';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import SkillsScreen from './src/screens/skills/SkillsScreen';
import SkillDetailScreen from './src/screens/skills/SkillDetailScreen';
import MessagesScreen from './src/screens/messages/MessagesScreen';
import ChatScreen from './src/screens/messages/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VideoCallScreen from './src/screens/calls/VideoCallScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import CameraScreen from './src/screens/CameraScreen';

// Store
import { useAuthStore } from './src/store/authStore';

// Services
import { initializeNotifications } from './src/services/notifications';
import { initializeOfflineSync } from './src/services/offlineSync';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Skills" 
        component={SkillsScreen}
        options={{
          tabBarLabel: 'Skills',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          headerShown: false,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      await checkAuth();
      await initializeNotifications();
      await initializeOfflineSync();
    };
    initApp();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              // Auth Stack
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (
              // Main App Stack
              <>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="SkillDetail" component={SkillDetailScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="VideoCall" component={VideoCallScreen} />
                <Stack.Screen name="Camera" component={CameraScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
