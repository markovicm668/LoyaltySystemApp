// import React, { useState, useEffect } from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import QRCode from 'react-native-qrcode-svg';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_URL = 'http://192.168.1.163:5001';

// const HomeScreen = ({ navigation }) => {
//   const [user, setUser] = useState(null);
//   const [stampCount, setStampCount] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [userToken, setUserToken] = useState('');
//   const [campaigns, setCampaigns] = useState([]);
//   const [currentCampaign, setCurrentCampaign] = useState(null);

//   useEffect(() => {
//     fetchUserData();
    
//     // Refresh when screen comes into focus
//     const unsubscribe = navigation.addListener('focus', () => {
//       fetchUserData();
//     });

//     return unsubscribe;
//   }, [navigation]);

//   const fetchUserData = async () => {
//     try {
//       setLoading(true);
//       const userId = await AsyncStorage.getItem('userId');
//       const token = await AsyncStorage.getItem('userToken');
      
//       if (!userId || !token) {
//         navigation.reset({
//           index: 0,
//           routes: [{ name: 'Login' }],
//         });
//         return;
//       }
      
//       setUserToken(token);
      
//       // Get user profile
//       const userResponse = await fetch(`${API_URL}/api/users/profile`, {
//         method: 'GET',
//         headers: { 
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
      
//       if (!userResponse.ok) {
//         const errorData = await userResponse.json();
//         throw new Error(errorData.message || 'Failed to fetch user data');
//       }
      
//       const userData = await userResponse.json();
//       setUser(userData);
      
