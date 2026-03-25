import jwt from 'jsonwebtoken';

// 确保使用固定的密钥，避免环境变量加载问题
const JWT_SECRET = 'your-secret-key-change-in-production';

interface Role {
  id: string;
  name: string;
  type: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  console.log('生成token，密钥长度:', JWT_SECRET.length);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    console.log('验证token，密钥长度:', JWT_SECRET.length);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('token验证成功:', decoded);
    return decoded;
  } catch (error) {
    console.error('JWT验证错误:', error);
    return null;
  }
}
