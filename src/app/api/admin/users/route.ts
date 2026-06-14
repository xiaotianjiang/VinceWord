// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyJwt(token);
  if (!decoded) return null;

  const { data: userRoles } = await supabase
    .from('vw_sys_user_roles')
    .select('role_id')
    .eq('user_id', decoded.userId);

  if (!userRoles || userRoles.length === 0) return null;

  const roleIds = userRoles.map(ur => ur.role_id);
  const { data: roles } = await supabase
    .from('vw_sys_roles')
    .select('type')
    .in('id', roleIds);

  if (!roles || !roles.some(r => r.type === 'admin' || r.type === 'superadmin')) {
    return null;
  }

  return decoded.userId;
}

export async function GET(request: NextRequest) {
  const userId = await verifyAdmin(request);
  if (!userId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  const { data: users, error } = await supabase
    .from('vw_sys_users')
    .select('id, usercode, username, email, phone, status, email_verified, phone_verified, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, users });
}

export async function POST(request: NextRequest) {
  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { usercode, username, email, password, phone } = body;

    const errors: string[] = [];

    if (!usercode) {
      errors.push('账号不能为空');
    } else if (!/^[A-Za-z0-9]{4,20}$/.test(usercode)) {
      errors.push('账号只能包含字母和数字，长度4-20位');
    }

    if (!username) {
      errors.push('用户名不能为空');
    } else if (!/^[A-Za-z0-9\u4e00-\u9fa5]{1,20}$/.test(username)) {
      errors.push('用户名只能包含字母、数字和中文，长度1-20位');
    }

    if (!email) {
      errors.push('邮箱不能为空');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('邮箱格式不正确');
    }

    if (!password) {
      errors.push('密码不能为空');
    } else if (password.length < 6) {
      errors.push('密码长度不能少于6位');
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('手机号格式不正确');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('vw_sys_users')
      .select('id')
      .or(`usercode.eq.${usercode},email.eq.${email}`)
      .single();

    if (existing) {
      return NextResponse.json({ error: '账号或邮箱已存在' }, { status: 400 });
    }

    if (phone) {
      const { data: phoneExists } = await supabase
        .from('vw_sys_users')
        .select('id')
        .eq('phone', phone)
        .single();
      if (phoneExists) {
        return NextResponse.json({ error: '手机号已被使用' }, { status: 400 });
      }
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await supabase
      .from('vw_sys_users')
      .insert({
        usercode,
        username,
        email,
        phone: phone || null,
        password_hash: passwordHash,
        status: 'active',
        email_verified: false,
        phone_verified: false,
        create_id: adminId,
        created_at: now,
        updated_at: now
      });

    return NextResponse.json({ success: true, message: '创建成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '创建失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}
