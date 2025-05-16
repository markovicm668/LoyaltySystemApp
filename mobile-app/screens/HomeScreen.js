// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   ActivityIndicator,
//   ScrollView, // For multiple cards if needed, or use FlatList
// } from 'react-native';
// import QRCode from 'react-native-qrcode-svg'; // Kept for now, value needs review
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';

// const API_URL = Constants.expoConfig.extra.apiUrl + "/api/users";

// console.log(API_URL);

// const HomeScreen = ({ navigation }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [loyaltyCards, setLoyaltyCards] = useState([]); // To store multiple cards
//   const [selectedCardIndex, setSelectedCardIndex] = useState(0); // To manage which card is "active" or focused

//   // Centralized API call function (basic example)
//   const apiRequest = useCallback(async (endpoint, method = 'GET', body = null) => {
//     const token = await AsyncStorage.getItem('userToken');
//     if (!token && endpoint !== '/api/users/login' && endpoint !== '/api/users/register') { // Check if token is needed
//         throw new Error('User not authenticated');
//     }

//     const headers = { 'Content-Type': 'application/json' };
//     if (token) {
//       headers['Authorization'] = `Bearer ${token}`;
//     }

//     const config = { method, headers };
//     if (body) {
//       config.body = JSON.stringify(body);
//     }

//     const response = await fetch(`${API_URL}${endpoint}`, config);
//     if (!response.ok) {
//       let errorData;
//       try {
//         errorData = await response.json();
//       } catch (e) {
//         errorData = { message: response.statusText };
//       }
//       throw new Error(errorData.message || `HTTP Error ${response.status}`);
//     }
//     if (response.status === 204) return null; // No content
//     return response.json();
//   }, []);


//   const fetchUserDataAndCards = useCallback(async () => {
//     try {
//       setLoading(true);
//       const storedUserId = await AsyncStorage.getItem('userId'); // userId for QR code
//       const token = await AsyncStorage.getItem('userToken');

//       if (!storedUserId || !token) {
//         navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
//         return;
//       }

//       // Get user profile
//       const userData = await apiRequest('/api/users/profile');
//       setUser(userData);

//       // Get user's loyalty cards
//       const cardsData = await apiRequest('/api/users/me/loyalty-cards');
//       setLoyaltyCards(cardsData || []); // Ensure it's an array

//       if (cardsData && cardsData.length > 0) {
//         setSelectedCardIndex(0);
//       } else {
//         setSelectedCardIndex(-1); // No card selected if none exist
//       }

//     } catch (error) {
//       console.error('Error fetching data:', error);
//       if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('unauthorized') || error.message.includes('token')) {
//         await AsyncStorage.removeItem('userToken');
//         await AsyncStorage.removeItem('userId');
//         Alert.alert('Session Expired', 'Please login again.');
//         navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
//       } else {
//         Alert.alert('Error', 'Failed to load data. Please try again later.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [navigation, apiRequest]);

//   useEffect(() => {
//     fetchUserDataAndCards();
//     const unsubscribe = navigation.addListener('focus', fetchUserDataAndCards);
//     return unsubscribe;
//   }, [navigation, fetchUserDataAndCards]);

//   const handleLogout = async () => {
//     await AsyncStorage.removeItem('userToken');
//     await AsyncStorage.removeItem('userId');
//     setUser(null);
//     setLoyaltyCards([]);
//     navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
//   };

//   const handleSelfStamp = async (card) => {
//     if (!card || !user) return;

//     if (card.currentUserStampCount >= card.campaign.stampGoal) {
//       Alert.alert("Card Full!", "This card is already full. Check your reward.");
//       return;
//     }

//     try {
//       // IMPORTANT: This endpoint /api/users/me/stamps/self-add needs to be implemented
//       const result = await apiRequest('/api/users/me/stamps/self-add', 'POST', {
//         businessId: card.business._id,
//         campaignId: card.campaign._id,
//         // userId will be taken from req.user on backend
//       });

