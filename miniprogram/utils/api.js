// utils/api.js - API请求封装
const app = getApp()

class ApiService {
  constructor() {
    this.baseUrl = app.globalData.baseUrl
    this.timeout = 10000
  }

  // 通用请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data = {}, header = {} } = options
      
      // 添加认证头
      const token = wx.getStorageSync('token')
      if (token) {
        header.Authorization = `Bearer ${token}`
      }
      
      // 设置默认请求头
      header['Content-Type'] = header['Content-Type'] || 'application/json'
      
      wx.request({
        url: this.baseUrl + url,
        method,
        data,
        header,
        timeout: this.timeout,
        success: (res) => {
          const { statusCode, data } = res
          
          if (statusCode === 200) {
            if (data.code === 0) {
              resolve(data.data)
            } else {
              this.handleError(data.message || '请求失败')
              reject(new Error(data.message))
            }
          } else if (statusCode === 401) {
            // token过期，清除登录信息
            this.clearAuth()
            wx.reLaunch({
              url: '/pages/login/login'
            })
            reject(new Error('登录已过期'))
          } else {
            this.handleError(`请求失败 (${statusCode})`)
            reject(new Error(`HTTP ${statusCode}`))
          }
        },
        fail: (error) => {
          console.error('API请求失败:', error)
          this.handleError('网络请求失败，请检查网络连接')
          reject(error)
        }
      })
    })
  }

  // GET请求
  get(url, params = {}) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    const fullUrl = queryString ? `${url}?${queryString}` : url
    
    return this.request({
      url: fullUrl,
      method: 'GET'
    })
  }

  // POST请求
  post(url, data = {}) {
    return this.request({
      url,
      method: 'POST',
      data
    })
  }

  // PUT请求
  put(url, data = {}) {
    return this.request({
      url,
      method: 'PUT',
      data
    })
  }

  // DELETE请求
  delete(url) {
    return this.request({
      url,
      method: 'DELETE'
    })
  }

  // 文件上传
  uploadFile(filePath, fileName = 'file') {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token')
      
      wx.uploadFile({
        url: this.baseUrl + '/upload',
        filePath,
        name: fileName,
        header: {
          Authorization: `Bearer ${token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0) {
              resolve(data.data)
            } else {
              reject(new Error(data.message))
            }
          } catch (error) {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: reject
      })
    })
  }

  // 错误处理
  handleError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }

  // 清除认证信息
  clearAuth() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    app.globalData.token = null
    app.globalData.userInfo = null
  }
}

// 具体API接口
class HabitApi extends ApiService {
  // 用户认证
  login(code, userInfo) {
    return this.post('/auth/login', { code, userInfo })
  }

  // 获取用户信息
  getUserInfo() {
    return this.get('/user/info')
  }

  // 获取习惯列表
  getHabits() {
    return this.get('/habits')
  }

  // 创建习惯
  createHabit(habitData) {
    return this.post('/habits', habitData)
  }

  // 更新习惯
  updateHabit(habitId, habitData) {
    return this.put(`/habits/${habitId}`, habitData)
  }

  // 删除习惯
  deleteHabit(habitId) {
    return this.delete(`/habits/${habitId}`)
  }

  // 获取打卡记录
  getCheckins(habitId, startDate, endDate) {
    return this.get('/checkins', {
      habit_id: habitId,
      start_date: startDate,
      end_date: endDate
    })
  }

  // 创建打卡记录
  createCheckin(checkinData) {
    return this.post('/checkins', checkinData)
  }

  // 补卡
  makeupCheckin(habitId, date) {
    return this.post('/checkins/makeup', {
      habit_id: habitId,
      date
    })
  }

  // 获取统计数据
  getStatistics(period = 'month') {
    return this.get('/statistics', { period })
  }

  // 获取积分记录
  getPointRecords(page = 1, limit = 20) {
    return this.get('/points', { page, limit })
  }

  // 积分兑换
  exchangeReward(rewardId) {
    return this.post('/points/exchange', { reward_id: rewardId })
  }

  // 获取奖励列表
  getRewards() {
    return this.get('/rewards')
  }
}

// 离线数据管理
class OfflineManager {
  constructor() {
    this.pendingKey = 'pendingSync'
  }

  // 添加待同步数据
  addPendingData(data) {
    const pending = wx.getStorageSync(this.pendingKey) || []
    pending.push({
      id: Date.now(),
      data,
      timestamp: new Date().toISOString()
    })
    wx.setStorageSync(this.pendingKey, pending)
  }

  // 获取待同步数据
  getPendingData() {
    return wx.getStorageSync(this.pendingKey) || []
  }

  // 移除已同步数据
  removePendingData(id) {
    const pending = this.getPendingData()
    const filtered = pending.filter(item => item.id !== id)
    wx.setStorageSync(this.pendingKey, filtered)
  }

  // 同步数据
  async syncData() {
    const pending = this.getPendingData()
    const api = new HabitApi()

    for (const item of pending) {
      try {
        // 根据数据类型选择对应的API
        if (item.data.type === 'checkin') {
          await api.createCheckin(item.data.payload)
        }
        // 可以添加更多数据类型的处理
        
        // 同步成功，移除本地数据
        this.removePendingData(item.id)
      } catch (error) {
        console.error('数据同步失败:', error)
        // 同步失败的数据保留在本地，下次继续尝试
      }
    }
  }

  // 检查网络状态并同步
  checkAndSync() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType !== 'none') {
          this.syncData()
        }
      }
    })
  }
}

// 导出实例
const api = new HabitApi()
const offlineManager = new OfflineManager()

module.exports = {
  api,
  offlineManager
}
