import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    const { usercode, username, email, phone, password, inviteCode, agreeTerms } = await request.json();

    if (!usercode || !username || !email || !password || !inviteCode) {
      return NextResponse.json({ error: '请填写完整的注册信息' }, { status: 400 });
    }

    // 验证账号格式
    const usercodeRegex = /^[A-Za-z0-9.]{3,20}$/;
    if (!usercodeRegex.test(usercode)) {
      return NextResponse.json({ error: '账号只能输入字母、数字和英文字符的点，长度在3到20位之间' }, { status: 400 });
    }

    // 验证用户名格式
    const usernameRegex = /^[A-Za-z0-9\u4e00-\u9fa5]{1,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ error: '用户名只能输入字母、数字和中文，不能输入空格和符号，长度在20位以内' }, { status: 400 });
    }

    if (!agreeTerms) {
      return NextResponse.json({ error: '请同意用户协议和隐私政策' }, { status: 400 });
    }

    // 验证邀请码
    const { data: inviteCodeData, error: inviteCodeError } = await supabase
      .from('vw_invite_codes')
      .select('id, generator_id, code')
      .eq('code', inviteCode)
      .eq('status', 'active')
      .single();

    if (inviteCodeError || !inviteCodeData) {
      return NextResponse.json({ error: '无效的邀请码' }, { status: 400 });
    }

    // 构建存在性检查条件
    let existenceCheckQuery = supabase
      .from('vw_users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username},usercode.eq.${usercode}`);

    // 如果提供了手机号，也检查手机号
    if (phone) {
      existenceCheckQuery = existenceCheckQuery.or(`phone.eq.${phone}`);
    }

    // 检查是否有重复的账号信息
    const { data: existingUsers, error: existenceError } = await existenceCheckQuery;

    if (existenceError) {
      console.error('检查账号信息时出错:', existenceError);
      return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }

    if (existingUsers && existingUsers.length > 0) {
      // 确定具体的重复字段
      for (const user of existingUsers) {
        const { data: userDetails } = await supabase
          .from('vw_users')
          .select('email, username, usercode, phone')
          .eq('id', user.id)
          .single();

        if (userDetails) {
          if (userDetails.email === email) {
            return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
          }
          if (userDetails.username === username) {
            return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
          }
          if (userDetails.usercode === usercode) {
            return NextResponse.json({ error: '该账号已被使用' }, { status: 400 });
          }
          if (phone && userDetails.phone === phone) {
            return NextResponse.json({ error: '该手机号已被注册' }, { status: 400 });
          }
        }
      }
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();
    const ipAddress = request.ip || 'unknown';

    // 开始事务 - 插入新用户（包含source字段）
    const { data: newUser, error: insertError } = await supabase
      .from('vw_users')
      .insert({
        usercode,
        username,
        email,
        phone: phone || null,
        password_hash: hashedPassword,
        status: 'active',
        source: '注册',
        created_at: now
      })
      .select('id, username, email')
      .single();

    if (insertError) {
      throw insertError;
    }

    // 并行执行后续操作
    await Promise.all([
      // 更新邀请码状态
      supabase
        .from('vw_invite_codes')
        .update({ 
          status: 'used', 
          used_by: newUser.id, 
          used_at: now 
        })
        .eq('id', inviteCodeData.id),
      
      // 记录邀请关系（如果有邀请人）
      ...(inviteCodeData.generator_id ? [
        supabase
          .from('vw_invite_relations')
          .insert({
            inviter_id: inviteCodeData.generator_id,
            invitee_id: newUser.id,
            invite_code: inviteCodeData.code,
            created_at: now
          })
      ] : []),
      
      // 记录注册成功日志
      createOperationLog('register', '成功', email, ipAddress)
    ]);

    return NextResponse.json({ 
      success: true, 
      message: '注册成功！请登录',
      user: newUser
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
  }
}
