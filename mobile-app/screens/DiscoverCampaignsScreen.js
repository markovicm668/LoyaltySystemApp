// screens/DiscoverCampaignsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";

const DiscoverCampaignsScreen = ({ navigation }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningCampaignId, setJoiningCampaignId] = useState(null); // To show loading on specific item

  // Re-using apiRequest logic (ideally this would be in a shared helper/service)
  const apiRequest = useCallback(async (fullEndpointPath, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('userToken');
    // For fetching active campaigns, a token might be required to know which ones the user hasn't joined yet (if backend filters)
    // Or it could be a public list and joining requires auth. Assuming auth for both for simplicity.
    if (!token && !fullEndpointPath.includes("/login") && !fullEndpointPath.includes("/register")) {
      Alert.alert("Authentication Error", "You need to be logged in to perform this action.");
      navigation.navigate('Login'); // Or handle appropriately
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
        // If response is not JSON, use statusText or a generic message
        errorData = { message: response.statusText || `HTTP Error ${response.status}` };
      }
      if (response.status === 401 || response.status === 403) { // Unauthorized or Forbidden
         throw new Error(errorData.message || 'Authentication error. Please log in again.');
      }
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return null; // No content
    return response.json();
  }, [navigation]);

  const fetchDiscoverableCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      // Backend endpoint: GET /api/campaigns/active
      // This endpoint should ideally return campaigns the user hasn't joined yet.
      const data = await apiRequest('/campaigns/active');
      setCampaigns(data || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      Alert.alert("Error Loading Programs", `Could not load loyalty programs: ${error.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchDiscoverableCampaigns();
    // Add focus listener to refresh if user navigates back
    const unsubscribe = navigation.addListener('focus', () => {
        fetchDiscoverableCampaigns();
    });
    return unsubscribe;
  }, [navigation, fetchDiscoverableCampaigns]);

  const handleJoinCampaign = async (campaignId, campaignName) => {
    if (joiningCampaignId) return; // Prevent multiple join requests

    setJoiningCampaignId(campaignId); // Set loading state for the specific campaign
    try {
      // Backend endpoint: POST /api/users/me/join-campaign
      // Body: { campaignId }
      await apiRequest('/users/me/join-campaign', 'POST', { campaignId });
      Alert.alert(
        "Joined Successfully!",
        `You've joined the "${campaignName}" program. It's now in your loyalty cards.`,
        [{ text: "OK", onPress: () => navigation.goBack() }] // Go back to HomeScreen
      );
      // HomeScreen's onFocus listener should refresh its data.
    } catch (error) {
      console.error("Failed to join campaign:", error);
      Alert.alert("Error Joining", error.message || "Could not join the campaign. You might already be a part of it or there was a server error.");
    } finally {
      setJoiningCampaignId(null); // Clear loading state
    }
  };

  const renderCampaignItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.campaignItem, joiningCampaignId === item._id && styles.campaignItemDisabled]}
      onPress={() => handleJoinCampaign(item._id, item.name)}
      disabled={!!joiningCampaignId} // Disable all buttons if one is being processed
    >
      <View>
        <Text style={styles.campaignName}>{item.name}</Text>
        <Text style={styles.businessName}>
          From: {item.business?.name || 'Unknown Business'}
        </Text>
        <Text style={styles.campaignDetails}>
          Goal: {item.stampGoal} stamps for "{item.reward}"
        </Text>
      </View>
      {joiningCampaignId === item._id && (
        <ActivityIndicator size="small" color="#6A1B9A" style={styles.itemLoader} />
      )}
    </TouchableOpacity>
  );

  if (loading && campaigns.length === 0) { // Show initial loading indicator
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6A1B9A" />
        <Text style={styles.loadingText}>Loading available programs...</Text>
      </SafeAreaView>
    );
  }

  if (!loading && campaigns.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>No new loyalty programs available to join right now.</Text>
        <Text style={styles.emptySubText}>Check back later for more!</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.actionButton}>
             <Text style={styles.actionButtonText}>Go Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Discover & Join Programs</Text>
      </View>
      <FlatList
        data={campaigns}
        renderItem={renderCampaignItem}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.listContentContainer}
        refreshing={loading} // Show refresh control if FlatList supports it and you implement onRefresh
        onRefresh={fetchDiscoverableCampaigns} // Added pull-to-refresh
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Light background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    backgroundColor: '#6A1B9A', // Theme color
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  listContentContainer: {
    padding: 15,
  },
  campaignItem: {
    backgroundColor: 'white',
    padding: 18,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    flexDirection: 'row', // For loader alignment
    justifyContent: 'space-between', // For loader alignment
    alignItems: 'center', // For loader alignment
  },
  campaignItemDisabled: {
    opacity: 0.7,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    color: '#6A1B9A',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    color: '#495057', // Darker grey
    marginBottom: 8,
  },
  campaignDetails: {
    fontSize: 14,
    color: '#6C757D', // Muted grey
  },
  itemLoader: {
    marginLeft: 10,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#343A40',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 15,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 25,
  },
  actionButton: {
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default DiscoverCampaignsScreen;