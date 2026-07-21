import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { updateStockTicks, updateIndicesTicks } from '../store/slices/marketSlice';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5001';

let globalSocket = null;

export default function useWebSocket() {
  const dispatch = useDispatch();
  const activeSymbol = useSelector(state => state.market.activeSymbol);
  const prevSymbolRef = useRef(null);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000
      });
      globalSocket.on('connect', () => {
        console.log('WebSocket connected');
        globalSocket.emit('join_ticks');
        globalSocket.emit('join_indices');
      });
      globalSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
    }

    const handleTickUpdate = (data) => {
      if (Array.isArray(data)) dispatch(updateStockTicks(data));
    };
    
    const handleIndicesUpdate = (data) => {
      if (data) dispatch(updateIndicesTicks(data));
    };

    globalSocket.on('tick_update', handleTickUpdate);
    globalSocket.on('indices_update', handleIndicesUpdate);

    return () => {
      globalSocket.off('tick_update', handleTickUpdate);
      globalSocket.off('indices_update', handleIndicesUpdate);
      // We explicitly do NOT disconnect the globalSocket here so that React Strict Mode's rapid mount/unmount cycle doesn't close it before connection establishes.
    };
  }, [dispatch]);

  // Watch/unwatch specific stocks
  useEffect(() => {
    const socket = globalSocket;
    if (!socket) return;

    if (prevSymbolRef.current && prevSymbolRef.current !== activeSymbol) {
      socket.emit('unwatch_stock', prevSymbolRef.current);
    }
    if (activeSymbol) {
      socket.emit('watch_stock', activeSymbol);
    }
    prevSymbolRef.current = activeSymbol;
  }, [activeSymbol]);
}
