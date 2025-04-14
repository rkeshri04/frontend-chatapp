import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../app/store/hooks';
import { exitSosMode } from '../app/store/slices/appStateSlice';

interface Note {
  id: string;
  title: string;
  content: string;
}

const DisguiseNotes = () => {
  const dispatch = useAppDispatch();
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', title: 'Shopping List', content: 'Milk, Bread, Eggs' },
    { id: '2', title: 'Meeting Notes', content: 'Discuss project timeline' },
  ]);
  const [searchText, setSearchText] = useState('');
  const [exitSequence, setExitSequence] = useState('');

  const handleSearchChange = (text: string) => {
    setSearchText(text);

    // Check for exit sequence (e.g., typing "exitnow")
    const lowerText = text.toLowerCase();
    if (lowerText.endsWith('exitnow')) {
      Alert.alert(
        "Exit SOS Mode?",
        "Are you sure you want to return to the normal application?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setSearchText('') },
          {
            text: "Exit",
            style: "default",
            onPress: () => {
              dispatch(exitSosMode());
            },
          },
        ]
      );
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity style={styles.noteItem}>
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteContent} numberOfLines={1}>{item.content}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        {/* Fake Add Button */}
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={30} color="#FF9500" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Notes"
          placeholderTextColor="#8E8E93"
          value={searchText}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Light background for notes
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFF4',
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 15,
  },
  noteItem: {
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 3,
  },
  noteContent: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default DisguiseNotes;
