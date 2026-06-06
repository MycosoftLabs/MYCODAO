import { PhantomProvider, darkTheme } from "@phantom/react-sdk";
import {
  PHANTOM_APP_ICON,
  PHANTOM_APP_NAME,
  buildPhantomConfig,
} from "../config/phantom";

export function PhantomConnectProvider({ children }: { children: React.ReactNode }) {
  return (
    <PhantomProvider
      config={buildPhantomConfig()}
      theme={darkTheme}
      appIcon={PHANTOM_APP_ICON}
      appName={PHANTOM_APP_NAME}
    >
      {children}
    </PhantomProvider>
  );
}
