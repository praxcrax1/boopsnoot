/**
 * Socket Service - Handles WebSocket connection and communication
 * Isolates socket.io logic and provides a clean interface
 */
import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants/apiConfig";

class SocketService {
    /**
     * Socket.io instance
     * @type {import('socket.io-client').Socket}
     */
    socket = null;
    
    /**
     * Whether the socket is currently connected
     * @type {boolean}
     */
    isConnected = false;
    
    /**
     * The user ID associated with this socket connection
     * @type {string|null}
     */
    userId = null;

    /**
     * Reconnection attempts counter
     * @type {number}
     */
    reconnectAttempts = 0;
    
    /**
     * Maximum number of reconnection attempts
     * @type {number}
     */
    MAX_RECONNECT_ATTEMPTS = 5;

    /**
     * Connect to the WebSocket server
     * @param {string} userId - The authenticated user's ID
     * @returns {Promise<import('socket.io-client').Socket>} - The socket instance
     */
    connect(userId) {
        if (this.socket && this.isConnected) {
            console.log('Socket already connected');
            return Promise.resolve(this.socket);
        }

        return new Promise((resolve, reject) => {
            try {
                // Create socket instance with options
                this.socket = io(SOCKET_URL, {
                    reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    timeout: 10000,
                    transports: ['websocket', 'polling'],
                });

                // Store userId for reconnection
                this.userId = userId;

                // Set up event handlers
                this.socket.on('connect', () => {
                    console.log('Socket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Authenticate on connection
                    this.emit('authenticate', { userId });
                    resolve(this.socket);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Socket connection error:', error);
                    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                        this.reconnectAttempts++;
                    } else {
                        reject(error);
                    }
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason);
                    this.isConnected = false;
                    
                    // Handle reconnection if needed
                    if (reason === 'io server disconnect') {
                        // The server forced disconnect, need to reconnect manually
                        this.reconnect();
                    }
                });

                this.socket.on('error', (error) => {
                    console.error('Socket error:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('Error initializing socket:', error);
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect the socket
     */
    reconnect() {
        if (this.userId) {
            this.connect(this.userId).catch(error => {
                console.error('Reconnection failed:', error);
            });
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.userId = null;
            console.log('Socket disconnected');
        }
    }

    /**
     * Emit an event to the WebSocket server
     * @param {string} event - The event name
     * @param {any} payload - The event payload
     */
    emit(event, payload) {
        if (!this.socket || !this.isConnected) {
            console.error('Cannot emit event, socket is not connected', event);
            return;
        }
        
        console.log(`Emitting ${event}`, payload);
        this.socket.emit(event, payload);
    }

    /**
     * Register an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    on(event, callback) {
        if (!this.socket) {
            console.error('Cannot register event listener, socket is not initialized', event);
            return;
        }
        
        this.socket.on(event, callback);
    }

    /**
     * Remove an event listener
     * @param {string} event - The event name
     * @param {Function} [callback] - The callback function to remove (optional)
     */
    off(event, callback) {
        if (!this.socket) {
            console.error('Cannot remove event listener, socket is not initialized', event);
            return;
        }
        
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    /**
     * Check if socket is connected
     * @returns {boolean} - Whether the socket is connected
     */
    getIsConnected() {
        return this.isConnected;
    }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
