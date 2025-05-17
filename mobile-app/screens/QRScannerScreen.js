import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl + "/api" || "https://your-api-fallback.com/api";

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Centralized API Request Function
  const apiRequest = useCallback(async (endpoint, method = 'POST', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert("Authentication Error", "You need to be logged in to perform this action.", [{ text: "OK", onPress: () => navigation.navigate('Login') }]);
      throw new Error('User not authenticated');
    }
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const config = { method, headers, body: body ? JSON.stringify(body) : null };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || `Request failed with status ${response.status}`);
    }
    return responseData;
  }, [navigation]);

  useEffect(() => {
    const requestCameraPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Camera permission is required to scan QR codes.");
      }
    };
    requestCameraPermission();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessing) {
        return;
    }
    setScanned(true);
    setIsProcessing(true);

    console.log(`Scanned QR: Type: ${type}, Data: ${data}`);

    try {
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (error) {
        console.error("QR Data Parsing Error:", error);
        throw new Error('This QR code has an invalid format. Please scan a valid campaign QR code.');
      }

      if (qrData.type !== 'stamp' || !qrData.campaignId || !qrData.businessId) {
        console.error("Invalid QR Data Structure:", qrData);
        throw new Error('This QR code is not a valid campaign stamp code.');
      }

      const result = await apiRequest('/users/me/stamps/collect-by-scan', 'POST', {
        campaignId: qrData.campaignId,
        businessIdFromQR: qrData.businessId,
        scannedAt: new Date().toISOString(),
      });

      Alert.alert(
        result.rewardEarned ? "Reward Earned!" : "Stamp Collected!",
        `${result.message || 'Your stamp has been added.'}\nCampaign: ${result.campaignName || qrData.campaignName}\nYour Stamps: ${result.currentUserStampCount}/${result.stampGoal}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setTimeout(() => {
                setScanned(false);
                setIsProcessing(false);
              }, 1500);
            },
          },
        ]
      );
      
      if (result.rewardEarned && result.reward) {
           console.log(`Reward earned: ${result.reward}`);
      }

    } catch (error) {
      console.error("Error processing scanned QR code:", error);
      Alert.alert(
        'Scan Error',
        error.message || 'Failed to process the QR code. Please ensure it is a valid campaign code and try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
            setScanned(false);
            setIsProcessing(false);
          },
        },
      ]
    );
  }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6A1B9A" />
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.statusText}>No access to camera.</Text>
        <Text style={styles.statusSubText}>Please enable camera permissions in your device settings to scan QR codes.</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fullScreen}>
      <View style={styles.scannerViewContainer}>
        <CameraView
          onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.overlay}>
          <Text style={styles.scanPrompt}>Point your camera at the Campaign QR Code</Text>
          <View style={styles.scanBox} />
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.processingText}>Collecting Stamp...</Text>
          </View>
        )}
      </View>
      {!isProcessing && scanned && (
         <View style={styles.footerControls}>
            <TouchableOpacity
                style={[styles.actionButton, styles.scanAgainButton]}
                onPress={() => { setScanned(false); setIsProcessing(false);}}
            >
                <Text style={styles.actionButtonText}>Scan Another Code</Text>
            </TouchableOpacity>
         </View>
      )}
       <View style={styles.footerControls}>
            <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusSubText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  scannerViewContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanPrompt: {
    fontSize: 18,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    textAlign: 'center',
    position: 'absolute',
    top: '10%',
    zIndex: 1,
  },
  scanBox: {
    width: Platform.OS === 'ios' ? 280 : 260,
    height: Platform.OS === 'ios' ? 280 : 260,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 15,
  },
  footerControls: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;