//       if (result && result.updatedCard) {
//         // Update the specific card in the local state
//         setLoyaltyCards(prevCards =>
//           prevCards.map(c =>
//             c.campaign._id === result.updatedCard.campaign._id && c.business._id === result.updatedCard.business._id
//               ? result.updatedCard
//               : c
//           )
//         );
//         Alert.alert("Stamp Added!", `You now have ${result.updatedCard.currentUserStampCount} stamps for ${result.updatedCard.campaign.name}.`);
//         // Optionally, re-check reward immediately
//         checkReward(result.updatedCard);
//       } else {
//           Alert.alert('Stamp Added', 'Your stamp has been recorded!');
//           fetchUserDataAndCards(); // Re-fetch to be sure
//       }

//     } catch (error) {
//       console.error('Error self-stamping:', error);
//       Alert.alert('Error', `Could not add stamp: ${error.message}`);
//     }
//   };

//   const checkReward = (cardToCheck) => {
//     const card = cardToCheck || (loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null);

//     if (!card) {
//       Alert.alert('No Active Card', 'Select a card or join a campaign.');
//       return;
//     }

//     const { campaign, currentUserStampCount } = card;
//     const stampGoal = campaign.stampGoal;

//     if (currentUserStampCount >= stampGoal) {
//       Alert.alert(
//         'Reward Earned!',
//         `You've earned: ${campaign.reward}! Show this to the staff to redeem.`,
//         [
//           { text: 'OK' }
//           // For MVP, direct redemption by user is out of scope.
//           // Merchant will verify and use their system to mark as redeemed via API.
//         ]
//       );
//     } else {
//       Alert.alert(
//         'Keep Stamping!',
//         `You have ${currentUserStampCount} of ${stampGoal} stamps for ${campaign.reward}.`,
//         [{ text: 'OK' }]
//       );
//     }
//   };

//   // Simple card switcher if you want to focus on one card at a time
//   const switchDisplayedCard = (direction) => {
//     if (loyaltyCards.length === 0) return;
//     let newIndex = selectedCardIndex + direction;
//     if (newIndex < 0) newIndex = loyaltyCards.length - 1;
//     if (newIndex >= loyaltyCards.length) newIndex = 0;
//     setSelectedCardIndex(newIndex);
//   };


//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#5D4037" />
//         <Text style={styles.loadingText}>Loading your rewards...</Text>
//       </SafeAreaView>
//     );
//   }

//   const currentDisplayCard = loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null;

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>My Loyalty Cards</Text>
//         <TouchableOpacity onPress={handleLogout}>
//           <Text style={styles.logoutText}>Logout</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView contentContainerStyle={styles.content}>
//         <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>

//         {loyaltyCards.length === 0 && !loading && (
//           <View style={styles.emptyStateContainer}>
//             <Text style={styles.emptyStateText}>No Loyalty Cards Yet!</Text>
//             <Text style={styles.emptyStateSubText}>
//               Visit participating businesses and scan their QR code or ask them to add you to their campaign.
//             </Text>
//             {/* <TouchableOpacity style={styles.discoverButton} onPress={() => navigation.navigate('DiscoverBusinesses')}>
//                 <Text style={styles.discoverButtonText}>Find Businesses</Text>
//             </TouchableOpacity> */}
//           </View>
//         )}

