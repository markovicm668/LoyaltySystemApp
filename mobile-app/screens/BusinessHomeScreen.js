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
import { configureReanimatedLogger } from 'react-native-reanimated';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl + "/api" || "https://your-api-fallback.com/api";

const BusinessHomeScreen = ({ navigation }) => {
  const [businessData, setBusinessData] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Error", "Please log in to access this feature");
        navigation.navigate('Login');
        return;
      }
      
      // Fetch business details
      const response = await fetch(`${API_BASE_URL}/businesses/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch business data');
      }
      
      const data = await response.json();
      
      if (!data.business) {
        throw new Error('No business data found');
      }
      
      setBusinessData(data.business);
      
      // Get the first active campaign
      if (data.campaigns && data.campaigns.length > 0) {
        const activeCampaign = data.campaigns.find(c => c.isActive);
        if (activeCampaign) {
          setCampaignData(activeCampaign);
          await generateQRCode(activeCampaign._id);
        }
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to load business data. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (campaignId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/qrcode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
    } catch (error) {
      Alert.alert("Error", "Failed to generate QR code");
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
        <Text style={styles.errorText}>No business data found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RegisterBusiness')}
        >
          <Text style={styles.buttonText}>Register Your Business</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {businessData.logo && (
          <Image
            source={{ uri: businessData.logo }}
            style={styles.logo}
          />
        )}
        <Text style={styles.businessName}>{businessData.name}</Text>
        <Text style={styles.category}>{businessData.category}</Text>
      </View>

      <View style={styles.qrContainer}>
        {qrCode ? (
          <QRCode
            value={qrCode}
            size={250}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <Text style={styles.noQrText}>No active campaign found</Text>
        )}
        <Text style={styles.qrInstructions}>
          Have customers scan this QR code to collect stamps
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Today's Activity</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Stamps Issued</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Rewards Claimed</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchBusinessData}
      >
        <Text style={styles.refreshButtonText}>Refresh QR Code</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
    margin: 20,
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
    backgroundColor: '#6A1B9A',
    padding: 15,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#6A1B9A',
    padding: 15,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BusinessHomeScreen; 