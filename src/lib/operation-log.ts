import { supabase } from './supabase';

export async function createOperationLog(
  operation: string,
  status: string,
  userEmail: string,
  ipAddress: string,
  details?: string
) {
  try {
    await supabase
      .from('vw_operation_logs')
      .insert({
        operation,
        status,
        user_email: userEmail,
        ip_address: ipAddress,
        details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('记录操作日志错误:', error);
  }
}

export async function getOperationLogs(userId: string, limit: number = 50) {
  try {
    const { data: logs } = await supabase
      .from('vw_operation_logs')
      .select('*')
      .eq('user_email', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return logs;
  } catch (error) {
    console.error('获取操作日志错误:', error);
    return [];
  }
}
