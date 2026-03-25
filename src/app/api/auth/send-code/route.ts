import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { type, target } = await request.json();

    if (!type || !target) {
      return NextResponse.json({ error: '验证码类型和目标不能为空' }, { status: 400 });
    }

    // 验证类型
    const validTypes = ['register', 'reset', 'login'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: '验证码类型无效' }, { status: 400 });
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 过期时间：10分钟
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 检查是否已有未使用的验证码
    const { data: existingCode } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('target', target)
      .eq('type', type)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existingCode) {
      // 更新现有验证码
      await supabase
        .from('verification_codes')
        .update({
          code,
          expires_at: expiresAt.toISOString()
        })
        .eq('id', existingCode.id);
    } else {
      // 创建新验证码
      await supabase
        .from('verification_codes')
        .insert({
          id: uuidv4(),
          target,
          code,
          type,
          expires_at: expiresAt.toISOString(),
          used: false
        });
    }

    // 这里应该添加发送验证码的逻辑（短信或邮件）
    console.log(`发送验证码 ${code} 到 ${target}，类型：${type}`);

    return NextResponse.json({ 
      success: true, 
      message: '验证码发送成功',
      expiresIn: 600 // 10分钟，单位秒
    });
  } catch (error) {
    console.error('发送验证码错误:', error);
    return NextResponse.json({ error: '发送验证码失败，请重试' }, { status: 500 });
  }
}