//         {/* Displaying only the selected card for simplicity, or you can map all cards */}
//         {currentDisplayCard && (
//           <View style={styles.cardOuterContainer}>
//             {loyaltyCards.length > 1 && (
//               <View style={styles.cardSwitcher}>
//                 <TouchableOpacity onPress={() => switchDisplayedCard(-1)} style={styles.switchButton}>
//                   <Text style={styles.switchButtonText}>‹ Prev</Text>
//                 </TouchableOpacity>
//                 <Text style={styles.cardIndicatorText}>{selectedCardIndex + 1} / {loyaltyCards.length}</Text>
//                 <TouchableOpacity onPress={() => switchDisplayedCard(1)} style={styles.switchButton}>
//                   <Text style={styles.switchButtonText}>Next ›</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
//             <TouchableOpacity 
//                 key={currentDisplayCard.campaign._id}
//                 style={styles.loyaltyCard}
//                 onPress={() => handleSelfStamp(currentDisplayCard)} // Press card to stamp
//             >
//               <Text style={styles.businessName}>{currentDisplayCard.business.name}</Text>
//               <Text style={styles.campaignName}>{currentDisplayCard.campaign.name}</Text>
//               <Text style={styles.stampProgress}>
//                 Stamps: {currentDisplayCard.currentUserStampCount} / {currentDisplayCard.campaign.stampGoal}
//               </Text>
//               <Text style={styles.rewardText}>Reward: {currentDisplayCard.campaign.reward}</Text>
//               <View style={styles.stampDotsContainer}>
//                 {[...Array(currentDisplayCard.campaign.stampGoal)].map((_, i) => (
//                   <View
//                     key={i}
//                     style={[
//                       styles.stampDot,
//                       i < currentDisplayCard.currentUserStampCount ? styles.stampDotFilled : {},
//                     ]}
//                   />
//                 ))}
//               </View>
//               <Text style={styles.pressToStampText}>(Press card to add a stamp)</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.checkRewardButton}
//               onPress={() => checkReward(currentDisplayCard)}
//             >
//               <Text style={styles.checkRewardButtonText}>Check My Reward Status</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* QR Code Section - Kept for future merchant scanning, value changed to userId */}
//         {user && (
//           <View style={styles.qrSection}>
//             <Text style={styles.qrTitle}>Your Member ID</Text>
//             <View style={styles.qrWrapper}>
//               <QRCode
//                 value={user._id || 'no-user-id'} // Use actual user ID
//                 size={180}
//                 color="#5D4037"
//                 backgroundColor="white"
//               />
//             </View>
//             <Text style={styles.qrInstructions}>
//               Present this to staff to collect stamps or redeem rewards.
//             </Text>
//           </View>
//         )}

