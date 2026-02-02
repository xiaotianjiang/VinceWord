export {};

declare global {
  interface Window {
    // 用户变化事件
    addEventListener(
      type: 'userChanged',
      listener: (event: CustomEvent<User | null>) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    
    removeEventListener(
      type: 'userChanged',
      listener: (event: CustomEvent<User | null>) => void,
      options?: boolean | EventListenerOptions
    ): void;
    
    dispatchEvent(event: CustomEvent<User | null>): boolean;
  }
}