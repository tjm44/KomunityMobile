import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import DevScreenBadge from '../components/DevScreenBadge';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const { sessionNotice, setSessionNotice, handlePhoneAuthSuccess, handleLoginSuccess, handleSignUpSuccess } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <WelcomeScreen
              onShowLogin={() => {
                setSessionNotice(null);
                navigation.navigate('PhoneAuth', { sessionNotice: null });
              }}
              onShowSignUp={() => {
                setSessionNotice(null);
                navigation.navigate('PhoneAuth', { sessionNotice: null });
              }}
            />
            <DevScreenBadge id="MOB-01" />
          </View>
        )}
      </Stack.Screen>

      <Stack.Screen name="PhoneAuth">
        {({ navigation, route }) => (
          <View style={{ flex: 1 }}>
            <PhoneAuthScreen
              onLoginSuccess={(isNew) => {
                setSessionNotice(null);
                handlePhoneAuthSuccess(isNew);
              }}
              onBack={() => {
                setSessionNotice(null);
                navigation.navigate('Welcome');
              }}
              sessionNotice={route.params?.sessionNotice ?? sessionNotice}
            />
            <DevScreenBadge id="MOB-04" />
          </View>
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onShowSignUp={() => navigation.navigate('SignUp')}
              onForgotPassword={() => navigation.navigate('PasswordReset')}
              onBack={() => navigation.goBack()}
            />
            <DevScreenBadge id="MOB-02" />
          </View>
        )}
      </Stack.Screen>

      <Stack.Screen name="SignUp">
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <SignUpScreen
              onSignUpSuccess={() => handleSignUpSuccess()}
              onBackToLogin={() => navigation.navigate('Login')}
              onBack={() => navigation.goBack()}
            />
            <DevScreenBadge id="MOB-03" />
          </View>
        )}
      </Stack.Screen>

      <Stack.Screen name="PasswordReset">
        {({ navigation }) => (
          <View style={{ flex: 1 }}>
            <PasswordResetScreen
              onBackToLogin={() => navigation.navigate('Login')}
            />
            <DevScreenBadge id="MOB-05" />
          </View>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
