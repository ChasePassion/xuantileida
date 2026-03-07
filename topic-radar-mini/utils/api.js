const { BASE_URL } = require('./config');

/**
 * 封装 wx.request，自动带 Token、统一错误处理
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    const header = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.header || {}),
    };

    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        if (res.statusCode === 401) {
          // Token 过期，清除并跳转登录
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          // 重新登录
          const auth = require('./auth');
          auth.login().then(() => {
            // 重试原请求
            request(options).then(resolve).catch(reject);
          }).catch(reject);
          return;
        }
        if (res.statusCode >= 400) {
          const msg = res.data?.message || '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
          return;
        }
        resolve(res.data?.data ?? res.data);
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

// ===== 认证 =====
const auth = {
  login: (code) => request({ url: '/auth/wechat-login', method: 'POST', data: { code } }),
  refresh: () => request({ url: '/auth/refresh', method: 'POST' }),
};

// ===== 选题 =====
const topics = {
  getDaily: (params) => request({ url: '/topics/daily', data: params }),
  getStats: () => request({ url: '/topics/daily/stats' }),
  getCategories: () => request({ url: '/topics/categories' }),
  getDetail: (id) => request({ url: `/topics/${id}` }),
};

// ===== 视频 =====
const videos = {
  getByTopic: (topicId, params) => request({ url: `/videos/by-topic/${topicId}`, data: params }),
  getDetail: (id) => request({ url: `/videos/${id}` }),
};

// ===== 拆解分析 =====
const analysis = {
  getReport: (videoId) => request({ url: `/analysis/video/${videoId}` }),
  unlock: (reportId) => request({ url: `/analysis/unlock/${reportId}`, method: 'POST' }),
  getMyUnlocks: (params) => request({ url: '/analysis/my-unlocks', data: params }),
};

// ===== 用户 =====
const users = {
  getProfile: () => request({ url: '/users/profile' }),
  updateProfile: (data) => request({ url: '/users/profile', method: 'PATCH', data }),
  getBalance: () => request({ url: '/users/balance' }),
  getStats: () => request({ url: '/users/stats' }),
  getConfig: () => request({ url: '/users/config' }),
  updateConfig: (data) => request({ url: '/users/config', method: 'PATCH', data }),
};

// ===== 计费 =====
const billing = {
  getPricing: () => request({ url: '/billing/pricing' }),
  recharge: (data) => request({ url: '/billing/recharge', method: 'POST', data }),
  buyMembership: (data) => request({ url: '/billing/membership', method: 'POST', data }),
  getTransactions: (params) => request({ url: '/billing/transactions', data: params }),
};

module.exports = {
  request,
  auth,
  topics,
  videos,
  analysis,
  users,
  billing,
};
