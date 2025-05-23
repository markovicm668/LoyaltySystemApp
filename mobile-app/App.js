import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, LogBox } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';// Example in your Navigator
import DiscoverCampaignsScreen from './screens/DiscoverCampaignsScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import BusinessHomeScreen from './screens/BusinessHomeScreen';

// ...

// ...
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
        <Stack.Screen
          name="DiscoverCampaigns"
          component={DiscoverCampaignsScreen}
          options={{ title: 'Discover Programs' }} // Or set title in the screen itself
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ 
            title: 'Scan QR Code',
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen 
          name="BusinessHome"
          component={BusinessHomeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
