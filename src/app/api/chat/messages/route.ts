import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const { content, receiverId, messageType = 'text' } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 发送消息
    const { data: message, error } = await supabase
      .from('vw_messages')
      .insert({
        sender_id: decoded.userId,
        receiver_id: receiverId || null, // null表示世界聊天
        content,
        message_type: messageType,
        created_at: new Date().toISOString()
      })
      .select('*, sender:vw_users(username)')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('发送消息错误:', error);
    return NextResponse.json({ error: '发送消息失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('vw_messages')
      .select('*, sender:vw_users(username)')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (receiverId) {
      // 私聊消息
      query = query
        .or(`sender_id.eq.${decoded.userId},receiver_id.eq.${decoded.userId}`)
        .and(`sender_id.eq.${receiverId},receiver_id.eq.${receiverId}`);
    } else {
      // 世界聊天消息
      query = query.is('receiver_id', null);
    }

    const { data: messages, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('获取消息错误:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
}
