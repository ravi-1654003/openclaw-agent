import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';

const Section = ({ title, endpoint }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`http://localhost:4000/api/${endpoint}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ error: 'Cannot fetch. Is backend running?' }));
  }, [endpoint]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text selectable style={styles.json}>{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.header}>OpenClaw Dashboard</Text>
        <Section title="Agent" endpoint="agent" />
        <Section title="Channels" endpoint="channels" />
        <Section title="Skills" endpoint="skills" />
        <Section title="Cron Jobs" endpoint="crons" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 28, marginBottom: 16, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  title: { fontSize: 20, marginBottom: 4 },
  json: { fontFamily: 'monospace', fontSize: 12 },
});
