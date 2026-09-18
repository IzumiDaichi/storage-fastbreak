declare global {
  interface Window {
    electronAPI?: {
      readLocalData: () => Promise<any>;
      saveLocalData: (data: any) => Promise<any>;
      checkGoogleAuthStatus: () => Promise<any>;
      requestGoogleAuthLink: () => Promise<any>;
      signOutGoogleAccount: () => Promise<any>;
      openExternalLink: (url: string) => Promise<any>;
      onAuthSuccess: (callback: (value: { email: string }) => void) => () => void;
      onDriveSyncStatus: (callback: (value: { synced: boolean; error?: string }) => void) => () => void;
    };
  }
}

export {};
