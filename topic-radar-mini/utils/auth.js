const api = require('./api');

/**
 * 微信登录获取 Token
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error('微信登录失败'));
          return;
        }
        api.auth.login(res.code).then((data) => {
          wx.setStorageSync('token', data.token);
          wx.setStorageSync('userInfo', {
            id: data.user?.id,
            nickname: data.user?.nickname,
            avatar: data.user?.avatarUrl,
            role: data.user?.role,
            membership: data.user?.membership,
            membershipExpiresAt: data.user?.membershipExpiresAt,
          });
          resolve(data);
        }).catch(reject);
      },
      fail: reject,
    });
  });
}

/**
 * 检查是否已登录
 */
function checkLogin() {
  return !!wx.getStorageSync('token');
}

/**
 * 确保已登录（未登录则自动登录）
 */
async function ensureLogin() {
  if (!checkLogin()) {
    await login();
  }
}

/**
 * 获取缓存的用户信息
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo') || {};
}

module.exports = { login, checkLogin, ensureLogin, getUserInfo };
