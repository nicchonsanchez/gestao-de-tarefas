'use client';

import { io, type Socket } from 'socket.io-client';
import { env } from './env';
import { useAuthStore } from '@/stores/auth-store';

let socket: Socket | null = null;

/**
 * Retorna a instância singleton do Socket.IO.
 * Conecta quando há accessToken; desconecta ao logout (ver clearSocket).
 */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().accessToken;
  if (!token) {
    throw new Error('Socket requires authentication — accessToken ausente');
  }

  socket = io(env.NEXT_PUBLIC_WS_URL.replace(/^http/, 'ws'), {
    auth: { token },
    autoConnect: true,
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
