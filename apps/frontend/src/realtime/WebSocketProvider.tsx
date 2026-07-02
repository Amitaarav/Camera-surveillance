import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useWebSocket } from "./useWebSocket";

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (cameraIds: string[]) => void;
  unsubscribe: (cameraIds: string[]) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  subscribe: () => {},
  unsubscribe: () => {},
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useWebSocket();

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWs(): WebSocketContextValue {
  return useContext(WebSocketContext);
}
