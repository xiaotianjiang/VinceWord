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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, email, phone, status, password } = body;

    const errors: string[] = [];

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

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('手机号格式不正确');
    }

    if (password && password.length < 6) {
      errors.push('密码长度不能少于6位');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { data: existingEmail } = await supabase
      .from('vw_sys_users')
      .select('id')
      .eq('email', email)
      .neq('id', params.id)
      .single();

    if (existingEmail) {
      return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 });
    }

    if (phone) {
      const { data: phoneExists } = await supabase
        .from('vw_sys_users')
        .select('id')
        .eq('phone', phone)
        .neq('id', params.id)
        .single();
      if (phoneExists) {
        return NextResponse.json({ error: '手机号已被使用' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const updates: any = { 
      updated_at: now, 
      update_id: adminId 
    };
    
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (!phone) updates.phone = null;
    if (status) updates.status = status;

    if (password) {
      const bcrypt = await import('bcrypt');
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    await supabase.from('vw_sys_users').update(updates).eq('id', params.id);

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '更新失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await verifyAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    await supabase.from('vw_sys_user_roles').delete().eq('user_id', params.id);
    await supabase.from('vw_sys_users').delete().eq('id', params.id);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    return NextResponse.json({ error: '删除失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}
