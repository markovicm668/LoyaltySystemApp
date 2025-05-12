import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, LogBox } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
// import LoyaltyStatusScreen from './screens/LoyaltyStatusScreen';
// import HistoryScreen from './screens/HistoryScreen';

// Ignore specific warnings
LogBox.ignoreLogs(['Reanimated 2']);

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        {/* <Stack.Screen name="LoyaltyStatus" component={LoyaltyStatusScreen} options={{ title: 'Your Loyalty Status' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Stamp History' }} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
