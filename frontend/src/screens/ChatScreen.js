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
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatService, socketService } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef();
  const socketConnected = useRef(false);

  useEffect(() => {
    // Get the current user ID
    const getUserId = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const userId = user.id || user._id;
          setCurrentUserId(userId);
          console.log('Current user ID in ChatScreen:', userId);
          return userId;
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
      return null;
    };
    
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

        // Fetch messages and set state
        setMessages(chatResponse.messages || []);
      } catch (error) {
        console.error('Error loading chat data:', error);
        Alert.alert('Error', 'Failed to load chat. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Initialize socket and load chat data
    const initializeChat = async () => {
      const userId = await getUserId();
      
      // Load chat data first
      await loadChatData();
      
      // Then set up socket connection
      try {
        // Make sure socket is connected and joined to the chat room
        console.log('Setting up socket for chat:', chatId);
        await socketService.connect();
        
        const joined = await socketService.joinChat(chatId);
        socketConnected.current = joined;
        
        if (!joined) {
          console.warn('Failed to join chat room, will retry in background');
          // Try again after a delay
          setTimeout(async () => {
            const retryJoin = await socketService.joinChat(chatId);
            socketConnected.current = retryJoin;
            console.log('Retry join chat result:', retryJoin);
          }, 2000);
        }
        
        // Set up message listener
        socketService.onReceiveMessage(handleNewMessage);
      } catch (error) {
        console.error('Error setting up socket:', error);
      }
    };
    
    initializeChat();

    return () => {
      // Clean up socket listeners but don't disconnect
      socketService.offReceiveMessage();
    };
  }, [chatId, navigation]);

  const handleNewMessage = (newMessage) => {
    console.log('Received message in ChatScreen:', newMessage);
    
    if (newMessage && newMessage.chatId === chatId) {
      // Format the message to match our UI expectations
      const formattedMessage = {
        _id: newMessage._id || `temp-${Date.now()}`,
        content: newMessage.content,
        sender: {
          // In socket messages from other users, isCurrentUser will be false
          isCurrentUser: false
        },
        createdAt: newMessage.createdAt || new Date().toISOString(),
      };
      
      setMessages(prevMessages => {
        // Check if message already exists (avoid duplicates)
        const messageExists = prevMessages.some(msg => 
          msg._id === formattedMessage._id || 
          (msg.content === formattedMessage.content && 
           Math.abs(new Date(msg.createdAt) - new Date(formattedMessage.createdAt)) < 1000)
        );
        
        if (messageExists) return prevMessages;
        
        const newMessages = [...prevMessages, formattedMessage];
        
        // Scroll to bottom on next render
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        return newMessages;
      });
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    try {
      const trimmedMessage = inputText.trim();
      setInputText('');
      setIsSending(true);
      
      // Optimistically add the message to the UI
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content: trimmedMessage,
        sender: { isCurrentUser: true }, // This message is from the current user
        createdAt: new Date().toISOString(),
        pending: true,
      };
      
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Send message to server
      const response = await chatService.sendMessage(chatId, trimmedMessage);
      
      if (!response || !response.success) {
        throw new Error('Failed to send message');
      }
      
      // Replace the temporary message with the confirmed one from the server
      const confirmedMessage = {
        ...response.message,
        sender: { 
          ...response.message.sender,
          isCurrentUser: true // Make sure this message is marked as from the current user
        },
        pending: false
      };
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === tempMessage._id ? confirmedMessage : msg
        )
      );
      
      // Emit the message through socket for real-time delivery
      console.log('Sending message via socket:', confirmedMessage);
      
      // If socket isn't connected yet, try to connect again
      if (!socketConnected.current) {
        console.log('Socket not connected, attempting to connect and join chat');
        await socketService.connect();
        socketConnected.current = await socketService.joinChat(chatId);
      }
      
      // Make sure to include current user ID and chat ID in the message
      await socketService.sendMessage({
        ...response.message,
        chatId,
        senderId: currentUserId,
        sender: {
          ...response.message.sender,
          isCurrentUser: true // This is important for the sender
        }
      });
      
      // Scroll to bottom on next render
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark the message as failed
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.pending ? { ...msg, failed: true } : msg
        )
      );
      
      Alert.alert(
        'Message Failed', 
        'Unable to send your message. Please check your connection and try again.'
      );
      
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    // Get the message alignment based on who sent it
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
            item.failed && styles.failedMessage,
          ]}
        >
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
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
      <StatusBar barStyle="dark-content" />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxHeight={80}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              !inputText.trim() || isSending ? styles.disabledButton : {}
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
          >
            <Ionicons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 10,
    padding: 5,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '75%',
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
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#333333',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  failedMessage: {
    backgroundColor: '#FFDDDD',
    borderColor: '#FFAAAA',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  currentUserTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherUserTime: {
    color: '#999999',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12, 
    paddingRight: 40,
    fontSize: 16,
    maxHeight: 80,
    marginRight: 10,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  }
});

export default ChatScreen;