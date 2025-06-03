/**
 * Custom hook for socket event listening with automatic cleanup
 * Simplifies component interaction with socket events
 */
import { useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';

/**
 * Custom hook to listen for socket events with automatic cleanup
 * @param {string} eventName - The name of the socket event to listen for
 * @param {Function} handler - The callback function to execute when the event is received
 * @param {Array} deps - Optional dependency array for the useEffect hook
 */
export const useSocketListener = (eventName, handler, deps = []) => {
    // Get socket methods from context
    const { on, off } = useContext(SocketContext);

    useEffect(() => {
        // Skip if no event name or handler
        if (!eventName || !handler) return;

        // Register the event listener
        on(eventName, handler);

        // Clean up the listener when the component unmounts
        // or when deps change
        return () => {
            off(eventName, handler);
        };
    }, [eventName, handler, on, off, ...deps]);
};

export default useSocketListener;
