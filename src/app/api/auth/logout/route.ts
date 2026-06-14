// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabase.from('vw_sys_tokens').update({ 
        status: 'revoked',
        last_status_change: new Date().toISOString(),
        status_reason: '用户主动登出'
      }).eq('token', token);
    }

    return NextResponse.json({ success: true, message: '登出成功' });
  } catch {
    return NextResponse.json({ success: true, message: '登出成功' });
  }
}
