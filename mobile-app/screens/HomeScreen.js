// HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";
const screenWidth = Dimensions.get('window').width;

const HomeScreen = ({ navigation }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(selectedCardIndex);
  }, [selectedCardIndex]);

  useEffect(() => {
    const focusListener = navigation.addListener('focus', () => {
      fetchUserDataAndCards();
    });
    return focusListener;
  }, [navigation, fetchUserDataAndCards]);

  useEffect(() => {
    if (scrollViewRef.current && loyaltyCards.length > 0) {
      const cardWidth = screenWidth * 0.8;
      scrollViewRef.current.scrollTo({
        x: selectedCardIndex * cardWidth,
        animated: true
      });
    }
  }, [selectedCardIndex, screenWidth]);

  const apiRequest = useCallback(async (fullEndpointPath, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token && !fullEndpointPath.includes("/login") && !fullEndpointPath.includes("/register") && !fullEndpointPath.includes("/campaigns/active")) {
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

    const response = await fetch(`${API_BASE_URL}${fullEndpointPath}`, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (error) {
        errorData = { message: response.statusText || `HTTP Error ${response.status}` };
      }
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setLoyaltyCards([]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // const checkReward = (cardToCheck) => {
  //   const card = cardToCheck || (loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null);

  //   if (!card) {
  //     Alert.alert('No Active Card', 'Select a card or join a campaign.'); // User might not have card yet
  //     return;
  //   }

  //   const { campaign, currentUserStampCount } = card;
  //   const stampGoal = campaign.stampGoal;

  //   if (currentUserStampCount >= stampGoal) {
  //     Alert.alert(
  //       'Reward Earned!',
  //       `You've earned: ${campaign.reward}! Show this to the staff to redeem.`,
  //       [{ text: 'OK' }]
  //     );
  //   } else {
  //     Alert.alert(
  //       'Keep Stamping!',
  //       `You have ${currentUserStampCount} of ${stampGoal} stamps for ${campaign.reward}.`,
  //       [{ text: 'OK' }]
  //     );
  //   }
  // };

  // const switchDisplayedCard = (direction) => {
  //   if (loyaltyCards.length === 0) return;
  //   let newIndex = selectedCardIndex + direction;
  //   if (newIndex < 0) newIndex = loyaltyCards.length - 1;
  //   if (newIndex >= loyaltyCards.length) newIndex = 0;
  //   setSelectedCardIndex(newIndex);
  // };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D4037" />
        <Text style={styles.loadingText}>Loading your rewards...</Text>
      </SafeAreaView>
    );
  }

  const currentDisplayCard = loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null;

  // const getStampLayout = (totalStamps) => {
  //   if (totalStamps <= 6) {
  //     return { columns: 3, stampWidth: '30%' };
  //   } else if (totalStamps <= 12) {
  //     return { columns: 4, stampWidth: '22%' };
  //   } else if (totalStamps <= 20) {
  //     return { columns: 5, stampWidth: '18%' };
  //   } else {
  //     return { columns: 6, stampWidth: '15%' };
  //   }
  // };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Loyalty Cards</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'}!</Text>

        {loyaltyCards.length === 0 && !loading && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No Loyalty Cards Yet!</Text>
            <Text style={styles.emptyStateSubText}>
              Ready to collect stamps and earn rewards?
            </Text>
            <TouchableOpacity
              style={styles.discoverButtonLarge}
              onPress={() => navigation.navigate('DiscoverCampaigns')}
            >
              <Text style={styles.discoverButtonLargeText}>Find & Join Programs</Text>
            </TouchableOpacity>
          </View>
        )}

        {loyaltyCards.length > 0 && (
          <View style={styles.carouselContainer}>
            <Animated.ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={screenWidth * 0.8}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false } // must be false if you're using `scrollX` for logic below
              )}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const cardWidth = screenWidth * 0.8;
                const newIndex = Math.round(offsetX / cardWidth);
                setCurrentIndex(newIndex);
                setSelectedCardIndex(newIndex);
              }}
              scrollEventThrottle={16}
            >

              {loyaltyCards.map((card, index) => {
                const inputRange = [
                  (index - 1) * screenWidth * 0.8,
                  index * screenWidth * 0.8,
                  (index + 1) * screenWidth * 0.8
                ];

                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.9, 1, 0.9],
                  extrapolate: 'clamp'
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp'
                });

                return (
                  <View key={card.campaign._id} style={styles.cardSlide}>
                    <Animated.View
                      style={[
                        styles.loyaltyCard,
                        {
                          transform: [{ scale }],
                          opacity,
                        }
                      ]}
                    >

                      <View style={styles.cardHeader}>
                        <Text style={styles.businessName}>{card.business.name}</Text>
                        <Text style={styles.campaignName}>{card.campaign.name}</Text>
                      </View>

                      {/* --- NEW CONDITIONAL STAMP DISPLAY AREA --- */}
                      {card.campaign.stampGoal > 9 ? (
                        <View style={styles.largeStampCountContainer}>
                          <Text style={styles.largeStampCountText}>
                            {card.currentUserStampCount} / {card.campaign.stampGoal}
                          </Text>
                          <Text style={styles.stampsLabelText}>Stamps Collected</Text>
                        </View>
                      ) : (
                        <View style={styles.stampsGridContainer}> {/* This View replaces the ScrollView */}
                          {[...Array(card.campaign.stampGoal)].map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.stampIconContainer, // Use new style name
                                i < card.currentUserStampCount
                                  ? styles.stampIconContainerFilled // Use new style name
                                  : {},
                              ]}
                            >
                              <View style={styles.stampIconPlaceholder}>
                                {i < card.currentUserStampCount && (
                                  <Text style={styles.stampIconText}>✓</Text>
                            )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        {card.campaign.stampGoal <= 9 && (
                          <Text style={styles.stampProgress}>
                            {card.currentUserStampCount} / {card.campaign.stampGoal} Stamps
                          </Text>
                        )}
                        <Text style={styles.rewardText}>Reward: {card.campaign.reward}</Text>
                      </View>

                    </Animated.View>
                  </View>
                );
              })}

            </Animated.ScrollView>

            <View style={styles.pagination}>
              {loyaltyCards.map((_, index) => {
                const inputRange = [
                  (index - 1) * screenWidth * 0.8,
                  index * screenWidth * 0.8,
                  (index + 1) * screenWidth * 0.8
                ];

                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp'
                });

                const dotScale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.8, 1.2, 0.8],
                  extrapolate: 'clamp'
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        opacity: dotOpacity,
                        transform: [{ scale: dotScale }]
                      }
                    ]}
                  />
                );
              })}
            </View>

          </View>

        )
        }

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('DiscoverCampaigns')}
          >
            <Text style={styles.navButtonText}>Discover Programs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Text style={styles.navButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>
        </View>

      </View >

    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
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
    flex: 1,
    padding: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginTop: 30,
    backgroundColor: '#FFFFFF',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
  },
  discoverButtonLarge: {
    backgroundColor: '#7E57C2',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30,
    elevation: 2,
  },
  discoverButtonLargeText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#5D4037',
    marginHorizontal: 4,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  carouselContent: {
    paddingHorizontal: screenWidth * 0.05,
    alignItems: 'center',
  },
  cardSlide: {
    width: screenWidth * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  cardHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  campaignName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  stampImageContainerFilled: {
    backgroundColor: '#7E57C2',
    borderColor: '#6A1B9A',
  },
  cardFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  stampProgress: {
    fontSize: 16, // Example: make it slightly smaller
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 10,
  },
  rewardText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  navButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  // stampsScrollContainer: {
  //   maxHeight: 200,
  //   width: '100%',
  //   marginVertical: 15,
  // },
  loyaltyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    alignSelf: 'center',
    width: '95%',
    maxHeight: 400,
  },


  // ADD THESE STYLES
  largeStampCountContainer: {
    marginVertical: 20, // Or adjust to fit your card's maxHeight
    alignItems: 'center',
    justifyContent: 'center', // Center the text block
    padding: 20,
    flex: 1, // Allow it to take available space if needed
  },
  largeStampCountText: {
    fontSize: 48, // Make it prominent
    fontWeight: 'bold',
    color: '#6A1B9A', // Your theme color
  },
  stampsLabelText: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  stampsGridContainer: {
    width: '100%', // Use full width of the card's content area
    paddingHorizontal: 10, // Optional padding inside the grid
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Center stamps if they don't fill a row
    alignItems: 'center',
    marginVertical: 15, // Space above and below the grid
    // Remove any maxHeight here to prevent internal scrolling
  },
  stampIconContainer: { // New style for individual stamp icons
    width: 60,         // Fixed width
    height: 60,        // Fixed height (maintains aspect ratio)
    margin: 5,           // Fixed margin around each stamp
    borderRadius: 12,    // Or your preferred border radius
    backgroundColor: '#F0F0F0', // Background for empty stamps
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0', // Border for empty stamps
  },
  stampIconContainerFilled: { // Style for filled stamps
    backgroundColor: '#7E57C2', // Your filled color
    borderColor: '#6A1B9A',   // Darker border for filled
  },
  stampIconPlaceholder: { // Inner view, if needed for complex stamp designs
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampIconText: { // Style for the checkmark or number inside a stamp
    color: 'white',
    fontSize: 28, // Adjust size of the checkmark
    fontWeight: 'bold',
  },
});
export default HomeScreen;
