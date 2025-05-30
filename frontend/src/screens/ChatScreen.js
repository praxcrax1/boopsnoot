import React, { useState, useEffect, useRef, useContext } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ChatService from "../services/ChatService";
import SocketService from "../services/SocketService";
import MatchService from "../services/MatchService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import theme, { withOpacity } from "../styles/theme";
import MenuBottomSheet from "../components/MenuBottomSheet";
import { ChatNotificationContext } from "../contexts/ChatNotificationContext";

const ChatScreen = ({ route, navigation }) => {
    const { chatId } = route.params;
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [chatInfo, setChatInfo] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [otherPet, setOtherPet] = useState(null);
    const [currentPet, setCurrentPet] = useState(null);
    const flatListRef = useRef();
    const socketConnected = useRef(false);

    // Add reference to the ChatNotificationContext
    const { checkUnreadStatus } = useContext(ChatNotificationContext);

    useEffect(() => {
        const getUserId = async () => {
            try {
                const userData = await AsyncStorage.getItem("user");
                if (userData) {
                    const user = JSON.parse(userData);
                    const userId = user.id || user._id;
                    setCurrentUserId(userId);
                    console.log("Current user ID in ChatScreen:", userId);
                    return userId;
                }
            } catch (error) {
                console.error("Error getting user data:", error);
            }
            return null;
        };

        // Set this chat as active in SocketService
        SocketService.setActiveChatId(chatId);

        navigation.setOptions({
            headerShown: true,
            headerLeft: () => (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}>
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={theme.colors.textPrimary}
                    />
                </TouchableOpacity>
            ),
        });

        const loadChatData = async () => {
            try {
                const chatResponse = await ChatService.getChatById(chatId);
                setChatInfo(chatResponse.chat);

                if (chatResponse.chat && chatResponse.chat.participants) {
                    const foundCurrentPet = chatResponse.chat.participants.find(
                        (p) => p.isCurrentUser
                    );
                    const foundOtherPet = chatResponse.chat.participants.find(
                        (p) => !p.isCurrentUser
                    );

                    if (foundCurrentPet && foundCurrentPet.pet) {
                        setCurrentPet(foundCurrentPet.pet);
                    }

                    if (foundOtherPet && foundOtherPet.pet) {
                        setOtherPet(foundOtherPet.pet);
                        navigation.setOptions({
                            headerTitle: () => (
                                <TouchableOpacity
                                    onPress={() => {
                                        navigation.navigate("PetProfile", {
                                            petId: foundOtherPet.pet._id,
                                        });
                                    }}>
                                    <View style={styles.headerTitleContainer}>
                                        <Image
                                            source={
                                                foundOtherPet.pet.photos &&
                                                foundOtherPet.pet.photos
                                                    .length > 0
                                                    ? {
                                                          uri: foundOtherPet.pet
                                                              .photos[0],
                                                      }
                                                    : require("../assets/default-pet.png")
                                            }
                                            style={styles.headerAvatar}
                                        />
                                        <Text style={styles.headerTitle}>
                                            {foundOtherPet.pet.name}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ),
                            headerRight: () => (
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => setMenuVisible(true)}>
                                    <Ionicons
                                        name="ellipsis-horizontal"
                                        size={24}
                                        color={theme.colors.textPrimary}
                                    />
                                </TouchableOpacity>
                            ),
                        });
                    }
                }

                setMessages(chatResponse.messages || []);

                // Mark chat as read when opened
                markChatAsRead();

                // Scroll to bottom after loading messages with a slightly longer delay
                // to ensure layout is complete
                setTimeout(() => {
                    scrollToBottom(false);
                }, 300);
            } catch (error) {
                console.error("Error loading chat data:", error);
                Alert.alert("Error", "Failed to load chat. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        // Mark the chat as read in storage
        const markChatAsRead = async () => {
            try {
                // Mark as read in local storage
                const unreadData = await AsyncStorage.getItem("unreadChats");
                if (unreadData) {
                    const unreadChats = JSON.parse(unreadData);
                    if (unreadChats[chatId]) {
                        delete unreadChats[chatId];
                        await AsyncStorage.setItem(
                            "unreadChats",
                            JSON.stringify(unreadChats)
                        );

                        // Update global notification status if needed
                        if (Object.keys(unreadChats).length === 0) {
                            await AsyncStorage.setItem(
                                "hasUnreadChats",
                                JSON.stringify(false)
                            );
                        }

                        // Update the notification badge status
                        checkUnreadStatus();
                    }
                }
            } catch (error) {
                console.error("Error marking chat as read:", error);
            }
        };

        const initializeChat = async () => {
            const userId = await getUserId();
            await loadChatData();

            try {
                console.log("Setting up socket for chat:", chatId);
                await SocketService.connect();

                const joined = await SocketService.joinChat(chatId);
                socketConnected.current = joined;

                if (!joined) {
                    console.warn(
                        "Failed to join chat room, will retry in background"
                    );
                    setTimeout(async () => {
                        const retryJoin = await SocketService.joinChat(chatId);
                        socketConnected.current = retryJoin;
                        console.log("Retry join chat result:", retryJoin);
                    }, 2000);
                }

                SocketService.onReceiveMessage(handleNewMessage);
            } catch (error) {
                console.error("Error setting up socket:", error);
            }
        };

        initializeChat();

        return () => {
            SocketService.offReceiveMessage();
            SocketService.setActiveChatId(null);
        };
    }, [chatId, navigation, checkUnreadStatus]);

    // Helper function to scroll to bottom
    const scrollToBottom = (animated = true) => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated });
        }
    };

    const handleNewMessage = (newMessage) => {
        console.log("Received message in ChatScreen:", newMessage);

        if (newMessage && newMessage.chatId === chatId) {
            const formattedMessage = {
                _id: newMessage._id || `temp-${Date.now()}`,
                content: newMessage.content,
                sender: {
                    isCurrentUser: false,
                },
                createdAt: newMessage.createdAt || new Date().toISOString(),
            };

            setMessages((prevMessages) => {
                const messageExists = prevMessages.some(
                    (msg) =>
                        msg._id === formattedMessage._id ||
                        (msg.content === formattedMessage.content &&
                            Math.abs(
                                new Date(msg.createdAt) -
                                    new Date(formattedMessage.createdAt)
                            ) < 1000)
                );

                if (messageExists) return prevMessages;

                const newMessages = [...prevMessages, formattedMessage];

                // Scroll to bottom when receiving a new message
                setTimeout(() => scrollToBottom(), 100);

                return newMessages;
            });
        }
    };

    const handleUnmatch = () => {
        if (!currentPet || !otherPet) {
            Alert.alert("Error", "Unable to unmatch. Missing pet information.");
            return;
        }

        Alert.alert(
            "Unmatch",
            `Are you sure you want to unmatch ${otherPet.name}? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Unmatch",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await MatchService.unmatchPet(
                                currentPet._id,
                                otherPet._id
                            );

                            // Navigate back to chat list
                            setMenuVisible(false);
                            navigation.goBack();
                            Alert.alert(
                                "Success",
                                `You've unmatched with ${otherPet.name}.`
                            );
                        } catch (error) {
                            console.error("Error unmatching:", error);
                            Alert.alert(
                                "Error",
                                "Failed to unmatch. Please try again."
                            );
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isSending) return;

        try {
            const trimmedMessage = inputText.trim();
            setInputText("");
            setIsSending(true);

            const tempMessage = {
                _id: `temp-${Date.now()}`,
                content: trimmedMessage,
                sender: { isCurrentUser: true },
                createdAt: new Date().toISOString(),
                pending: true,
            };

            setMessages((prevMessages) => [...prevMessages, tempMessage]);

            // Scroll to bottom immediately after adding the message
            setTimeout(() => scrollToBottom(), 50);

            const response = await ChatService.sendMessage(
                chatId,
                trimmedMessage
            );

            if (!response || !response.success) {
                throw new Error("Failed to send message");
            }

            const confirmedMessage = {
                ...response.message,
                sender: {
                    ...response.message.sender,
                    isCurrentUser: true,
                },
                pending: false,
            };

            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg._id === tempMessage._id ? confirmedMessage : msg
                )
            );

            console.log("Sending message via socket:", confirmedMessage);

            if (!socketConnected.current) {
                console.log(
                    "Socket not connected, attempting to connect and join chat"
                );
                await SocketService.connect();
                socketConnected.current = await SocketService.joinChat(chatId);
            }

            await SocketService.sendMessage({
                ...response.message,
                chatId,
                senderId: currentUserId,
                sender: {
                    ...response.message.sender,
                    isCurrentUser: true,
                },
            });

            // Ensure we scroll to bottom after sending is complete
            setTimeout(() => scrollToBottom(), 200);
        } catch (error) {
            console.error("Error sending message:", error);

            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.pending ? { ...msg, failed: true } : msg
                )
            );

            Alert.alert(
                "Message Failed",
                "Unable to send your message. Please check your connection and try again."
            );
        } finally {
            setIsSending(false);
        }
    };

    // Function to format date for date separators
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if date is today
        if (date.toDateString() === today.toDateString()) {
            return "Today";
        }

        // Check if date is yesterday
        if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }

        // Otherwise return formatted date
        return date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    // Function to check if we need to show a date separator
    const shouldShowDateSeparator = (currentMsg, prevMsg) => {
        if (!prevMsg) return true; // Always show for first message

        const currentDate = new Date(currentMsg.createdAt).toDateString();
        const prevDate = new Date(prevMsg.createdAt).toDateString();

        return currentDate !== prevDate;
    };

    // Prepare data with date separators
    const prepareMessagesWithDateSeparators = () => {
        const result = [];

        messages.forEach((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;

            // Add date separator if needed
            if (shouldShowDateSeparator(message, prevMessage)) {
                result.push({
                    _id: `date-${message.createdAt}`,
                    type: "dateSeparator",
                    date: formatDate(message.createdAt),
                });
            }

            // Add the actual message
            result.push({
                ...message,
                type: "message",
            });
        });

        return result;
    };

    const renderItem = ({ item, index }) => {
        // Render date separator
        if (item.type === "dateSeparator") {
            return (
                <View style={styles.dateSeparatorContainer}>
                    <View style={styles.dateSeparatorLine} />
                    <Text style={styles.dateSeparatorText}>{item.date}</Text>
                    <View style={styles.dateSeparatorLine} />
                </View>
            );
        }

        // Render message
        const isCurrentUser = item.sender && item.sender.isCurrentUser;

        // Find the previous message (that's not a date separator)
        let prevMessageIndex = index - 1;
        let prevMessage = null;

        while (prevMessageIndex >= 0) {
            if (preparedMessages[prevMessageIndex].type === "message") {
                prevMessage = preparedMessages[prevMessageIndex];
                break;
            }
            prevMessageIndex--;
        }

        const isConsecutive =
            prevMessage &&
            prevMessage.sender?.isCurrentUser === isCurrentUser &&
            !shouldShowDateSeparator(item, prevMessage);

        const messageTime = new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser
                        ? styles.currentUserMessage
                        : styles.otherUserMessage,
                    isConsecutive && styles.consecutiveMessage,
                ]}>
                <View
                    style={[
                        styles.messageBubble,
                        isCurrentUser
                            ? styles.currentUserBubble
                            : styles.otherUserBubble,
                        item.pending && styles.pendingMessage,
                        item.failed && styles.failedMessage,
                    ]}>
                    <Text
                        style={[
                            styles.messageText,
                            isCurrentUser
                                ? styles.currentUserText
                                : styles.otherUserText,
                        ]}>
                        {item.content}
                    </Text>

                    <View style={styles.messageFooter}>
                        {item.pending && (
                            <Ionicons
                                name="time-outline"
                                size={12}
                                color={
                                    isCurrentUser
                                        ? withOpacity(
                                              theme.colors.onPrimary,
                                              0.7
                                          )
                                        : theme.colors.textSecondary
                                }
                            />
                        )}
                        {item.failed && (
                            <Ionicons
                                name="alert-circle-outline"
                                size={12}
                                color={theme.colors.error}
                            />
                        )}
                        <Text
                            style={[
                                styles.messageTime,
                                isCurrentUser
                                    ? styles.currentUserTime
                                    : styles.otherUserTime,
                            ]}>
                            {messageTime}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const menuOptions = [
        {
            label: "View Profile",
            icon: "person-outline",
            onPress: () => {
                if (otherPet && otherPet._id) {
                    navigation.navigate("PetProfile", {
                        petId: otherPet._id,
                    });
                }
            },
        },
        {
            label: "Unmatch",
            icon: "close-circle-outline",
            onPress: handleUnmatch,
        },
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Prepare messages with date separators
    const preparedMessages = prepareMessagesWithDateSeparators();

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.chatContainer}>
                {messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={64}
                            color={theme.colors.divider}
                        />
                        <Text style={styles.emptyText}>No messages yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start the conversation!
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={preparedMessages}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.messagesContainer}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        onContentSizeChange={() => scrollToBottom(false)}
                        onLayout={() => scrollToBottom(false)}
                    />
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.colors.placeholder}
                        multiline
                        maxHeight={80}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !inputText.trim() || isSending
                                ? styles.disabledButton
                                : {},
                        ]}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || isSending}>
                        {isSending ? (
                            <ActivityIndicator
                                size="small"
                                color={theme.colors.onPrimary}
                            />
                        ) : (
                            <Ionicons
                                name="send"
                                size={20}
                                color={theme.colors.onPrimary}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <MenuBottomSheet
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                options={menuOptions}
                title="Chat Options"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    chatContainer: {
        flex: 1,
        width: "100%",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    backButton: {
        marginLeft: theme.spacing.sm,
        padding: theme.spacing.xs,
    },
    headerButton: {
        marginRight: theme.spacing.sm,
        padding: theme.spacing.xs,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    headerTitle: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 80,
    },
    emptyText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.lg,
    },
    emptySubtext: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.textDisabled,
        marginTop: theme.spacing.sm,
    },
    messagesContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingBottom: theme.spacing.xxl * 2, // Extra padding at bottom to ensure messages aren't hidden
    },
    messageContainer: {
        marginVertical: theme.spacing.xs,
        maxWidth: "80%",
    },
    consecutiveMessage: {
        marginTop: 2,
    },
    currentUserMessage: {
        alignSelf: "flex-end",
    },
    otherUserMessage: {
        alignSelf: "flex-start",
    },
    messageBubble: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        minWidth: 80,
    },
    currentUserBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: theme.borderRadius.xs,
    },
    otherUserBubble: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        borderBottomLeftRadius: theme.borderRadius.xs,
    },
    messageText: {
        fontSize: theme.typography.fontSize.md,
        lineHeight:
            theme.typography.lineHeight.normal * theme.typography.fontSize.md,
    },
    currentUserText: {
        color: theme.colors.onPrimary,
    },
    otherUserText: {
        color: theme.colors.textPrimary,
    },
    pendingMessage: {
        opacity: 0.7,
    },
    failedMessage: {
        backgroundColor: withOpacity(theme.colors.error, 0.1),
        borderColor: withOpacity(theme.colors.error, 0.3),
    },
    messageFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: theme.spacing.xs,
        gap: 4,
    },
    messageTime: {
        fontSize: theme.typography.fontSize.xs,
        alignSelf: "flex-end",
    },
    currentUserTime: {
        color: withOpacity(theme.colors.onPrimary, 0.7),
    },
    otherUserTime: {
        color: theme.colors.textSecondary,
    },
    inputContainer: {
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.backgroundVariant,
        borderRadius: theme.borderRadius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.md,
        maxHeight: 80,
        marginRight: theme.spacing.md,
        color: theme.colors.textPrimary,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: theme.colors.buttonDisabled,
    },
    // Date separator styles
    dateSeparatorContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.divider,
    },
    dateSeparatorText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginHorizontal: theme.spacing.md,
        fontWeight: theme.typography.fontWeight.medium,
    },
});

export default ChatScreen;
