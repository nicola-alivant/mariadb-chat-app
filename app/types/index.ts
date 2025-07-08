export interface User {
  id: string;
  displayName: string;
  email: string;
  uid: string;
}

export interface Message {
  id: number;
  text: string;
  senderId: number;
  senderName: string;
  timestamp: Date;
  receiverId: string;
}

export interface ChatUser {
  id: number;
  displayName?: string;
  email: string;
  uid: string;
}
