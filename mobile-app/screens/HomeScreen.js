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

    const response = await fetch(`${API_BASE_URL}${fullEndpointPath}`, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (error) {
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setLoyaltyCards([]);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const checkReward = (cardToCheck) => {
    const card = cardToCheck || (loyaltyCards.length > 0 && selectedCardIndex !== -1 ? loyaltyCards[selectedCardIndex] : null);

    if (!card) {
      Alert.alert('No Active Card', 'Select a card or join a campaign.'); // User might not have card yet
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

  const getStampLayout = (totalStamps) => {
    if (totalStamps <= 6) {
      return { columns: 3, stampWidth: '30%' };
    } else if (totalStamps <= 12) {
      return { columns: 4, stampWidth: '22%' };
    } else if (totalStamps <= 20) {
      return { columns: 5, stampWidth: '18%' };
    } else {
      return { columns: 6, stampWidth: '15%' };
    }
  };

  const stampLayout = getStampLayout(currentDisplayCard.campaign.stampGoal);

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
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const cardWidth = screenWidth * 0.8;
                const newIndex = Math.round(offsetX / cardWidth);
                if (newIndex !== currentIndex) {
                  setCurrentIndex(newIndex);
                  setSelectedCardIndex(newIndex);
                }
              }}
              contentContainerStyle={styles.carouselContent}
              snapToInterval={screenWidth * 0.8}
              decelerationRate="fast"
              contentInsetAdjustmentBehavior="never"
            >
              {loyaltyCards.map((card, index) => (
                <View key={card.campaign._id} style={styles.cardSlide}>
                  <Animated.View
                    style={[
                      styles.loyaltyCard,
                      {
                        transform: [{
                          scale: currentIndex === index ? 1 : 0.9
                        }],
                        opacity: currentIndex === index ? 1 : 0.7
                      }
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.businessName}>{card.business.name}</Text>
                      <Text style={styles.campaignName}>{card.campaign.name}</Text>
                    </View>

                    <ScrollView
                      style={styles.stampsScrollContainer}
                      contentContainerStyle={[
                        styles.stampsContainer,
                        {
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start'
                        }
                      ]}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {[...Array(card.campaign.stampGoal)].map((_, i) => {
                        const stampLayout = getStampLayout(card.campaign.stampGoal);
                        return (
                          <View
                            key={i}
                            style={[
                              styles.stampImageContainer,
                              {
                                width: stampLayout.stampWidth,
                                marginBottom: 8,
                                marginHorizontal: '1%'
                              },
                              i < card.currentUserStampCount ? styles.stampImageContainerFilled : {},
                            ]}
                          >
                            <View style={styles.stampImagePlaceholder}>
                              {i < card.currentUserStampCount && (
                                <Text style={styles.stampImageText}>✓</Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.cardFooter}>
                      <Text style={styles.stampProgress}>
                        {card.currentUserStampCount} / {card.campaign.stampGoal}
                      </Text>
                      <Text style={styles.rewardText}>Reward: {card.campaign.reward}</Text>
                    </View>
                  </Animated.View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.paginationDots}>
              {loyaltyCards.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedCardIndex(index);
                    setCurrentIndex(index);
                  }}
                  style={[
                    styles.dot,
                    index === selectedCardIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

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

      </View>
    </SafeAreaView>
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
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#6A1B9A',
    width: 10,
    height: 10,
    borderRadius: 5,
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
    width: '95%',
    maxHeight: 400, // Fixed height to prevent overflow
    alignSelf: 'center',
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
  stampsContainer: {
    width: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  stampImageContainer: {
    width: '30%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  stampImageContainerFilled: {
    backgroundColor: '#7E57C2',
    borderColor: '#6A1B9A',
  },
  stampImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampImageText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  stampProgress: {
    fontSize: 20,
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
  stampsScrollContainer: {
    maxHeight: 200,
    width: '100%',
    marginVertical: 15,
  },
  stampsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  stampImageContainer: {
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
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
    marginBottom: 20,
    width: '90%',
    alignSelf: 'center',
  },
});
export default HomeScreen;
