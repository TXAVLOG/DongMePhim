type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare global {
  namespace App {
    interface Locals extends Runtime {
      user?: any;
    }
  }

  interface Window {
    APP_USER?: any;
    txaTurnstileTokenLogin?: string;
    txaTurnstileTokenRegister?: string;
    TXA_API_CONFIG?: any;
    TXA_SITE_SETTINGS?: any;
    __txa_fetch_patched?: boolean;
    logout?: () => void;
    showGlobalToast?: (msg: string, type: string) => void;
  }
}

export {};
