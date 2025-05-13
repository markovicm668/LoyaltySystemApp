// screens/RegisterScreen.js
import React, { useState, useEffect } from 'react'; // Added useEffect for potential future use
import {
  View,
  Text,
  TextInput,
  TouchableOpacity, // Using TouchableOpacity for custom buttons
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Picker from '@react-native-picker/picker';

// Adjust API_BASE_URL to not include /api/users initially
const API_BASE_URL = Constants.expoConfig.extra.apiUrl + "/api";



// --- Component ---
const RegisterScreen = ({ navigation }) => {
  // Common State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Registration Type and Step
  const [registrationType, setRegistrationType] = useState('customer'); // 'customer' or 'business'
  const [step, setStep] = useState(1); // For business registration: 1 for user, 2 for business details

  // User fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Business fields
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Cafe'); // Default category
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState(''); // Added state for address
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  // Business hours could be more complex, for MVP perhaps a text field or skip

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
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error("Authentication token not found. Please log in.");
    }
    const response = await fetch(`${API_BASE_URL}/businesses/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(businessData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
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
    if (!businessName.trim() || !category.trim() || !addressStreet.trim() || !addressCity.trim() || !longitude.trim() || !latitude.trim()) {
      setError('Business Name, Category, Street, City, Longitude, and Latitude are required.');
      return false;
    }
    if (isNaN(parseFloat(longitude)) || isNaN(parseFloat(latitude))) {
        setError('Longitude and Latitude must be valid numbers.');
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

  const handleBusinessOwnerAccountRegistration = async () => {
    if (!validateUserFields()) return;

    setError(null);
    setIsLoading(true);
    try {
      // 1. Register User
      await registerUserApiCall({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      // 2. Login User to get token
      const loginData = await loginUserApiCall({
        email: email.trim().toLowerCase(),
        password: password,
      });
      await AsyncStorage.setItem('userToken', loginData.token);
      await AsyncStorage.setItem('userId', loginData._id); // Store userId if needed later

      setIsLoading(false);
      setStep(2); // Move to next step
      Alert.alert('Account Created!', 'Now, please provide your business details.');
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'User account creation failed. Please try again.');
    }
  };

  const handleBusinessDetailsSubmission = async () => {
    if (!validateBusinessFields()) return;

    setError(null);
    setIsLoading(true);
    const businessData = {
      name: businessName.trim(),
      category,
      address: {
        street: addressStreet.trim(),
        city: addressCity.trim(),
        state: addressState.trim(),
        zipCode: addressZip.trim(),
        country: addressCountry.trim(),
      },
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      contactInfo: { // Add these to state and form if needed
        phone: businessPhone.trim(),
        email: '', // Business email, different from owner's?
        website: businessWebsite.trim(),
      },
      description: businessDescription.trim(),
      // businessHours would be more complex, an array of objects.
    };

    try {
      const result = await registerBusinessApiCall(businessData);
      setIsLoading(false);
      Alert.alert('Business Registered!', `${result.name} is now registered.`, [
        { text: 'OK', onPress: () => navigation.navigate('Login') }, // Or a merchant dashboard later
      ]);
      // Clear all fields
      setName(''); setEmail(''); setPassword('');
      setBusinessName(''); setCategory('Cafe'); setAddressStreet(''); setAddressCity('');
      setAddressState(''); setAddressZip(''); setAddressCountry('');
      setLongitude(''); setLatitude(''); setBusinessPhone(''); setBusinessWebsite(''); setBusinessDescription('');
      setStep(1); // Reset step for next registration
      setRegistrationType('customer'); // Reset type
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Business registration failed. Please try again.');
    }
  };

  const handleSubmit = () => {
    if (registrationType === 'customer') {
      handleCustomerRegistration();
    } else { // business
      if (step === 1) {
        handleBusinessOwnerAccountRegistration();
      } else { // step === 2
        handleBusinessDetailsSubmission();
      }
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

  const renderBusinessFields = () => (
    <>
      <Text style={styles.label}>Business Name *</Text>
      <TextInput style={styles.input} placeholder="e.g., The Daily Grind" value={businessName} onChangeText={setBusinessName} />

      <Text style={styles.label}>Category *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          style={styles.picker}
          onValueChange={(itemValue) => setCategory(itemValue)}
        >
          {businessCategories.map(cat => <Picker.Item key={cat} label={cat} value={cat} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Address Street *</Text>
      <TextInput style={styles.input} placeholder="123 Main St" value={addressStreet} onChangeText={setAddressStreet} />
      <Text style={styles.label}>Address City *</Text>
      <TextInput style={styles.input} placeholder="Anytown" value={addressCity} onChangeText={setAddressCity} />
      <Text style={styles.label}>Address State/Province</Text>
      <TextInput style={styles.input} placeholder="CA" value={addressState} onChangeText={setAddressState} />
      <Text style={styles.label}>Address Zip/Postal Code</Text>
      <TextInput style={styles.input} placeholder="90210" value={addressZip} onChangeText={setAddressZip} />
      <Text style={styles.label}>Address Country</Text>
      <TextInput style={styles.input} placeholder="USA" value={addressCountry} onChangeText={setAddressCountry} />

      <Text style={styles.label}>Location Longitude * (e.g., -73.985)</Text>
      <TextInput style={styles.input} placeholder="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" />
      <Text style={styles.label}>Location Latitude * (e.g., 40.758)</Text>
      <TextInput style={styles.input} placeholder="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" />

      <Text style={styles.label}>Business Phone</Text>
      <TextInput style={styles.input} placeholder="(555) 123-4567" value={businessPhone} onChangeText={setBusinessPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Business Website</Text>
      <TextInput style={styles.input} placeholder="https://example.com" value={businessWebsite} onChangeText={setBusinessWebsite} keyboardType="url" />
      <Text style={styles.label}>Business Description</Text>
      <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your business" value={businessDescription} onChangeText={setBusinessDescription} multiline />
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
              onPress={() => { setRegistrationType('customer'); setStep(1); setError(null); }}
            >
              <Text style={[styles.typeButtonText, registrationType === 'customer' && styles.typeButtonTextActive]}>As a Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, registrationType === 'business' && styles.typeButtonActive]}
              onPress={() => { setRegistrationType('business'); setStep(1); setError(null); }}
            >
              <Text style={[styles.typeButtonText, registrationType === 'business' && styles.typeButtonTextActive]}>As a Business</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {registrationType === 'customer' && renderUserFields()}

          {registrationType === 'business' && step === 1 && (
            <>
              <Text style={styles.sectionTitle}>Step 1: Create Owner Account</Text>
              {renderUserFields()}
            </>
          )}
          {registrationType === 'business' && step === 2 && (
            <>
              <Text style={styles.sectionTitle}>Step 2: Business Details</Text>
              {renderBusinessFields()}
            </>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {registrationType === 'customer'
                  ? 'Register'
                  : step === 1
                  ? 'Next: Add Business Info'
                  : 'Register Business'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => {
            setError(null);
            setStep(1); // Reset step if navigating away
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
  containerInner: { // Renamed from container to avoid conflict
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
    borderRadius: 25, // Make it pill-shaped
    overflow: 'hidden', // Clip children to border radius
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center', // Center text
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15, // Slightly smaller
  },
  typeButtonTextActive: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginTop: 10, // Reduced margin
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 14, // Smaller label
    color: '#555',
    marginBottom: 3,
    marginTop: 8,
    fontWeight: '500',
  },
  input: {
    height: 48, // Slightly smaller
    borderColor: '#D1D1D1',
    borderWidth: 1,
    marginBottom: 12, // Reduced margin
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    fontSize: 16,
  },
  textArea: {
      height: 100,
      textAlignVertical: 'top', // For Android
      paddingTop: 10,
  },
  pickerContainer: { // Add a container for picker for consistent styling
    borderColor: '#D1D1D1',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  picker: {
    height: 48,
    // width: '100%', // Picker takes full width of container
    // Note: Picker styling is very platform-specific and might not respect all style props
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14, // Slightly smaller
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15, // Increased margin
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17, // Slightly smaller
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
  loginLink: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 25, // Increased margin
    fontSize: 16,
    padding: 5, // Make it easier to tap
  },
});

export default RegisterScreen;