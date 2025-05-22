// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   TouchableOpacity,
//   Alert,
//   ActivityIndicator,
//   SafeAreaView,
//   Platform,
// } from 'react-native';
// import { CameraView, Camera } from 'expo-camera';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl + "/api" || "https://your-api-fallback.com/api";

// const QRScannerScreen = ({ navigation }) => {
//   const [hasPermission, setHasPermission] = useState(null);
//   const [scanned, setScanned] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);

//   // Centralized API Request Function
//   const apiRequest = useCallback(async (endpoint, method = 'POST', body = null) => {
//     const token = await AsyncStorage.getItem('userToken');
//     if (!token) {
//       Alert.alert("Authentication Error", "You need to be logged in to perform this action.", [{ text: "OK", onPress: () => navigation.navigate('Login') }]);
//       throw new Error('User not authenticated');
//     }
//     const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
//     const config = { method, headers, body: body ? JSON.stringify(body) : null };

//     const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
//     const responseData = await response.json();

//     if (!response.ok) {
//       throw new Error(responseData.message || `Request failed with status ${response.status}`);
//     }
//     return responseData;
//   }, [navigation]);

//   useEffect(() => {
//     const requestCameraPermission = async () => {
//       const { status } = await Camera.requestCameraPermissionsAsync();
//       setHasPermission(status === 'granted');
//       if (status !== 'granted') {
//         Alert.alert("Permission Denied", "Camera permission is required to scan QR codes.");
//       }
//     };
//     requestCameraPermission();
//   }, []);

//   const handleBarCodeScanned = async ({ type, data }) => {
//     if (scanned || isProcessing) {
//         return;
//     }
//     setScanned(true);
//     setIsProcessing(true);

//     console.log(`Scanned QR: Type: ${type}, Data: ${data}`); // This log is helpful

//     try {
//       let qrData;
//       try {
//         qrData = JSON.parse(data);
//       } catch (error) {
//         console.error("QR Data Parsing Error:", error);
//         throw new Error('This QR code has an invalid format. Please scan a valid campaign QR code.');
//       }

//       // CORRECTED VALIDATION: Check for 'cid' and 'bid'
//       if (qrData.type !== 'stamp' || !qrData.cid || !qrData.bid) {
//         console.error("Invalid QR Data Structure (expecting type, cid, bid):", qrData);
//         throw new Error('This QR code is not a valid campaign stamp code.');
//       }

//       // CORRECTED API CALL: Use qrData.cid and qrData.bid
//       const result = await apiRequest('/users/me/stamps/collect-by-scan', 'POST', {
//         campaignId: qrData.cid,          // Use .cid
//         businessIdFromQR: qrData.bid,    // Use .bid
//         scannedAt: new Date().toISOString(),
//       });

//       // The rest of the success logic should be fine as 'result' comes from your backend
//       // and should contain 'campaignName', 'currentUserStampCount', 'stampGoal' etc.
//       Alert.alert(
//         result.rewardEarned ? "Reward Earned!" : "Stamp Collected!",
//         `${result.message || 'Your stamp has been added.'}\nCampaign: ${result.campaignName}\nYour Stamps: ${result.currentUserStampCount}/${result.stampGoal}`,
//         [
//           {
//             text: 'OK',
//             onPress: () => {
//               setTimeout(() => {
//                 setScanned(false);
//                 setIsProcessing(false);
//               }, 1500); // Allow scanning again after a short delay
//             },
//           },
//         ]
//       );
      
//       if (result.rewardEarned && result.reward) {
//            console.log(`Reward earned: ${result.reward}`);
//       }

//     } catch (error) {
//       console.error("Error processing scanned QR code:", error);
//       Alert.alert(
//         'Scan Error',
//         error.message || 'Failed to process the QR code. Please ensure it is a valid campaign code and try again.',
//         [
//           {
//             text: 'Try Again',
//             onPress: () => {
//             setScanned(false);
//             setIsProcessing(false); // Reset states to allow trying again
//           },
//         },
//       ]
//     );
//   } // Removed one extra closing brace that seemed to be there in the thought process
//   };

//   if (hasPermission === null) {
//     return (
//       <SafeAreaView style={styles.centeredContainer}>
//         <ActivityIndicator size="large" color="#6A1B9A" />
//         <Text style={styles.statusText}>Requesting camera permission...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (hasPermission === false) {
//     return (
//       <SafeAreaView style={styles.centeredContainer}>
//         <Text style={styles.statusText}>No access to camera.</Text>
//         <Text style={styles.statusSubText}>Please enable camera permissions in your device settings to scan QR codes.</Text>
//         <TouchableOpacity
//           style={styles.actionButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Text style={styles.actionButtonText}>Go Back</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.fullScreen}>
//       <View style={styles.scannerViewContainer}>
//         <CameraView
//           onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
//           style={StyleSheet.absoluteFillObject}
//           barcodeScannerSettings={{
//             barcodeTypes: ['qr'],
//           }}
//         />
//         <View style={styles.overlay}>
//           <Text style={styles.scanPrompt}>Point your camera at the Campaign QR Code</Text>
//           <View style={styles.scanBox} />
//         </View>

