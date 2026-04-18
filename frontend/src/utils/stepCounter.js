import { Platform } from 'react-native';

/**
 * Step counter abstraction.
 * - Android: uses react-native-health-connect (Health Connect API)
 * - iOS: placeholder for Apple HealthKit (not yet implemented)
 *
 * Falls back gracefully — returns null if unavailable or denied.
 */

let healthConnectAvailable = null;

async function initAndroid() {
  try {
    const HC = require('react-native-health-connect');
    const available = await HC.getSdkStatus();
    // SDK_AVAILABLE = 3
    if (available === 3) {
      healthConnectAvailable = true;
      return true;
    }
    healthConnectAvailable = false;
    return false;
  } catch {
    healthConnectAvailable = false;
    return false;
  }
}

async function requestPermissionsAndroid() {
  try {
    const HC = require('react-native-health-connect');
    await HC.initialize();
    const granted = await HC.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);
    return granted && granted.length > 0;
  } catch {
    return false;
  }
}

async function getTodayStepsAndroid() {
  try {
    const HC = require('react-native-health-connect');
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const result = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (!result || !result.records || result.records.length === 0) return 0;
    return result.records.reduce((sum, r) => sum + (r.count || 0), 0);
  } catch {
    return null;
  }
}

// Public API

export async function isStepCountAvailable() {
  if (Platform.OS === 'android') {
    if (healthConnectAvailable === null) await initAndroid();
    return healthConnectAvailable;
  }
  // iOS HealthKit — not yet implemented
  return false;
}

export async function requestStepPermission() {
  if (Platform.OS === 'android') return requestPermissionsAndroid();
  return false;
}

export async function getTodaySteps() {
  if (Platform.OS === 'android') return getTodayStepsAndroid();
  return null;
}
