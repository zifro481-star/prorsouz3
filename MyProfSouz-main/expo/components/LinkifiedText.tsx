import React from 'react';
import { Text, Linking, TextStyle, StyleProp } from 'react-native';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
}

export default function LinkifiedText({ text, style }: Props) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <Text
            key={i}
            style={{ color: '#3b82f6', textDecorationLine: 'underline' }}
            onPress={() => void Linking.openURL(part)}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}
