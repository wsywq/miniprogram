// utils/auth.js - 用户认证管理
const { api } = require('./api.js')

class AuthManager {
  constructor() {
    this.app = getApp()
  }

  // 检查登录状态
  isLoggedIn() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    return !!(token && userInfo)
  }

  // 微信登录
  async login() {
    try {
      // 1. 检查是否已登录
      if (this.isLoggedIn()) {
        return this.getUserInfo()
      }

      // 2. 获取微信登录凭证
      const loginRes = await this.wxLogin()
      const code = loginRes.code

      // 3. 获取用户信息授权
      const userProfile = await this.getUserProfile()

      // 4. 发送到后端验证并获取token
      const authResult = await api.login(code, userProfile.userInfo)

      // 5. 存储认证信息
      this.saveAuthInfo(authResult)

      return authResult
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }

  // 微信登录获取code
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
  }

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: resolve,
        fail: (error) => {
          if (error.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '授权提示',
              content: '需要获取您的用户信息才能正常使用小程序功能',
              showCancel: false
            })
          }
          reject(error)
        }
      })
    })
  }

  // 保存认证信息
  saveAuthInfo(authResult) {
    const { token, userInfo } = authResult
    
    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
    
    this.app.globalData.token = token
    this.app.globalData.userInfo = userInfo
  }

  // 获取当前用户信息
  getUserInfo() {
    return wx.getStorageSync('userInfo')
  }

  // 获取token
  getToken() {
    return wx.getStorageSync('token')
  }

  // 登出
  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    
    this.app.globalData.token = null
    this.app.globalData.userInfo = null

    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    })
  }

  // 检查并刷新token
  async refreshTokenIfNeeded() {
    try {
      // 尝试获取用户信息来验证token是否有效
      await api.getUserInfo()
      return true
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('登录已过期')) {
        // token无效，需要重新登录
        this.logout()
        return false
      }
      throw error
    }
  }

  // 确保用户已登录的装饰器方法
  async ensureLogin() {
    if (!this.isLoggedIn()) {
      await this.login()
    } else {
      // 验证token是否仍然有效
      const isValid = await this.refreshTokenIfNeeded()
      if (!isValid) {
        await this.login()
      }
    }
  }
}

module.exports = new AuthManager()
