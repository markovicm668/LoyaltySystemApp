// screens/BusinessHomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import QRCode from 'react-native-qrcode-svg';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ? Constants.expoConfig.extra.apiUrl + "/api" : "https://your-api-fallback.com/api"; // Fallback is good for robustness

const BusinessHomeScreen = ({ navigation }) => {
  const [businessData, setBusinessData] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [qrCodeValue, setQrCodeValue] = useState(null); // Renamed state for clarity
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQr, setIsLoadingQr] = useState(false); // Separate loading for QR

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);
      setQrCodeValue(null); // Reset QR while fetching business data
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Error", "Please log in to access this feature.");
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/businesses/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch business data and parse error.' }));
        throw new Error(errorData.message || 'Failed to fetch business data');
      }

      const data = await response.json();

      if (!data.business) {
        setBusinessData(null); // Ensure businessData is null if not found
        throw new Error('No business data found for your account.');
      }

      setBusinessData(data.business);

      if (data.campaigns && data.campaigns.length > 0) {
        const activeCampaign = data.campaigns.find(c => c.isActive);
        if (activeCampaign) {
          setCampaignData(activeCampaign);
          await generateAndSetQRCode(activeCampaign._id); // Changed function name
        } else {
          setCampaignData(null); // No active campaign
          setQrCodeValue(null);
        }
      } else {
        setCampaignData(null);
        setQrCodeValue(null);
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      Alert.alert("Error", error.message || "Failed to load business data. Please try again.");
      setBusinessData(null); // Clear business data on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      setBusinessData(null);
      setCampaignData(null);
      setQrCodeValue(null);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const generateAndSetQRCode = async (campaignId) => {
    if (!campaignId) return;
    setIsLoadingQr(true); // Start QR loading
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/qrcode`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server error generating QR code.' }));
        throw new Error(errorData.message || 'Failed to generate QR code content');
      }

      const data = await response.json(); // Expect { qrValue: "{\"type\":\"stamp\",...}" }

      if (data.qrValue) {
        setQrCodeValue(data.qrValue); // Set the STRING to be encoded
      } else {
        throw new Error('QR code value not received from server.');
      }
    } catch (error) {
      console.error('Error in generateAndSetQRCode:', error);
      Alert.alert("Error Generating QR", error.message || "Could not retrieve QR code data.");
      setQrCodeValue(null); // Clear QR on error
    } finally {
      setIsLoadingQr(false); // Stop QR loading
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </SafeAreaView>
    );
  }

  if (!businessData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No business data found.</Text>
        <Text style={styles.errorSubText}>Please ensure you have registered a business.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RegisterBusiness')} // Or to a screen to create one
        >
          <Text style={styles.buttonText}>Register Your Business</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={fetchBusinessData}
        >
          <Text style={[styles.buttonText, styles.buttonOutlineText]}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Assuming businessData.logo might not be a full URL if stored as path */}
        {businessData.logo && (
          <Image
            source={{ uri: businessData.logo.startsWith('http') ? businessData.logo : `${Constants.expoConfig?.extra?.apiUrl}/${businessData.logo}` }}
            style={styles.logo}
            onError={(e) => console.log("Error loading logo:", e.nativeEvent.error)}
          />
        )}
        <Text style={styles.businessName}>{businessData.name}</Text>
        <Text style={styles.category}>{businessData.category}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.qrContainer}>
        {isLoadingQr ? (
          <ActivityIndicator size="large" color="#6A1B9A" />
        ) : qrCodeValue ? (
          <QRCode
            value={qrCodeValue} // This is now the short JSON string
            size={250}
            backgroundColor="white"
            color="black"
            logo={businessData.logo ? { uri: businessData.logo.startsWith('http') ? businessData.logo : `${Constants.expoConfig?.extra?.apiUrl}/${businessData.logo}` } : undefined} // Optional: Add logo to QR
            logoSize={50}
            logoBackgroundColor='transparent'
          />
        ) : (
          <Text style={styles.noQrText}>
            {campaignData ? "Could not generate QR code." : "No active campaign to display QR for."}
          </Text>
        )}
        <Text style={styles.qrInstructions}>
          Have customers scan this QR code to collect stamps for: {campaignData?.name || ''}
        </Text>
      </View>

      {/* ... (rest of your UI: stats, refresh button) ... */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Today's Activity (Placeholder)</Text>
        {/* ... stats ... */}
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchBusinessData}
        disabled={isLoading || isLoadingQr}
      >
        <Text style={styles.refreshButtonText}>Refresh Data & QR Code</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', // Center content when loading or no data
  },
  errorText: {
    fontSize: 18,
    color: '#D32F2F', // Error color
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'center', // Center button
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6A1B9A',
  },
  buttonOutlineText: {
    color: '#6A1B9A',
  },
  // ... rest of your styles
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6A1B9A',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  category: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  qrInstructions: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noQrText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A1B9A',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: '#7E57C2', 
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BusinessHomeScreen;