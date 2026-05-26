import { SOCKET_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

// Singleton socket instance for realtime notifications
let socket: Socket | null = null;

// Connect WebSocket to server, passing userId via query params
export function connectNotificationSocket(userId: string) {
  if (socket) return socket;
  if (!userId) return null;
  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
  });
  return socket;
}

// Get current socket instance (for listening to events)
export function getNotificationSocket() {
  return socket;
}

// Disconnect WebSocket when user logs out
export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
