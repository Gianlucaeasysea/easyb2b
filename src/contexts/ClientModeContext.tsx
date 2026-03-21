import { createContext, useContext, useState, ReactNode } from "react";

interface ClientModeContextType {
  isClientMode: boolean;
  toggleClientMode: () => void;
}

const ClientModeContext = createContext<ClientModeContextType>({ isClientMode: false, toggleClientMode: () => {} });

export const ClientModeProvider = ({ children }: { children: ReactNode }) => {
  const [isClientMode, setIsClientMode] = useState(false);
  const toggleClientMode = () => setIsClientMode(prev => !prev);

  return (
    <ClientModeContext.Provider value={{ isClientMode, toggleClientMode }}>
      {children}
    </ClientModeContext.Provider>
  );
};

export const useClientMode = () => useContext(ClientModeContext);
