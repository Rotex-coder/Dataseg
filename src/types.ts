export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string; // Turkish-character-free handle starting with @
  avatar: string;
  contacts: string[]; // List of user IDs of added contacts
  createdAt: string;
  pushSubscriptions?: PushSubscriptionData[]; // Web Push subscriptions (one per device/browser)
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  edited: boolean;
  deletedForEveryone: boolean;
  deletedForUsers: string[]; // User IDs who deleted this for themselves ("sadece benden sil")
  createdAt: string;
  read?: boolean;
  pending?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
