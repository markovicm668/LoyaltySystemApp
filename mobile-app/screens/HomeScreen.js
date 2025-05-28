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
const screenHeight = Dimensions.get('window').height;

const CARD_WIDTH_PERCENTAGE = 0.8;
const CARD_ITEM_WIDTH = screenWidth * CARD_WIDTH_PERCENTAGE;

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
    if (scrollViewRef.current && loyaltyCards.length > 0 && selectedCardIndex >= 0) {
      scrollViewRef.current.scrollTo({
        x: selectedCardIndex * CARD_ITEM_WIDTH,
        animated: true
      });
    }
  }, [selectedCardIndex, loyaltyCards.length]);

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

      const userData = await apiRequest('/users/profile');
      setUser(userData);

      const cardsData = await apiRequest('/users/me/loyalty-cards');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5D4037" />
        <Text style={styles.loadingText}>Loading your rewards...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

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
              snapToInterval={CARD_ITEM_WIDTH}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const newIndex = Math.round(offsetX / CARD_ITEM_WIDTH);
                const boundedIndex = Math.max(0, Math.min(newIndex, loyaltyCards.length - 1));
                setCurrentIndex(boundedIndex);
                setSelectedCardIndex(boundedIndex);
              }}
              scrollEventThrottle={16}
            >
              {loyaltyCards.map((card, index) => {
                const inputRange = [
                  (index - 1) * CARD_ITEM_WIDTH,
                  index * CARD_ITEM_WIDTH,
                  (index + 1) * CARD_ITEM_WIDTH
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
                      <View style={styles.logoSection}>
                        <View style={styles.logoCircle}>
                          <Text style={styles.logoText}>
                            {card.business.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* --- NEW CONDITIONAL STAMP DISPLAY --- */}
                      {card.campaign.stampGoal > 9 ? (
                        <View style={styles.largeStampDisplayContainer}>
                          <Text style={styles.largeStampDisplayText}>
                            {card.currentUserStampCount}/{card.campaign.stampGoal}
                          </Text>
                          <Text style={styles.largeStampDisplayLabel}>Stamps</Text>
                        </View>
                      ) : (
                        <View style={styles.stampsContainer}>
                          {[...Array(card.campaign.stampGoal)].map((_, i) => (
                            <View key={i} style={styles.stampWrapper}>
                              <View style={[
                                styles.stampBox,
                                i < card.currentUserStampCount ? styles.stampBoxFilled : styles.stampBoxEmpty
                              ]}>
                                <Text style={[
                                  styles.stampEmoji,
                                  i < card.currentUserStampCount ? styles.stampEmojiFilled : styles.stampEmojiEmpty
                                ]}>
                                  ☕
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Reward Section */}
                      <View style={styles.rewardSection}>
                        <Text style={styles.rewardText}>{card.campaign.reward}</Text>
                      </View>

                    </Animated.View>
                  </View>
                );
              })}
            </Animated.ScrollView>

            <View style={styles.pagination}>
              {loyaltyCards.map((_, index) => {
                const inputRange = [
                  (index - 1) * CARD_ITEM_WIDTH,
                  index * CARD_ITEM_WIDTH,
                  (index + 1) * CARD_ITEM_WIDTH
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
            style={styles.navButton} onPress={handleLogout}>
            <Text style={styles.navButtonText}>Logout</Text>
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
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10
  },
  carouselContent: {
    paddingHorizontal: screenWidth * 0.05,
    alignItems: 'center',
  },
  cardSlide: {
    width: CARD_ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  loyaltyCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    width: '100%',
    height: screenHeight * 0.6,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 0,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  campaignTitle: {
    fontSize: screenWidth < 350 ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  stampsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    flexGrow: 0.1,
    paddingHorizontal: 10,
  },
  stampWrapper: {
    margin: screenWidth < 350 ? 6 : 8,
  },
  stampBox: {
    width: screenWidth < 350 ? 50 : 60,
    height: screenWidth < 350 ? 50 : 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampBoxEmpty: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  stampBoxFilled: {
    backgroundColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stampEmoji: {
    fontSize: screenWidth < 350 ? 20 : 24,
  },
  stampEmojiEmpty: {
    color: '#D0D0D0',
  },
  stampEmojiFilled: {
    color: 'white',
  },
  rewardSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  rewardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  rewardText: {
    fontSize: screenWidth < 350 ? 14 : 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#5D4037',
    marginHorizontal: 4,
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
    fontSize: 13,
    textAlign: 'center',
  },
  largeStampDisplayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  largeStampDisplayText: {
    fontSize: screenWidth < 350 ? 40 : 56,
    fontWeight: 'bold',
    color: '#6A1B9A',
    textAlign: 'center',
  },
  largeStampDisplayLabel: {
    fontSize: screenWidth < 350 ? 14 : 16,
    color: '#555555',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;