//       // Get user campaigns
//       const campaignsResponse = await fetch(`${API_URL}/api/users/campaigns`, {
//         method: 'GET',
//         headers: { 
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       if (!campaignsResponse.ok) {
//         const errorData = await campaignsResponse.json();
//         throw new Error(errorData.message || 'Failed to fetch campaigns');
//       }
      
//       const campaignsData = await campaignsResponse.json();
//       setCampaigns(campaignsData);
      
//       // Set current campaign to the first one or null if none
//       if (campaignsData && campaignsData.length > 0) {
//         setCurrentCampaign(campaignsData[0]);
//         setStampCount(campaignsData[0].stampCount || 0);
//       } else {
//         setCurrentCampaign(null);
//         setStampCount(0);
//       }
      
//       setLoading(false);
//     } catch (error) {
//       setLoading(false);
//       console.error('Error fetching data:', error);
      
//       // Handle unauthorized error
//       if (error.message.includes('401') || error.message.includes('Authentication')) {
//         // Token expired or invalid
//         await AsyncStorage.removeItem('userToken');
//         await AsyncStorage.removeItem('userId');
//         Alert.alert('Session Expired', 'Please login again');
//         navigation.reset({
//           index: 0,
//           routes: [{ name: 'Login' }],
//         });
//       } else {
//         Alert.alert('Error', 'Failed to load data. Please try again.');
//       }
//     }
//   };

//   const handleLogout = async () => {
//     await AsyncStorage.removeItem('userToken');
//     await AsyncStorage.removeItem('userId');
//     navigation.reset({
//       index: 0,
//       routes: [{ name: 'Login' }],
//     });
//   };

//   const checkReward = () => {
//     if (!currentCampaign) {
//       Alert.alert('No Active Campaign', 'You don\'t have any active stamp campaigns.');
//       return;
//     }
    
//     const { campaign, stampCount } = currentCampaign;
//     const stampGoal = campaign.stampGoal || 5;
    
//     if (stampCount >= stampGoal) {
//       Alert.alert(
//         'Free Reward Available!', 
//         `You have earned: ${campaign.reward}! Show this to the staff.`,
//         [
//           { 
//             text: 'Redeem Now', 
//             onPress: () => navigation.navigate('Redeem', { campaignId: campaign._id }) 
//           },
//           { text: 'Later' }
//         ]
//       );
//     } else {
//       Alert.alert(
//         'Keep Collecting!', 
//         `You have ${stampCount} stamps. Collect ${stampGoal - stampCount} more for ${campaign.reward}!`,
//         [{ text: 'OK' }]
//       );
//     }
//   };

//   const switchCampaign = (index) => {
//     if (campaigns && campaigns[index]) {
//       setCurrentCampaign(campaigns[index]);
//       setStampCount(campaigns[index].stampCount || 0);
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#5D4037" />
//         <Text style={styles.loadingText}>Loading...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Café Rewards</Text>
//         <TouchableOpacity onPress={handleLogout}>
//           <Text style={styles.logoutText}>Logout</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.content}>
//         <Text style={styles.greeting}>Hello, {user?.name || 'Café Lover'}!</Text>
        
//         <View style={styles.cardContainer}>
//           <View style={styles.qrContainer}>
//             <Text style={styles.qrTitle}>Your Loyalty Code</Text>
//             <View style={styles.qrWrapper}>
//               {userToken ? (
//                 <QRCode
//                   value={userToken}
//                   size={200}
//                   color="#5D4037"
//                   backgroundColor="white"
//                 />
//               ) : (
//                 <Text>Loading QR Code...</Text>
//               )}
//             </View>
//             <Text style={styles.qrInstructions}>
//               Show this code to earn stamps with each purchase
//             </Text>
//           </View>
          
//           <View style={styles.stampContainer}>
//             <Text style={styles.stampTitle}>
//               {currentCampaign ? 
//                 `${currentCampaign.campaign.business.name} - ${currentCampaign.campaign.name}` : 
//                 'No Active Campaign'}
//             </Text>
            
//             {currentCampaign && (
//               <>
//                 <Text style={styles.stampCount}>
//                   {stampCount}/{currentCampaign.campaign.stampGoal || 5}
//                 </Text>
                
//                 <TouchableOpacity 
//                   style={styles.checkButton}
//                   onPress={checkReward}
//                 >
//                   <Text style={styles.checkButtonText}>Check Reward</Text>
//                 </TouchableOpacity>
                
//                 {campaigns.length > 1 && (
//                   <View style={styles.campaignSwitcher}>
//                     {campaigns.map((campaign, index) => (
//                       <TouchableOpacity
//                         key={campaign.campaign._id}
//                         style={[
//                           styles.campaignDot,
//                           currentCampaign?.campaign._id === campaign.campaign._id && 
//                             styles.activeCampaignDot
//                         ]}
//                         onPress={() => switchCampaign(index)}
//                       />
//                     ))}
//                   </View>
//                 )}
//               </>
//             )}
            
//             {!currentCampaign && (
//               <Text style={styles.noCampaignText}>
//                 Visit a participating business to start earning rewards!
//               </Text>
//             )}
//           </View>
//         </View>

//         <View style={styles.buttonContainer}>
//           <TouchableOpacity 
//             style={styles.navButton}
//             onPress={() => navigation.navigate('LoyaltyStatus')}
//           >
//             <Text style={styles.navButtonText}>View Stamps</Text>
//           </TouchableOpacity>
          
//           <TouchableOpacity 
//             style={styles.navButton}
//             onPress={() => navigation.navigate('History')}
//           >
//             <Text style={styles.navButtonText}>History</Text>
//           </TouchableOpacity>
          
//           <TouchableOpacity 
//             style={styles.navButton}
//             onPress={() => navigation.navigate('Promotions')}
//           >
//             <Text style={styles.navButtonText}>Promotions</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F5F5F5',
//   },
//   loadingText: {
//     marginTop: 10,
//     color: '#5D4037',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 15,
//     backgroundColor: '#5D4037',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   logoutText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//   },
//   greeting: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//   },
//   cardContainer: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     marginBottom: 20,
//   },
//   qrContainer: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   qrTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     color: '#5D4037',
//   },
//   qrWrapper: {
//     padding: 15,
//     backgroundColor: 'white',
//     borderRadius: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   qrInstructions: {
//     textAlign: 'center',
//     marginTop: 15,
//     color: '#666',
//     fontSize: 14,
//   },
//   stampContainer: {
//     alignItems: 'center',
//     paddingTop: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   stampTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 10,
//     color: '#5D4037',
//     textAlign: 'center',
//   },
//   stampCount: {
//     fontSize: 36,
//     fontWeight: 'bold',
//     color: '#5D4037',
//     marginBottom: 15,
//   },
//   noCampaignText: {
//     textAlign: 'center',
//     color: '#666',
//     marginBottom: 15,
//     paddingHorizontal: 10,
//   },
//   checkButton: {
//     backgroundColor: '#8D6E63',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   checkButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   campaignSwitcher: {
//     flexDirection: 'row',
//     marginTop: 15,
//   },
//   campaignDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: '#DDD',
//     marginHorizontal: 5,
//   },
//   activeCampaignDot: {
//     backgroundColor: '#5D4037',
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   navButton: {
//     flex: 1,
//     backgroundColor: '#5D4037',
//     padding: 15,
//     borderRadius: 8,
//     marginHorizontal: 5,
//     alignItems: 'center',
//   },
//   navButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
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
  ScrollView, // For multiple cards if needed, or use FlatList
} from 'react-native';
import QRCode from 'react-native-qrcode-svg'; // Kept for now, value needs review
import AsyncStorage from '@react-native-async-storage/async-storage';

// Make sure this is your actual computer's IP on your local network
// when testing with Expo Go on a physical device.
const API_URL = 'http://192.168.1.163:5001'; // Ensure this is correct

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyCards, setLoyaltyCards] = useState([]); // To store multiple cards
  const [selectedCardIndex, setSelectedCardIndex] = useState(0); // To manage which card is "active" or focused

  // Centralized API call function (basic example)
  const apiRequest = useCallback(async (endpoint, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token && endpoint !== '/api/users/login' && endpoint !== '/api/users/register') { // Check if token is needed
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

    const response = await fetch(`${API_URL}${endpoint}`, config);
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }
    if (response.status === 204) return null; // No content
    return response.json();
  }, []);


  const fetchUserDataAndCards = useCallback(async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId'); // userId for QR code
      const token = await AsyncStorage.getItem('userToken');

      if (!storedUserId || !token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      // Get user profile
      const userData = await apiRequest('/api/users/profile');
      setUser(userData);

      // Get user's loyalty cards
      // IMPORTANT: This endpoint /api/users/me/loyalty-cards needs to be implemented on your backend
      const cardsData = await apiRequest('/api/users/me/loyalty-cards');
      setLoyaltyCards(cardsData || []); // Ensure it's an array

      if (cardsData && cardsData.length > 0) {
        setSelectedCardIndex(0);
      } else {
        setSelectedCardIndex(-1); // No card selected if none exist
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('unauthorized') || error.message.includes('token')) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        Alert.alert('Session Expired', 'Please login again.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        Alert.alert('Error', 'Failed to load data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation, apiRequest]);

  useEffect(() => {
    fetchUserDataAndCards();
    const unsubscribe = navigation.addListener('focus', fetchUserDataAndCards);
    return unsubscribe;
  }, [navigation, fetchUserDataAndCards]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setLoyaltyCards([]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleSelfStamp = async (card) => {
    if (!card || !user) return;

    if (card.currentUserStampCount >= card.campaign.stampGoal) {
      Alert.alert("Card Full!", "This card is already full. Check your reward.");
      return;
    }

    try {
      // IMPORTANT: This endpoint /api/users/me/stamps/self-add needs to be implemented
      const result = await apiRequest('/api/users/me/stamps/self-add', 'POST', {
        businessId: card.business._id,
        campaignId: card.campaign._id,
        // userId will be taken from req.user on backend
      });

      if (result && result.updatedCard) {
        // Update the specific card in the local state
        setLoyaltyCards(prevCards =>
          prevCards.map(c =>
            c.campaign._id === result.updatedCard.campaign._id && c.business._id === result.updatedCard.business._id
              ? result.updatedCard
              : c
          )
        );
        Alert.alert("Stamp Added!", `You now have ${result.updatedCard.currentUserStampCount} stamps for ${result.updatedCard.campaign.name}.`);
        // Optionally, re-check reward immediately
        checkReward(result.updatedCard);
      } else {
          Alert.alert('Stamp Added', 'Your stamp has been recorded!');
          fetchUserDataAndCards(); // Re-fetch to be sure
      }

    } catch (error) {
      console.error('Error self-stamping:', error);
      Alert.alert('Error', `Could not add stamp: ${error.message}`);
    }
  };

  const checkReward = (cardToCheck) => {
    const card = cardToCheck || (loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null);

    if (!card) {
      Alert.alert('No Active Card', 'Select a card or join a campaign.');
      return;
    }

    const { campaign, currentUserStampCount } = card;
    const stampGoal = campaign.stampGoal;

    if (currentUserStampCount >= stampGoal) {
      Alert.alert(
        'Reward Earned!',
        `You've earned: ${campaign.reward}! Show this to the staff to redeem.`,
        [
          { text: 'OK' }
          // For MVP, direct redemption by user is out of scope.
          // Merchant will verify and use their system to mark as redeemed via API.
        ]
      );
    } else {
      Alert.alert(
        'Keep Stamping!',
        `You have ${currentUserStampCount} of ${stampGoal} stamps for ${campaign.reward}.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Simple card switcher if you want to focus on one card at a time
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
              Visit participating businesses and scan their QR code or ask them to add you to their campaign.
            </Text>
            {/* <TouchableOpacity style={styles.discoverButton} onPress={() => navigation.navigate('DiscoverBusinesses')}>
                <Text style={styles.discoverButtonText}>Find Businesses</Text>
            </TouchableOpacity> */}
          </View>
        )}

        {/* Displaying only the selected card for simplicity, or you can map all cards */}
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
                key={currentDisplayCard.campaign._id}
                style={styles.loyaltyCard}
                onPress={() => handleSelfStamp(currentDisplayCard)} // Press card to stamp
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
              <Text style={styles.pressToStampText}>(Press card to add a stamp)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRewardButton}
              onPress={() => checkReward(currentDisplayCard)}
            >
              <Text style={styles.checkRewardButtonText}>Check My Reward Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Code Section - Kept for future merchant scanning, value changed to userId */}
        {user && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Your Member ID</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={user._id || 'no-user-id'} // Use actual user ID
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

        {/* Navigation Buttons - Keep for future expansion */}
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('DiscoverBusinesses')}>
            <Text style={styles.navButtonText}>Find Businesses</Text>
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Lighter background
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
    backgroundColor: '#6A1B9A', // A distinct primary color
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
    flexGrow: 1, // Allows content to scroll
    padding: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
  },
  discoverButton: {
    backgroundColor: '#7E57C2', // Accent color
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
    alignItems: 'center', // Center content within the card
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
    color: '#4CAF50', // Green for reward
    fontWeight: '500',
    marginBottom: 20,
  },
  stampDotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow dots to wrap if many
    justifyContent: 'center',
    marginBottom: 10,
  },
  stampDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0', // Empty dot color
    margin: 4,
  },
  stampDotFilled: {
    backgroundColor: '#7E57C2', // Filled dot color (accent)
  },
  pressToStampText: {
      marginTop: 10,
      fontSize: 13,
      fontStyle: 'italic',
      color: '#888'
  },
  checkRewardButton: {
    backgroundColor: '#7E57C2', // Accent color
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
    padding: 10, // Smaller padding if QR size is smaller
    backgroundColor: 'white', // Ensure background for QR is white if needed
    borderRadius: 8,
    marginBottom: 10,
    // No shadow needed if it's inside an already shadowed card
  },
  qrInstructions: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space around for fewer buttons
    marginTop: 10,
  },
  navButton: {
    backgroundColor: '#6A1B9A', // Primary color
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120, // Ensure buttons have some width
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default HomeScreen;