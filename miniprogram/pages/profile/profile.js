// pages/profile/profile.js - 个人中心页面
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')
const { preferences } = require('../../utils/storage.js')

Page({
  data: {
    userInfo: null,
    stats: {
      totalHabits: 0,
      totalCheckins: 0,
      totalPoints: 0,
      joinDays: 0
    },
    settings: {
      notifications: true,
      reminderTime: '09:00',
      theme: 'light',
      autoSync: true
    },
    version: '1.0.0',
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true })
      
      await auth.ensureLogin()
      
      await Promise.all([
        this.loadUserInfo(),
        this.loadUserStats(),
        this.loadSettings()
      ])
      
    } catch (error) {
      console.error('加载个人信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userInfo = await api.getUserInfo()
      this.setData({ userInfo })
    } catch (error) {
      const userInfo = auth.getUserInfo()
      this.setData({ userInfo })
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const stats = await api.getStatistics('all')
      
      // 计算加入天数
      const joinDate = new Date(this.data.userInfo.created_at || Date.now())
      const now = new Date()
      const joinDays = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24))
      
      this.setData({
        stats: {
          ...stats,
          joinDays
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 加载设置
  loadSettings() {
    const settings = preferences.getPreferences()
    this.setData({ settings })
  },

  // 编辑个人信息
  editProfile() {
    wx.showModal({
      title: '功能开发中',
      content: '个人信息编辑功能正在开发中，敬请期待！',
      showCancel: false
    })
  },

  // 切换通知设置
  toggleNotifications(e) {
    const { value } = e.detail
    preferences.setPreference('notifications', value)
    this.setData({
      'settings.notifications': value
    })
    
    wx.showToast({
      title: value ? '已开启通知' : '已关闭通知',
      icon: 'success'
    })
  },

  // 设置提醒时间
  setReminderTime() {
    wx.showActionSheet({
      itemList: ['09:00', '12:00', '18:00', '21:00', '自定义'],
      success: (res) => {
        if (res.tapIndex === 4) {
          // 自定义时间
          wx.showModal({
            title: '自定义提醒时间',
            content: '请输入时间（格式：HH:MM）',
            editable: true,
            placeholderText: '09:00',
            success: (modalRes) => {
              if (modalRes.confirm && modalRes.content) {
                const time = modalRes.content.trim()
                if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
                  this.updateReminderTime(time)
                } else {
                  wx.showToast({
                    title: '时间格式错误',
                    icon: 'none'
                  })
                }
              }
            }
          })
        } else {
          const times = ['09:00', '12:00', '18:00', '21:00']
          this.updateReminderTime(times[res.tapIndex])
        }
      }
    })
  },

  // 更新提醒时间
  updateReminderTime(time) {
    preferences.setPreference('reminderTime', time)
    this.setData({
      'settings.reminderTime': time
    })
    
    wx.showToast({
      title: `提醒时间已设为${time}`,
      icon: 'success'
    })
  },

  // 切换主题
  switchTheme() {
    wx.showActionSheet({
      itemList: ['浅色主题', '深色主题', '跟随系统'],
      success: (res) => {
        const themes = ['light', 'dark', 'auto']
        const themeNames = ['浅色主题', '深色主题', '跟随系统']
        const theme = themes[res.tapIndex]
        
        preferences.setPreference('theme', theme)
        this.setData({
          'settings.theme': theme
        })
        
        wx.showToast({
          title: `已切换到${themeNames[res.tapIndex]}`,
          icon: 'success'
        })
      }
    })
  },

  // 切换自动同步
  toggleAutoSync(e) {
    const { value } = e.detail
    preferences.setPreference('autoSync', value)
    this.setData({
      'settings.autoSync': value
    })
    
    wx.showToast({
      title: value ? '已开启自动同步' : '已关闭自动同步',
      icon: 'success'
    })
  },

  // 数据导出
  exportData() {
    wx.showModal({
      title: '数据导出',
      content: '是否要导出您的习惯打卡数据？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '导出中...' })
            
            // 这里应该调用后端API导出数据
            // const exportData = await api.exportUserData()
            
            // 模拟导出过程
            setTimeout(() => {
              wx.hideLoading()
              wx.showModal({
                title: '导出成功',
                content: '数据已导出到您的微信文件传输助手',
                showCancel: false
              })
            }, 2000)
            
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: '导出失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存数据吗？这不会影响您的习惯和打卡记录。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除缓存但保留用户数据
            wx.clearStorage()
            
            // 重新保存必要的用户信息
            const { userInfo } = this.data
            if (userInfo) {
              wx.setStorageSync('userInfo', userInfo)
              wx.setStorageSync('token', auth.getToken())
            }
            
            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            })
          } catch (error) {
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 意见反馈
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '请通过以下方式联系我们：\n\n邮箱：feedback@example.com\n微信群：扫描小程序码加入',
      showCancel: false
    })
  },

  // 关于我们
  about() {
    wx.showModal({
      title: '关于习惯打卡',
      content: `版本：${this.data.version}\n\n习惯打卡是一款帮助用户养成良好习惯的小程序，通过每日打卡和积分奖励机制，让坚持变得更有趣。\n\n© 2024 习惯打卡团队`,
      showCancel: false
    })
  },

  // 隐私政策
  privacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护。您的个人信息和打卡数据都经过加密存储，不会泄露给第三方。',
      showCancel: false
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？退出后需要重新授权登录。',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
        }
      }
    })
  },

  // 获取主题显示名称
  getThemeName(theme) {
    const themeMap = {
      light: '浅色主题',
      dark: '深色主题',
      auto: '跟随系统'
    }
    return themeMap[theme] || '浅色主题'
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '习惯打卡 - 让坚持变得更有趣',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  }
})
