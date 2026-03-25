export function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function validateInviteCode(code: string): boolean {
  // 简单的邀请码格式验证
  return /^[A-Z0-9]{6,12}$/.test(code);
}
