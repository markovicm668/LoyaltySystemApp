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
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";

const { width: screenWidth } = Dimensions.get('window');
const SPACING = 10;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 500;
const CARD_ITEM_WIDTH = CARD_WIDTH + SPACING * 2;

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef();

  const apiRequest = useCallback(async (path, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error((await res.json()).message || res.statusText);
    return res.status === 204 ? null : res.json();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await apiRequest('/users/profile');
      setUser(profile);
      const cards = await apiRequest('/users/me/loyalty-cards');
      setLoyaltyCards(cards || []);
      
      setSelectedCardIndex(0);
      scrollX.setValue(0);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, scrollX]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, fetchData]);

  useEffect(() => {
    if (flatListRef.current && loyaltyCards.length > 0) {
      flatListRef.current.scrollToOffset({
        offset: selectedCardIndex * CARD_ITEM_WIDTH,
        animated: true,
      });
    }
  }, [selectedCardIndex]);

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * CARD_ITEM_WIDTH,
      index * CARD_ITEM_WIDTH,
      (index + 1) * CARD_ITEM_WIDTH,
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const nameParts = item.business.name.split(' ');
    const firstPart = nameParts[0] || '';
    const secondPart = nameParts.slice(1).join(' ') || '';

    return (
      <View style={{ width: CARD_ITEM_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <View style={styles.cardHeader}>
            <View style={styles.logoArea}>
              <Text style={styles.logoImage}>☕️</Text>
              <View style={styles.separatorLine} />
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoTextTop} numberOfLines={1}>{firstPart.toUpperCase()}</Text>
                {secondPart ? <Text style={styles.logoTextBottom} numberOfLines={1}>{secondPart.toUpperCase()}</Text> : null}
              </View>
            </View>
            <TouchableOpacity style={styles.infoButton}>
              <Text style={styles.infoButtonText}>i</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.promoText}>
            {`Buy ${item.campaign.stampGoal} coffees, get one free!`}
          </Text>

          {item.campaign.stampGoal <= 9 ? (
            <View style={styles.stampsContainer}>
              {[...Array(item.campaign.stampGoal)].map((_, i) => {
                const filled = i < item.currentUserStampCount;
                const isLastStamp = i === item.campaign.stampGoal - 1;
                return (
                  <View
                    key={i}
                    style={[
                      styles.stampBox,
                      filled ? styles.stampBoxFilled : styles.stampBoxEmpty,
                    ]}>
                    {isLastStamp ? (
                      <Text style={styles.freeStampText}>FREE</Text>
                    ) : (
                      filled && <Text style={styles.stampIcon}>✔️</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.largeStampDisplay}>
              <Text style={styles.largeStampCount}>
                {item.currentUserStampCount}/{item.campaign.stampGoal}
              </Text>
              <Text style={styles.largeStampLabel}>Stamps Collected</Text>
            </View>
          )}

          <Text style={styles.rewardIcon}>🥤</Text>
        </Animated.View>
      </View>
    );
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
      {!loyaltyCards.length ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No Loyalty Cards Yet!</Text>
          <TouchableOpacity
            style={styles.discoverButtonLarge}
            onPress={() => navigation.navigate('DiscoverCampaigns')}>
            <Text style={styles.discoverButtonLargeText}>Find & Join Programs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Animated.FlatList
            ref={flatListRef}
            data={loyaltyCards}
            keyExtractor={item => item.campaign._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={styles.flatlistContentContainer}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            renderItem={renderItem}
            onMomentumScrollEnd={ev => {
              const idx = Math.round(ev.nativeEvent.contentOffset.x / CARD_ITEM_WIDTH);
              setSelectedCardIndex(idx);
            }}
          />

          <View style={styles.pagination}>
            {loyaltyCards.map((_, i) => {
              const inputRange = [
                (i - 1) * CARD_ITEM_WIDTH,
                i * CARD_ITEM_WIDTH,
                (i + 1) * CARD_ITEM_WIDTH,
              ];
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              const dotScale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1.2, 0.8],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]}
                />
              );
            })}
          </View>
        </>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('DiscoverCampaigns')}>
          <Text style={styles.navButtonText}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('QRScanner')}>
          <Text style={styles.navButtonText}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={async () => {
          await AsyncStorage.clear();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}>
          <Text style={styles.navButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#4A4A4A' },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyStateText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  discoverButtonLarge: { backgroundColor: '#7E57C2', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 30 },
  discoverButtonLargeText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  flatlistContentContainer: {
    paddingHorizontal: (screenWidth - CARD_ITEM_WIDTH) / 2,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5,
    marginVertical: 20,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  logoImage: {
    fontSize: 48,
    marginRight: 12,
  },
  separatorLine: {
    width: 2,
    height: 48,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  logoTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  logoTextTop: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4A4A4A',
    letterSpacing: 1.2,
  },
  logoTextBottom: {
    fontSize: 18,
    fontWeight: '400',
    color: '#555',
    letterSpacing: 1.2,
  },
  logoTextEst: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B0B0B0',
    marginTop: 3,
  },
  infoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4A4A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  promoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  stampsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    maxWidth: 270,
  },
  stampBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampBoxEmpty: {
    backgroundColor: '#F7F7F7',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  stampBoxFilled: {
    backgroundColor: 'rgba(126, 87, 194, 0.1)',
  },
  stampIcon: {
    fontSize: 32,
  },
  freeStampText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7E57C2',
    textTransform: 'uppercase',
  },
  rewardIcon: {
    fontSize: 50,
    marginTop: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#595959',
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  navButton: {
    backgroundColor: '#7E57C2',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  largeStampDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  largeStampCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  largeStampLabel: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
});

export default HomeScreen;
