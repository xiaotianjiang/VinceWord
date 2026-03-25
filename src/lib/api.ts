// 统一API服务层
class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  private buildHeaders(requiresAuth: boolean = true, customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (requiresAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse(response: Response): Promise<any> {
    const data = await response.json();

    if (!response.ok) {
      // 处理401未授权错误
      if (response.status === 401) {
        // 清除本地存储的token
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-info');
        // 跳转到登录页
        window.location.href = '/auth/login';
      }
      throw new Error(data.error || `请求失败: ${response.status}`);
    }

    return data;
  }

  /**
   * GET请求
   * @param url 请求地址
   * @param params 查询参数
   * @param options 配置选项
   */
  async get<T = any>(
    url: string,
    params: Record<string, any> = {},
    options: { requiresAuth?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const { requiresAuth = true, headers: customHeaders = {} } = options;
    const queryParams = new URLSearchParams(params).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: this.buildHeaders(requiresAuth, customHeaders)
    });

    return this.handleResponse(response) as T;
  }

  /**
   * POST请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 配置选项
   */
  async post<T = any>(
    url: string,
    data: any = {},
    options: { requiresAuth?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const { requiresAuth = true, headers: customHeaders = {} } = options;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(requiresAuth, customHeaders),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response) as T;
  }

  /**
   * PUT请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 配置选项
   */
  async put<T = any>(
    url: string,
    data: any = {},
    options: { requiresAuth?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const { requiresAuth = true, headers: customHeaders = {} } = options;

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(requiresAuth, customHeaders),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response) as T;
  }

  /**
   * DELETE请求
   * @param url 请求地址
   * @param options 配置选项
   */
  async delete<T = any>(
    url: string,
    options: { requiresAuth?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const { requiresAuth = true, headers: customHeaders = {} } = options;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(requiresAuth, customHeaders)
    });

    return this.handleResponse(response) as T;
  }

  /**
   * 上传文件
   * @param url 请求地址
   * @param formData 表单数据
   * @param options 配置选项
   */
  async upload<T = any>(
    url: string,
    formData: FormData,
    options: { requiresAuth?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const { requiresAuth = true, headers: customHeaders = {} } = options;

    // 上传文件时不需要设置Content-Type，浏览器会自动设置
    const headers = this.buildHeaders(requiresAuth, customHeaders);
    delete headers['Content-Type'];

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    return this.handleResponse(response) as T;
  }
}

// 导出API服务实例
export const api = new ApiService();

// 导出类型
export type ApiServiceOptions = {
  requiresAuth?: boolean;
  headers?: Record<string, string>;
};
