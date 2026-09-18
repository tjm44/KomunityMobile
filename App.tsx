import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Enable native screen optimisations for react-navigation
enableScreens();

function AppContent() {
  const { isCheckingAuth } = useAuth();
  const [fontsLoaded] = useFonts({
    'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
    'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
  });

  if (isCheckingAuth || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Text
          style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#2563eb',
            marginBottom: 16,
          }}
        >
          Komunity
        </Text>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
