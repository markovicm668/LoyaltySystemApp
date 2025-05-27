// screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Adjust API_BASE_URL to ensure it's correctly formed
const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";

// --- Component ---
const RegisterScreen = ({ navigation }) => {
  // Common State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Registration Type and Step
  const [registrationType, setRegistrationType] = useState('customer'); // 'customer' or 'business'

  // User fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Simplified Business fields
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [category, setCategory] = useState('Cafe'); // Default category
  const [stampsCount, setStampsCount] = useState('10'); // Default stamps count

  // Category dropdown
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const businessCategories = ['Cafe', 'Restaurant', 'Retail', 'Beauty', 'Health', 'Entertainment', 'Other'];

  // Function to handle actual user registration API call
  const registerUserApiCall = async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  };

  // Function to handle actual login API call (to get token)
  const loginUserApiCall = async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data; // Expects { _id, name, email, token }
  };

  // Function to handle actual business registration API call
  const registerBusinessApiCall = async (businessData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }
      
      // Make the request with explicit timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_BASE_URL}/businesses/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(businessData),
        signal: controller.signal
      });

    
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.log("Response is not valid JSON");
        data = { message: responseText || "Unknown server error" };
      }
      
      if (!response.ok) {
        // Create detailed error message
        const errorMsg = data.message || `Server error (${response.status})`;
        console.error(`Business registration failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      return data;
    } catch (error) {
      // Enhanced error logging
      if (error.name === 'AbortError') {
        console.error("Business registration request timed out");
        throw new Error("Request timed out. Please check your internet connection and try again.");
      }
      
      console.error("Business registration error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Re-throw the error with a more helpful message if possible
      throw error;
    }
  };

  const validateUserFields = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All user fields (Name, Email, Password) are required.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    // Add email validation if desired
    return true;
  };

  const validateBusinessFields = () => {
    if (!businessName.trim() || !category.trim() || !stampsCount.trim()) {
      setError('Store Name, Address, Category, and Stamps Count are required.');
      return false;
    }
    if (isNaN(parseInt(stampsCount)) || parseInt(stampsCount) <= 0) {
      setError('Stamps Count must be a positive number.');
      return false;
    }
    return true;
  };

  const handleCustomerRegistration = async () => {
    if (!validateUserFields()) return;

    setError(null);
    setIsLoading(true);
    try {
      await registerUserApiCall({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });
      setIsLoading(false);
      Alert.alert('Registration Successful', 'You can now log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
      setName(''); setEmail(''); setPassword(''); // Clear fields
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleBusinessRegistration = async () => {
    if (!validateUserFields() || !validateBusinessFields()) return;

    setError(null);
    setIsLoading(true);
    try {
      // 1. Register User
      const userData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      };
      await registerUserApiCall(userData);

      // 2. Login User to get token
      const loginData = await loginUserApiCall({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (!loginData || !loginData.token) {
        throw new Error('Login successful but no token received');
      }

      // Store token and user ID
      await AsyncStorage.setItem('userToken', loginData.token);
      if (loginData._id) {
        await AsyncStorage.setItem('userId', loginData._id);
      }

      // 3. Register Business with the token
      const businessData = {
        name: businessName.trim(),
        address: businessAddress.trim(),
        category,
        stampsRequired: parseInt(stampsCount),
      };

      const result = await registerBusinessApiCall(businessData);

      setIsLoading(false);
      Alert.alert('Registration Successful', `${businessName} has been registered successfully!`, [
        { text: 'OK', onPress: () => navigation.navigate('Login') }, // Or a merchant dashboard later
      ]);

      // Clear all fields
      setName(''); setEmail(''); setPassword('');
      setBusinessName(''); setBusinessAddress(''); setCategory('Cafe'); setStampsCount('10');
      setRegistrationType('customer'); // Reset type
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleSubmit = () => {
    if (registrationType === 'customer') {
      handleCustomerRegistration();
    } else { // business
      handleBusinessRegistration();
    }
  };


  const renderUserFields = () => (
    <>
      <TextInput
        style={styles.input}
        placeholder="Your Full Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Your Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min. 6 characters)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
    </>
  );

  const renderSimplifiedBusinessFields = () => (
    <>
      <Text style={styles.label}>Store Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., The Daily Grind"
        value={businessName}
        onChangeText={setBusinessName}
      />

      <Text style={styles.label}>Address *</Text>
      <TextInput
        style={styles.input}
        placeholder="Full address"
        value={businessAddress}
        onChangeText={setBusinessAddress}
      />

      <Text style={styles.label}>Category *</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowCategoryDropdown(true)}
      >
        <Text>{category}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Stamps on Loyalty Card *</Text>
      <TextInput
        style={styles.input}
        placeholder="Number of stamps needed for reward"
        value={stampsCount}
        onChangeText={setStampsCount}
        keyboardType="numeric"
      />

      {/* Category Dropdown Modal */}
      <Modal
        transparent={true}
        visible={showCategoryDropdown}
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.modalContent}>
            {businessCategories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={styles.modalItem}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={[styles.modalItemText, category === cat && styles.selectedCategory]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.containerInner}>
          <Text style={styles.title}>Create Account</Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, registrationType === 'customer' && styles.typeButtonActive]}
              onPress={() => { setRegistrationType('customer'); setError(null); }}
            >
              <Text style={[styles.typeButtonText, registrationType === 'customer' && styles.typeButtonTextActive]}>As a Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, registrationType === 'business' && styles.typeButtonActive]}
              onPress={() => { setRegistrationType('business'); setError(null); }}
            >
              <Text style={[styles.typeButtonText, registrationType === 'business' && styles.typeButtonTextActive]}>As a Business</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {registrationType === 'customer' && renderUserFields()}

          {registrationType === 'business' && (
            <>
              <Text style={styles.sectionTitle}>Business Registration</Text>
              {renderUserFields()}
              {renderSimplifiedBusinessFields()}
            </>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {registrationType === 'customer' ? 'Register as Customer' : 'Register Business'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => {
            setError(null);
            // setStep(1); // Reset step if navigating away
            navigation.navigate('Login');
          }}>
            <Text style={styles.loginLink}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  containerInner: {
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 25,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
    marginTop: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderColor: '#D1D1D1',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    fontSize: 16,
  },
  dropdownButton: {
    height: 48,
    borderColor: '#D1D1D1',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    maxHeight: '70%',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
  },
  selectedCategory: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  loginLink: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 16,
    padding: 5,
  },
});

export default RegisterScreen;