export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  is_system: boolean;
  type: string;
  parent_id: string | null;
  create_id: string | null;
  update_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  name: string;
  icon: string;
  path: string;
  type: string;
  parent_id: string | null;
  order: number;
  status: string;
  permission_code: string | null;
  access_level: string;
  params: any;
  meta: any;
  create_id: string | null;
  update_id: string | null;
  created_at: string;
  updated_at: string;
  children?: Menu[];
}

export interface User {
  id: string;
  usercode: string;
  username: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: string;
  last_login: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  inviter_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Token {
  id: string;
  token: string;
  user_id: string;
  create_id: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  status: string;
  device_info: string | null;
  ip_address: string | null;
  last_status_change: string;
  status_reason: string | null;
}
