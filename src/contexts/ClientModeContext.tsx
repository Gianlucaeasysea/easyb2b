import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ClientModeContextType {
  isClientMode: boolean;
  toggleClientMode: () => void;
}

const ClientModeContext = createContext<ClientModeContextType>({ isClientMode: false, toggleClientMode: () => {} });

export const ClientModeProvider = ({ children }: { children: ReactNode }) => {
  const [isClientMode, setIsClientMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dealer_client_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleClientMode = useCallback(() => {
    setIsClientMode(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('dealer_client_mode', String(next));
      } catch { /* noop */ }
      return next;
    });
  }, []);

  return (
    <ClientModeContext.Provider value={{ isClientMode, toggleClientMode }}>
      {children}
    </ClientModeContext.Provider>
  );
};

export const useClientMode = () => useContext(ClientModeContext);
