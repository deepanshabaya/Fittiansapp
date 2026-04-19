import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionManagementScreen from '../screens/SessionManagementScreen';
import PlanScreen from '../screens/PlanScreen';
import TrainerVerificationScreen from '../screens/TrainerVerificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AdminScreen from '../screens/AdminScreen';
import CreateUserScreen from '../screens/CreateUserScreen';
import TrainerCustomerMappingScreen from '../screens/TrainerCustomerMappingScreen';
import EditUserScreen from '../screens/EditUserScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ---------- Auth Context ----------
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ---------- Customer / Trainer Tabs ----------
function AppTabs() {
  const { role } = useAuth();
  const isTrainer = role === 'trainer';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffc803',
        tabBarInactiveTintColor: '#6b6360',
        tabBarStyle: { backgroundColor: '#1a1716', borderTopColor: '#332e2b', paddingBottom: 5, paddingTop: 5, minHeight: 60 },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Dashboard') iconName = 'home-outline';
          if (route.name === 'Sessions') iconName = 'time-outline';
          if (route.name === 'Plan') iconName = 'ribbon-outline';
          if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {!isTrainer && <Tab.Screen name="Sessions" component={SessionManagementScreen} />}
      {!isTrainer && <Tab.Screen name="Plan" component={PlanScreen} />}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ---------- Admin Stack (AdminScreen → CreateUser) ----------
function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminHome"
        component={AdminScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateUser"
        component={CreateUserScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrainerCustomerMapping"
        component={TrainerCustomerMappingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditUser"
        component={EditUserScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ---------- Auth Stack (Login → Register) ----------
function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Register' }}
      />
      <Stack.Screen
        name="TrainerVerification"
        component={TrainerVerificationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ---------- Root Navigator ----------
export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [trainerId, setTrainerId] = useState(null);
  const [isApproved, setIsApproved] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load persisted auth data on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('userRole');
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        if (savedRole) setRole(savedRole);

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          setRole(parsedUser.role);
          setCustomerId(parsedUser.customerId || null);
          setTrainerId(parsedUser.trainerId || null);

          const savedApproval = await AsyncStorage.getItem('isApproved');
          if (parsedUser.role === 'trainer' && savedApproval === 'false') {
            setIsApproved(false);
          }
        }
      } catch (error) {
        console.log('Error loading auth:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  // Login handler — called after successful API login
  const login = async (authPayload) => {
    const { user: userData, token: authToken, requiresApproval } = authPayload;

    setUser(userData);
    setRole(userData.role);
    setToken(authToken);
    setCustomerId(userData.customerId || null);
    setTrainerId(userData.trainerId || null);

    const approved = !(userData.role === 'trainer' && requiresApproval);
    setIsApproved(approved);

    try {
      await AsyncStorage.setItem('userRole', userData.role);
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('isApproved', String(approved));
    } catch (error) {
      console.log('Error saving auth:', error);
    }
  };

  // Logout handler
  const logout = async () => {
    setUser(null);
    setRole(null);
    setToken(null);
    setCustomerId(null);
    setTrainerId(null);
    setIsApproved(true);

    try {
      await AsyncStorage.multiRemove(['userRole', 'token', 'user', 'isApproved']);
    } catch (error) {
      console.log('Error clearing auth:', error);
    }
  };

  const value = {
    user,
    role,
    token,
    customerId,
    trainerId,
    isApproved,
    setRole,
    setIsApproved,
    login,
    logout,
    loading,
    setLoading,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1716' }}>
        <ActivityIndicator size="large" color="#ffc803" />
      </View>
    );
  }

  // ── Routing Decision ──────────────────────────────────
  // No user  → AuthNavigator (Login screen, auto-detects role)
  // Admin    → AdminNavigator
  // Trainer (not approved) → AuthNavigator (TrainerVerification)
  // Trainer / Customer → AppTabs

  let content;

  if (!user) {
    content = <AuthNavigator />;
  } else if (user.role === 'admin') {
    content = <AdminNavigator />;
  } else if (user.role === 'trainer' && !isApproved) {
    content = <AuthNavigator />;
  } else {
    content = <AppTabs />;
  }

  return (
    <AuthContext.Provider value={value}>
      {content}
    </AuthContext.Provider>
  );
}