// screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// --- Configuration ---
// IMPORTANT: Replace with your actual backend URL
const API_URL = 'http://192.168.1.163:5001/api/users';
// Example: If backend runs locally on your machine and testing on Android emulator:
// const API_URL = 'http://10.0.2.2:5000/api/users';
// Example: If backend runs locally on your machine and testing on iOS simulator:
// const API_URL = 'http://localhost:5000/api/users';
// Example: If backend is deployed:
// const API_URL = 'https://your-deployed-backend.com/api/users';

// --- Component ---
const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Basic email validation regex
  // const validateEmail = (emailToValidate) => {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   return emailRegex.test(emailToValidate);
  // };

  const handleRegister = async () => {
    setError(null); // Clear previous errors

    // 1. Basic Client-side Validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    // if (!validateEmail(email)) {
    //     setError('Please enter a valid email address.');
    //     return;
    // }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // 2. Start Registration Process
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(), // Send lowercase email
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors from backend (like email already exists)
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      // 3. Handle Success
      setIsLoading(false);
      Alert.alert(
        'Registration Successful',
        'You can now log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }] // Navigate to Login screen
      );
       // Optionally clear fields after success
       setName('');
       setEmail('');
       setPassword('');

    } catch (err) {
      // 4. Handle Errors (Network or Backend Logic)
      setIsLoading(false);
      console.error("Registration failed:", err);
      // Display specific error from backend if available, otherwise generic message
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
    >
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create Account</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
            />
            <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email" // Use platform specific autocomplete suggestions
            />
            <TextInput
                style={styles.input}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry // Hides password input
                autoCapitalize="none"
            />

            {isLoading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            ) : (
                <Button title="Register" onPress={handleRegister} disabled={isLoading} />
            )}

             <View style={styles.loginLinkContainer}>
                 <Text>Already have an account? </Text>
                 <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                     Log In
                 </Text>
             </View>

        </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1, // Allows content to scroll if needed
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50, // Increased height for better touch target
    borderColor: '#cccccc', // Lighter gray border
    borderWidth: 1,
    marginBottom: 15, // Increased spacing
    paddingHorizontal: 15, // More horizontal padding
    borderRadius: 8, // Rounded corners
    backgroundColor: '#f8f8f8', // Slight background color
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15, // Add space below error message
    textAlign: 'center',
    fontSize: 14,
  },
  loader: {
      marginTop: 20,
  },
   loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginLink: {
    color: '#0000ff', // Blue color for link
    fontWeight: 'bold',
  },
});

export default RegisterScreen;