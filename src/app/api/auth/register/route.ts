import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { generateInviteCode } from '@/lib/invite-code';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
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
      .select('*')
      .eq('code', inviteCode)
      .eq('status', 'active')
      .single();

    if (inviteCodeError || !inviteCodeData) {
      return NextResponse.json({ error: '无效的邀请码' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const { data: existingEmailUser } = await supabase
      .from('vw_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingEmailUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    // 检查用户名是否已存在
    const { data: existingUsernameUser } = await supabase
      .from('vw_users')
      .select('*')
      .eq('username', username)
      .single();

    if (existingUsernameUser) {
      return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
    }

    // 检查usercode是否已存在
    const { data: existingUsercodeUser } = await supabase
      .from('vw_users')
      .select('*')
      .eq('usercode', usercode)
      .single();

    if (existingUsercodeUser) {
      return NextResponse.json({ error: '该账号已被使用' }, { status: 400 });
    }

    // 检查手机号是否已存在（如果提供了手机号）
    if (phone) {
      const { data: existingPhoneUser } = await supabase
        .from('vw_users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (existingPhoneUser) {
        return NextResponse.json({ error: '该手机号已被注册' }, { status: 400 });
      }
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 开始事务
    const { data: newUser, error: insertError } = await supabase
      .from('vw_users')
      .insert({
        usercode,
        username,
        email,
        phone: phone || null,
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 更新source字段
    const { error: updateError } = await supabase
      .from('vw_users')
      .update({ source: '注册' })
      .eq('id', newUser.id);

    if (updateError) {
      console.error('更新source字段错误:', updateError);
      // 继续执行，不中断流程
    }

    // 更新邀请码状态
    await supabase
      .from('vw_invite_codes')
      .update({ status: 'used', used_by: newUser.id, used_at: new Date().toISOString() })
      .eq('id', inviteCodeData.id);

    // 记录邀请关系
    if (inviteCodeData.generator_id) {
      await supabase
        .from('vw_invite_relations')
        .insert({
          inviter_id: inviteCodeData.generator_id,
          invitee_id: newUser.id,
          invite_code: inviteCodeData.code,
          created_at: new Date().toISOString()
        });
    }

    // 记录注册成功日志
    await createOperationLog('register', '成功', email, request.ip || 'unknown');

    return NextResponse.json({ 
      success: true, 
      message: '注册成功！请登录',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
  }
}
