import * as bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { User } from '@/types';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function registerUser(usercode: string, email: string, username: string, password: string): Promise<User | null> {
  try {
    // 检查usercode是否已存在
    const { data: existingUserCode } = await supabase
      .from('users')
      .select('usercode')
      .eq('usercode', usercode)
      .single();

    if (existingUserCode) {
      throw new Error('账号名已存在');
    }

    // 检查username是否已存在
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      throw new Error('用户名已存在');
    }

    // 如果邮箱不为空，检查邮箱是否已存在
    if (email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      if (existingEmail) {
        throw new Error('邮箱已存在');
      }
    }

    const passwordHash = await hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          usercode,
          email: email || null, 
          username, 
          password_hash: passwordHash,
          role: 'user'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('注册错误:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('注册异常:', error);
    throw error; // 抛出错误以便页面层处理具体错误信息
  }
}

export async function loginUser(identifier: string, password: string): Promise<User | null> {
  try {
    // 判断identifier是邮箱还是账号
    const isEmail = identifier.includes('@');
    
    let query = supabase
      .from('users')
      .select('*');
    
    if (isEmail) {
      query = query.eq('email', identifier);
    } else {
      query = query.eq('usercode', identifier);
    }
    
    const { data: user, error } = await query.single();

    if (error || !user) {
      console.error('用户不存在:', error);
      return null;
    }

    // 调试信息：检查返回的用户数据
    console.log('用户数据:', user);
    console.log('密码哈希字段:', user.password_hash);
    console.log('所有字段:', Object.keys(user));

    // 检查字段名是否正确 - Supabase可能返回不同的字段名
    const passwordHash = user.password_hash || (user as any).passwordHash || (user as any).password;
    console.log('使用的密码哈希字段:', passwordHash);

    if (!passwordHash) {
      console.error('未找到密码哈希字段');
      return null;
    }

    const isValidPassword = await verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      console.error('密码错误');
      return null;
    }

    return user;
  } catch (error) {
    console.error('登录异常:', error);
    return null;
  }
}

export { getCurrentUser, setCurrentUser } from './session';