//         {isProcessing && (
//           <View style={styles.processingOverlay}>
//             <ActivityIndicator size="large" color="#FFFFFF" />
//             <Text style={styles.processingText}>Collecting Stamp...</Text>
//           </View>
//         )}
//       </View>
//       {!isProcessing && scanned && (
//          <View style={styles.footerControls}>
//             <TouchableOpacity
//                 style={[styles.actionButton, styles.scanAgainButton]}
//                 onPress={() => { setScanned(false); setIsProcessing(false);}}
//             >
//                 <Text style={styles.actionButtonText}>Scan Another Code</Text>
//             </TouchableOpacity>
//          </View>
//       )}
//        <View style={styles.footerControls}>
//             <TouchableOpacity
//                 style={styles.actionButton}
//                 onPress={() => navigation.goBack()}
//             >
//                 <Text style={styles.actionButtonText}>Cancel</Text>
//             </TouchableOpacity>
//         </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   fullScreen: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   centeredContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#f0f0f0',
//   },
//   statusText: {
//     fontSize: 18,
//     color: '#333',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   statusSubText: {
//     fontSize: 15,
//     color: '#555',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   scannerViewContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   scanPrompt: {
//     fontSize: 18,
//     color: 'white',
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     paddingVertical: 8,
//     paddingHorizontal: 15,
//     borderRadius: 8,
//     textAlign: 'center',
//     position: 'absolute',
//     top: '10%',
//     zIndex: 1,
//   },
//   scanBox: {
//     width: Platform.OS === 'ios' ? 280 : 260,
//     height: Platform.OS === 'ios' ? 280 : 260,
//     borderWidth: 2,
//     borderColor: 'rgba(255, 255, 255, 0.8)',
//     borderRadius: 12,
//   },
//   processingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 2,
//   },
//   processingText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: '500',
//     marginTop: 15,
//   },
//   footerControls: {
//     padding: 15,
//     backgroundColor: 'rgba(0,0,0,0.8)',
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   actionButton: {
//     backgroundColor: '#6A1B9A',
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginHorizontal: 10,
//   },
//   scanAgainButton: {
//     backgroundColor: '#007AFF',
//   },
//   actionButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });

// export default QRScannerScreen;

// screens/QRScannerScreen.js
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
  const  isHandlingScanRef = useRef(false); // IMMEDIATE synchronous gate

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
    // IMMEDIATE check using ref to prevent multiple entries from rapid-fire events
    if (isHandlingScanRef.current) {
      return;
    }
    isHandlingScanRef.current = true; // Set the flag immediately

    // Set states for UI updates and to disable CameraView's onBarcodeScanned prop via 'scanned' state
    setScanned(true);
    setIsProcessing(true);

    console.log(`Scanned QR: Type: ${type}, Data: ${data}`); // This should now log only once per scan attempt

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

      setIsProcessing(false); // Processing done for API call

      Alert.alert(
        result.rewardEarned ? "Reward Earned!" : "Stamp Collected!",
        `${result.message || 'Your stamp has been added.'}\nCampaign: ${result.campaignName}\nYour Stamps: ${result.currentUserStampCount}/${result.stampGoal}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Scanner remains "scanned" (disabled). User must press "Scan Another" or "Cancel".
            },
          },
        ]
      );
      
      if (result.rewardEarned && result.reward) {
           console.log(`Reward earned: ${result.reward}`);
      }

    } catch (error) {
      console.error("Error processing scanned QR code:", error);
      setIsProcessing(false); // Ensure processing is false on error
      // Don't reset isHandlingScanRef.current or scanned here immediately,
      // let the "Try Again" button do it, or if no "Try Again", then reset.
      Alert.alert(
        'Scan Error',
        error.message || 'Failed to process the QR code. Please ensure it is a valid campaign code and try again.',
        [
          {
            text: 'Try Again',
            onPress: resetScanner, // Use the reset function
          },
          {
            text: 'Cancel',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
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
          // Control scanning via the 'scanned' state.
          // Once scanned is true, onBarcodeScanned becomes undefined, stopping further callbacks.
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'], // Only scan for QR codes
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
      <View style={styles.footerControls}>
        {scanned && !isProcessing && ( // Show "Scan Another" only after a scan is processed
            <TouchableOpacity
                style={[styles.actionButton, styles.scanAgainButton]}
                onPress={resetScanner} // Use the reset function
            >
                <Text style={styles.actionButtonText}>Scan Another</Text>
            </TouchableOpacity>
        )}
        <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
        >
            <Text style={styles.actionButtonText}>
                {scanned && !isProcessing ? 'Done' : 'Cancel'}
            </Text>
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
    minWidth: 120, // Ensure buttons have decent widthe
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