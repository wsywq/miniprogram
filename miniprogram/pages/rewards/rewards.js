// pages/rewards/rewards.js - 积分奖励页面
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    userInfo: null,
    rewards: [],
    pointRecords: [],
    currentTab: 'rewards', // rewards, records
    loading: true,
    exchanging: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true })
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.currentTab === 'records' && this.data.hasMore) {
      this.loadMoreRecords()
    }
  },

  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true })
      
      await auth.ensureLogin()
      
      await Promise.all([
        this.loadUserInfo(),
        this.loadRewards(),
        this.loadPointRecords()
      ])
      
    } catch (error) {
      console.error('加载数据失败:', error)
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

  // 加载奖励列表
  async loadRewards() {
    const rewards = await api.getRewards()
    this.setData({ rewards })
  },

  // 加载积分记录
  async loadPointRecords() {
    const records = await api.getPointRecords(1, 20)
    this.setData({ 
      pointRecords: records,
      page: 1,
      hasMore: records.length === 20
    })
  },

  // 加载更多记录
  async loadMoreRecords() {
    try {
      const nextPage = this.data.page + 1
      const records = await api.getPointRecords(nextPage, 20)
      
      this.setData({
        pointRecords: [...this.data.pointRecords, ...records],
        page: nextPage,
        hasMore: records.length === 20
      })
    } catch (error) {
      console.error('加载更多记录失败:', error)
    }
  },

  // 切换标签
  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ currentTab: tab })
  },

  // 兑换奖励
  async exchangeReward(e) {
    const { rewardId, rewardName, points } = e.currentTarget.dataset
    
    // 检查积分是否足够
    if (this.data.userInfo.points < points) {
      wx.showToast({
        title: '积分不足',
        icon: 'none'
      })
      return
    }
    
    const res = await wx.showModal({
      title: '确认兑换',
      content: `确定要用 ${points} 积分兑换"${rewardName}"吗？`
    })
    
    if (!res.confirm) return
    
    try {
      this.setData({ exchanging: true })
      wx.showLoading({ title: '兑换中...' })
      
      await api.exchangeReward(rewardId)
      
      // 更新用户积分
      const userInfo = { ...this.data.userInfo }
      userInfo.points -= points
      this.setData({ userInfo })
      
      // 刷新积分记录
      await this.loadPointRecords()
      
      wx.hideLoading()
      wx.showModal({
        title: '兑换成功！',
        content: `恭喜您成功兑换"${rewardName}"！`,
        showCancel: false
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('兑换失败:', error)
      wx.showToast({
        title: error.message || '兑换失败',
        icon: 'none'
      })
    } finally {
      this.setData({ exchanging: false })
    }
  },

  // 获取奖励类型图标
  getRewardIcon(type) {
    const iconMap = {
      badge: '🏆',
      avatar: '🖼️',
      theme: '🎨',
      title: '👑',
      coupon: '🎫',
      gift: '🎁'
    }
    return iconMap[type] || '🎁'
  },

  // 获取积分记录图标
  getRecordIcon(type, reason) {
    if (type === 'earn') {
      if (reason.includes('daily')) return '📅'
      if (reason.includes('streak')) return '🔥'
      if (reason.includes('bonus')) return '🎉'
      return '➕'
    } else {
      if (reason.includes('exchange')) return '🛒'
      if (reason.includes('makeup')) return '⏰'
      return '➖'
    }
  },

  // 格式化积分显示
  formatPoints(points, type) {
    return type === 'earn' ? `+${points}` : `-${points}`
  },

  // 格式化时间显示
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return diffMinutes <= 0 ? '刚刚' : `${diffMinutes}分钟前`
      }
      return `${diffHours}小时前`
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString()
    }
  },

  // 获取积分等级
  getPointsLevel(points) {
    if (points >= 10000) return { level: 'Diamond', name: '钻石会员', color: '#E91E63' }
    if (points >= 5000) return { level: 'Gold', name: '黄金会员', color: '#FF9800' }
    if (points >= 2000) return { level: 'Silver', name: '白银会员', color: '#9E9E9E' }
    if (points >= 500) return { level: 'Bronze', name: '青铜会员', color: '#795548' }
    return { level: 'Newbie', name: '新手', color: '#607D8B' }
  },

  // 分享积分
  onShareAppMessage() {
    const { userInfo } = this.data
    const level = this.getPointsLevel(userInfo.points)
    
    return {
      title: `我在习惯打卡已获得${userInfo.points}积分，达到${level.name}等级！`,
      path: '/pages/index/index'
    }
  }
})
