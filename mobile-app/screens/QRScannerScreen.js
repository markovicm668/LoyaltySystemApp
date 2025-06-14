// QRScannerScreen
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const isHandlingScanRef = useRef(false);

  const apiRequest = useCallback(async (endpoint, method = 'POST', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      navigation.navigate('Login');
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
    isHandlingScanRef.current = false;
  }, []);

  const resetScanner = () => {
    isHandlingScanRef.current = false;
    setScanned(false);
    setIsProcessing(false);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessing || isHandlingScanRef.current) return;

    isHandlingScanRef.current = true;
    setIsProcessing(true);

    try {
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (error) {
        console.error("QR Data Parsing Error:", error);
        throw new Error('This QR code has an invalid format. Please scan a valid campaign QR code.');
      }

      if (qrData.type !== 'stamp' || !qrData.cid || !qrData.bid) {
        console.error("Invalid QR Data Structure (expecting type, cid, bid):", qrData);
        throw new Error('This QR code is not a valid campaign stamp code.');
      }

      const result = await apiRequest('/users/me/stamps/collect-by-scan', 'POST', {
        campaignId: qrData.cid,
        businessIdFromQR: qrData.bid,
        scannedAt: new Date().toISOString(),
      });

      // Store the scan result for the home screen to pick up
      await AsyncStorage.setItem('lastScanResult', JSON.stringify({
        success: true,
        campaignId: qrData.cid,
        rewardJustRedeemed: result.rewardJustRedeemed,
        rewardName: result.rewardName,
        businessName: result.businessName,
        campaignName: result.campaignName,
        currentUserStampCount: result.currentUserStampCount,
        stampGoal: result.stampGoal,
      }));

      // Navigate back to home screen
      navigation.goBack();

    } catch (error) {
      // Store the error result
      await AsyncStorage.setItem('lastScanResult', JSON.stringify({
        success: false,
        error: error.message || "Failed to process QR code. Please try again."
      }));

      navigation.goBack();
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
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
          <Text style={styles.actionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fullScreen}>
      <View style={styles.scannerViewContainer}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.overlay}>
          <Text style={styles.scanPrompt}>Point camera at Campaign QR Code</Text>
          <View style={styles.scanBox} />
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.processingText}>Collecting Stamp...</Text>
          </View>
        )}
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
  actionButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 120,
    marginHorizontal: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;