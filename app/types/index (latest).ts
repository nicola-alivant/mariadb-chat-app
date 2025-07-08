export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Chat {
  id: string;
  room_id: string;
  senderId: string;
  message: string;
  send_at: Date;
}

export interface ChatUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}
