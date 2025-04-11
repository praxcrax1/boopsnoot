import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatService, socketService } from '../api/api';

const ChatScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    const loadChatData = async () => {
      try {
        // Fetch chat info
        const chatResponse = await chatService.getChatById(chatId);
        setChatInfo(chatResponse.chat);

        // Set the title to the other pet's name
        if (chatResponse.chat && chatResponse.chat.participants) {
          const otherPet = chatResponse.chat.participants.find(p => !p.isCurrentUser);
          if (otherPet && otherPet.pet) {
            navigation.setOptions({
              headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                  <Image
                    source={
                      otherPet.pet.photos && otherPet.pet.photos.length > 0
                        ? { uri: otherPet.pet.photos[0] }
                        : require('../assets/default-pet.png')
                    }
                    style={styles.headerAvatar}
                  />
                  <Text style={styles.headerTitle}>{otherPet.pet.name}</Text>
                </View>
              ),
            });
          }
        }

        // Fetch messages
        const messagesResponse = await chatService.getMessages(chatId);
        setMessages(messagesResponse.messages || []);
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Connect to socket for real-time messages
    const socket = socketService.connect();
    socketService.joinChat(chatId);
    
    socketService.onReceiveMessage((newMessage) => {
      if (newMessage.chatId === chatId) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    });

    loadChatData();

    // Set up navigation header
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });

    // Clean up socket connection
    return () => {
      socketService.disconnect();
    };
  }, [chatId, navigation]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const trimmedMessage = inputText.trim();
      setInputText('');
      
      // Optimistically add the message to the UI
      const tempMessage = {
        _id: Date.now().toString(),
        content: trimmedMessage,
        sender: { isCurrentUser: true },
        createdAt: new Date().toISOString(),
        pending: true,
      };
      
      setMessages((prevMessages) => [...prevMessages, tempMessage]);
      
      // Send message to server
      await chatService.sendMessage(chatId, trimmedMessage);
      
      // Socket will handle receiving the official message
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle error - maybe mark the message as failed
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.sender && item.sender.isCurrentUser;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
            item.pending && styles.pendingMessage,
          ]}
        >
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderPlaydateButton = () => {
    return (
      <TouchableOpacity style={styles.playdateButton}>
        <Ionicons name="calendar" size={20} color="#FFF" />
        <Text style={styles.playdateButtonText}>Invite for Playdate</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderPlaydateButton()}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={24} color="#FFF" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    minWidth: 80,
  },
  currentUserBubble: {
    backgroundColor: '#FF6B6B',
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  playdateButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
  },
  playdateButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 5,
  },
});

export default ChatScreen;