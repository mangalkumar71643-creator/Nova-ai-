import React from 'react';
import { Image, StyleSheet } from 'react-native';

export default function Logo({ size }: { size: number }) {
  return (
    <Image
      source={require('../../assets/icon.png')}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.28 }]}
      accessibilityLabel="Nova AI"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    overflow: 'hidden',
  },
});
