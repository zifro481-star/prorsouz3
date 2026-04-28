import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import LinkifiedText from '@/components/LinkifiedText';

export default function EventDetailScreen() {
  const { title, content } = useLocalSearchParams<{ id: string; title: string; content: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Мероприятие',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title ?? ''}</Text>
        <LinkifiedText text={content ?? ''} style={styles.content} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 16,
    lineHeight: 30,
  },
  content: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
