import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EmptyState = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="paw" size={40} color="#FF6B6B" />
    </View>
    <Text style={styles.emptyTitle}>No more pets</Text>
    <Text style={styles.emptyDescription}>
      Try adjusting your filters or check back later
    </Text>
    <TouchableOpacity
      style={styles.refreshButton}
      onPress={onRefresh}
    >
      <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;