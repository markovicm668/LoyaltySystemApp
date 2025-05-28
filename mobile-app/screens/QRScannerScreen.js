import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
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
import { CameraView, Camera } from 'expo-camera'; // CameraView for scanning
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl + "/api" || "https://your-api-fallback.com/api";

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false); // Used to disable scanner prop after a successful scan until explicitly reset
  const [isProcessing, setIsProcessing] = useState(false); // For UI loading state
  const isHandlingScanRef = useRef(false); // IMMEDIATE synchronous gate

  const apiRequest = useCallback(async (endpoint, method = 'POST', body = null) => {
    // ... (your existing apiRequest function - looks good)
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
    // Reset ref when component mounts/focuses, if needed, but generally managed by button actions
    isHandlingScanRef.current = false;
  }, []);

  const resetScanner = () => {
    isHandlingScanRef.current = false;
    setScanned(false);
    setIsProcessing(false);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    // Prevent multiple scans by checking both flags
    if (scanned || isProcessing || isHandlingScanRef.current) return;

    // Set the immediate flag to prevent any other scans
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

      setIsProcessing(false);
      setScanned(true);

      if (result.rewardJustRedeemed) {
        Alert.alert(
          "🎉 Reward Unlocked! 🎉",
          `Congratulations! You've earned: ${result.rewardName} with this scan at ${result.businessName}.\n\nYour new card for '${result.campaignName}' now has ${result.currentUserStampCount}/${result.stampGoal} stamp(s).`,
          [
            {
              text: 'Awesome!',
              onPress: () => {
                navigation.goBack({
                  selectedCardId: qrData.cid,
                  showRewardAnimation: true
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Stamp Added!",
          `You now have ${result.currentUserStampCount}/${result.stampGoal} stamps for the '${result.campaignName}' campaign at ${result.businessName}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack({
                  selectedCardId: qrData.cid
                });
              },
            },
          ]
        );
      }

    } catch (error) {
      setIsProcessing(false);
      setScanned(true);
      Alert.alert(
        "Error",
        error.message || "Failed to process QR code. Please try again.",
        [
          {
            text: 'OK',
            onPress: () => {
              // Allow user to scan again
              setScanned(false);
              isHandlingScanRef.current = false;
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
  footerControls: {
    paddingVertical: Platform.OS === 'ios' ? 20 : 15, // More padding for iOS bottom area
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Extra for home indicator
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  actionButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 20, // Adjusted padding
    borderRadius: 25, // More rounded buttons
    alignItems: 'center',
    minWidth: 120, // Ensure buttons have decent width
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