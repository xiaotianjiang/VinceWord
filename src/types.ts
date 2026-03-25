export interface Role {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  created_at?: string;
  password?: string;
  status?: string;
  source?: string;
  phone?: string;
  usercode?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  message_type: string;
  created_at: string;
  sender?: {
    username: string;
  };
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  status: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface InviteCodeRequest {
  id: string;
  email: string;
  reason: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface OperationLog {
  id: string;
  operation: string;
  status: string;
  user_email: string;
  ip_address: string;
  details: string | null;
  created_at: string;
}