//         {/* Navigation Buttons - Keep for future expansion */}
//         <View style={styles.buttonContainer}>
//           {/* <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('DiscoverBusinesses')}>
//             <Text style={styles.navButtonText}>Find Businesses</Text>
//           </TouchableOpacity> */}
//           <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Profile')}>
//             <Text style={styles.navButtonText}>My Profile</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F0F2F5', // Lighter background
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F0F2F5',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#4A4A4A',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 15,
//     backgroundColor: '#6A1B9A', // A distinct primary color
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   logoutText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   content: {
//     flexGrow: 1, // Allows content to scroll
//     padding: 20,
//   },
//   greeting: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     marginBottom: 25,
//     color: '#333',
//   },
//   emptyStateContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//     marginTop: 50,
//   },
//   emptyStateText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#555',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   emptyStateSubText: {
//     fontSize: 16,
//     color: '#777',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   discoverButton: {
//     backgroundColor: '#7E57C2', // Accent color
//     paddingVertical: 12,
//     paddingHorizontal: 30,
//     borderRadius: 25,
//   },
//   discoverButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   cardOuterContainer: {
//     marginBottom: 30,
//   },
//   cardSwitcher: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   switchButton: {
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//   },
//   switchButtonText: {
//     fontSize: 16,
//     color: '#6A1B9A',
//     fontWeight: 'bold',
//   },
//   cardIndicatorText: {
//     fontSize: 16,
//     color: '#333',
//     fontWeight: '500',
//   },
//   loyaltyCard: {
//     backgroundColor: 'white',
//     borderRadius: 15,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 5,
//     alignItems: 'center', // Center content within the card
//     marginBottom: 20,
//   },
//   businessName: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 5,
//   },
//   campaignName: {
//     fontSize: 16,
//     color: '#555',
//     marginBottom: 15,
//   },
//   stampProgress: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#6A1B9A',
//     marginBottom: 10,
//   },
//   rewardText: {
//     fontSize: 15,
//     color: '#4CAF50', // Green for reward
//     fontWeight: '500',
//     marginBottom: 20,
//   },
//   stampDotsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap', // Allow dots to wrap if many
//     justifyContent: 'center',
//     marginBottom: 10,
//   },
//   stampDot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: '#E0E0E0', // Empty dot color
//     margin: 4,
//   },
//   stampDotFilled: {
//     backgroundColor: '#7E57C2', // Filled dot color (accent)
//   },
//   pressToStampText: {
//       marginTop: 10,
//       fontSize: 13,
//       fontStyle: 'italic',
//       color: '#888'
//   },
//   checkRewardButton: {
//     backgroundColor: '#7E57C2', // Accent color
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 25,
//     alignSelf: 'center',
//     marginTop: 10,
//   },
//   checkRewardButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   qrSection: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 20,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     marginBottom: 30,
//   },
//   qrTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     color: '#333',
//   },
//   qrWrapper: {
//     padding: 10, // Smaller padding if QR size is smaller
//     backgroundColor: 'white', // Ensure background for QR is white if needed
//     borderRadius: 8,
//     marginBottom: 10,
//     // No shadow needed if it's inside an already shadowed card
//   },
//   qrInstructions: {
//     textAlign: 'center',
//     marginTop: 10,
//     color: '#666',
//     fontSize: 14,
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around', // Space around for fewer buttons
//     marginTop: 10,
//   },
//   navButton: {
//     backgroundColor: '#6A1B9A', // Primary color
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     alignItems: 'center',
//     minWidth: 120, // Ensure buttons have some width
//   },
//   navButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 15,
//   },
// });

// export default HomeScreen;

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Assuming API_URL is correctly defined as the base for /users endpoint
const API_URL_USERS = Constants.expoConfig.extra.apiUrl + "/api/users";
// For other API calls that are not user-specific, you might need a different base or adjust `apiRequest`
const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";


console.log("User API URL:", API_URL_USERS);
console.log("Base API URL:", API_BASE_URL);


const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // Adjusted apiRequest to handle different base URLs if necessary, or ensure endpoint includes full path from /api
  const apiRequest = useCallback(async (fullEndpointPath, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    // Adjust token check if some non-user endpoints don't require tokens (e.g., public campaign list)
    if (!token && !fullEndpointPath.includes("/login") && !fullEndpointPath.includes("/register") && !fullEndpointPath.includes("/campaigns/active")) { // Example: /campaigns/active might be public or use different auth
        throw new Error('User not authenticated');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }

    // Use API_BASE_URL and ensure fullEndpointPath starts with '/' and is the path after /api
    // e.g., fullEndpointPath = "/users/profile" or "/campaigns/active"
    const response = await fetch(`${API_BASE_URL}${fullEndpointPath}`, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText || `HTTP Error ${response.status}` };
      }
      // More specific error check for token issues
      if (response.status === 401 || response.status === 403) {
         throw new Error(errorData.message || 'Authentication error. Please log in again.');
      }
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }, []);


  const fetchUserDataAndCards = useCallback(async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');

      if (!storedUserId || !token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const userData = await apiRequest('/users/profile'); // Endpoint relative to API_BASE_URL
      setUser(userData);

      const cardsData = await apiRequest('/users/me/loyalty-cards'); // Endpoint relative to API_BASE_URL
      setLoyaltyCards(cardsData || []);

      if (cardsData && cardsData.length > 0) {
        setSelectedCardIndex(0);
      } else {
        setSelectedCardIndex(-1);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('token') || error.message.includes('log in again')) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        Alert.alert('Session Expired', 'Please login again.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        Alert.alert('Error', `Failed to load data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [navigation, apiRequest]);

  useEffect(() => {
    const focusListener = navigation.addListener('focus', () => {
        console.log("HomeScreen focused, fetching data...");
        fetchUserDataAndCards();
    });
    return focusListener; // Correct way to return unsubscribe function from useEffect
  }, [navigation, fetchUserDataAndCards]);


  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setLoyaltyCards([]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // handleSelfStamp and checkReward functions remain the same for now
  // ... (keep your existing handleSelfStamp and checkReward functions) ...
  const handleSelfStamp = async (card) => {
    if (!card || !user) return;

    if (card.currentUserStampCount >= card.campaign.stampGoal) {
      Alert.alert("Card Full!", "This card is already full. Check your reward.");
      return;
    }

    try {
      // IMPORTANT: This endpoint /api/users/me/stamps/self-add needs to be implemented
      // Assuming API_BASE_URL is the correct base: /api
      const result = await apiRequest('/users/me/stamps/self-add', 'POST', {
        businessId: card.business._id,
        campaignId: card.campaign._id,
      });

      if (result && result.updatedCard) {
        setLoyaltyCards(prevCards =>
          prevCards.map(c =>
            c.campaign._id === result.updatedCard.campaign._id && c.business._id === result.updatedCard.business._id
              ? result.updatedCard
              : c
          )
        );
        Alert.alert("Stamp Added!", `You now have ${result.updatedCard.currentUserStampCount} stamps for ${result.updatedCard.campaign.name}.`);
        checkReward(result.updatedCard);
      } else {
          Alert.alert('Stamp Added', 'Your stamp has been recorded!');
          fetchUserDataAndCards();
      }

    } catch (error) {
      console.error('Error self-stamping:', error);
      Alert.alert('Error', `Could not add stamp: ${error.message}`);
    }
  };

  const checkReward = (cardToCheck) => {
    const card = cardToCheck || (loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null);

    if (!card) {
      // Alert.alert('No Active Card', 'Select a card or join a campaign.'); // User might not have card yet
      return;
    }

    const { campaign, currentUserStampCount } = card;
    const stampGoal = campaign.stampGoal;

    if (currentUserStampCount >= stampGoal) {
      Alert.alert(
        'Reward Earned!',
        `You've earned: ${campaign.reward}! Show this to the staff to redeem.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Keep Stamping!',
        `You have ${currentUserStampCount} of ${stampGoal} stamps for ${campaign.reward}.`,
        [{ text: 'OK' }]
      );
    }
  };


  const switchDisplayedCard = (direction) => {
    if (loyaltyCards.length === 0) return;
    let newIndex = selectedCardIndex + direction;
    if (newIndex < 0) newIndex = loyaltyCards.length - 1;
    if (newIndex >= loyaltyCards.length) newIndex = 0;
    setSelectedCardIndex(newIndex);
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D4037" />
        <Text style={styles.loadingText}>Loading your rewards...</Text>
      </SafeAreaView>
    );
  }

  const currentDisplayCard = loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Loyalty Cards</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>

        {loyaltyCards.length === 0 && !loading && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No Loyalty Cards Yet!</Text>
            <Text style={styles.emptyStateSubText}>
              Ready to collect stamps and earn rewards?
            </Text>
            {/* Updated "Discover Programs" button for empty state */}
            <TouchableOpacity
                style={styles.discoverButtonLarge}
                onPress={() => navigation.navigate('DiscoverCampaigns')} // Navigate to new screen
            >
                <Text style={styles.discoverButtonLargeText}>Find & Join Programs</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentDisplayCard && (
          <View style={styles.cardOuterContainer}>
            {loyaltyCards.length > 1 && (
              <View style={styles.cardSwitcher}>
                <TouchableOpacity onPress={() => switchDisplayedCard(-1)} style={styles.switchButton}>
                  <Text style={styles.switchButtonText}>‹ Prev</Text>
                </TouchableOpacity>
                <Text style={styles.cardIndicatorText}>{selectedCardIndex + 1} / {loyaltyCards.length}</Text>
                <TouchableOpacity onPress={() => switchDisplayedCard(1)} style={styles.switchButton}>
                  <Text style={styles.switchButtonText}>Next ›</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
                key={currentDisplayCard.campaign._id} // Ensure campaign._id is unique
                style={styles.loyaltyCard}
                onPress={() => handleSelfStamp(currentDisplayCard)}
            >
              <Text style={styles.businessName}>{currentDisplayCard.business.name}</Text>
              <Text style={styles.campaignName}>{currentDisplayCard.campaign.name}</Text>
              <Text style={styles.stampProgress}>
                Stamps: {currentDisplayCard.currentUserStampCount} / {currentDisplayCard.campaign.stampGoal}
              </Text>
              <Text style={styles.rewardText}>Reward: {currentDisplayCard.campaign.reward}</Text>
              <View style={styles.stampDotsContainer}>
                {[...Array(currentDisplayCard.campaign.stampGoal)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stampDot,
                      i < currentDisplayCard.currentUserStampCount ? styles.stampDotFilled : {},
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.pressToStampText}>(Press card to add a stamp - Dev Only)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRewardButton}
              onPress={() => checkReward(currentDisplayCard)}
            >
              <Text style={styles.checkRewardButtonText}>Check My Reward Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && user._id && ( // Ensure user and user._id exist
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Your Member ID</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={user._id} // Use actual user ID
                size={180}
                color="#5D4037"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.qrInstructions}>
              Present this to staff to collect stamps or redeem rewards.
            </Text>
          </View>
        )}

        {/* Updated buttonContainer */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('DiscoverCampaigns')} // Navigate to new screen
          >
            <Text style={styles.navButtonText}>Discover Programs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (keep all your existing styles)
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A4A4A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#6A1B9A',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  emptyStateContainer: {
    // flex: 1, // Removed to allow content below it if needed
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40, // Increased padding
    paddingHorizontal: 20,
    marginTop: 30, // Added margin
    backgroundColor: '#FFFFFF', // Give it a card-like background
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyStateText: {
    fontSize: 22, // Slightly larger
    fontWeight: 'bold',
    color: '#333', // Darker text
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#555', // Slightly darker
    textAlign: 'center',
    marginBottom: 25, // More space before button
  },
  // New style for a larger discover button in empty state
  discoverButtonLarge: {
    backgroundColor: '#7E57C2',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30, // More rounded
    elevation: 2,
  },
  discoverButtonLargeText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Old discoverButton styles (can be removed if discoverButtonLarge is preferred for all cases or kept for other uses)
  discoverButton: {
    backgroundColor: '#7E57C2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  discoverButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardOuterContainer: {
    marginBottom: 30,
  },
  cardSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  switchButtonText: {
    fontSize: 16,
    color: '#6A1B9A',
    fontWeight: 'bold',
  },
  cardIndicatorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  loyaltyCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  campaignName: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
  },
  stampProgress: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 10,
  },
  rewardText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 20,
  },
  stampDotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stampDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    margin: 4,
  },
  stampDotFilled: {
    backgroundColor: '#7E57C2',
  },
  pressToStampText: {
      marginTop: 10,
      fontSize: 13,
      fontStyle: 'italic',
      color: '#888'
  },
  checkRewardButton: {
    backgroundColor: '#7E57C2',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 10,
  },
  checkRewardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
  },
  qrInstructions: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20, // Added some margin top
    marginBottom: 10, // Added some margin bottom
  },
  navButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 14, // Slightly taller
    paddingHorizontal: 15, // Adjust padding
    borderRadius: 8,
    alignItems: 'center',
    flex: 1, // Allow buttons to share space
    marginHorizontal: 5, // Add some space between buttons
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default HomeScreen;