// pages/statistics/statistics.js - 统计分析页面
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')
const dateUtils = require('../../utils/date.js')

Page({
  data: {
    period: 'month', // week, month, year
    periods: [
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'year', label: '本年' }
    ],
    stats: {
      totalHabits: 0,
      totalCheckins: 0,
      completionRate: 0,
      streakDays: 0,
      bestStreak: 0,
      totalPoints: 0
    },
    habitStats: [],
    trendData: [],
    categoryStats: [],
    loading: true,
    currentDate: ''
  },

  onLoad() {
    this.setData({
      currentDate: dateUtils.format(new Date(), 'YYYY-MM-DD')
    })
    this.loadData()
  },

  onShow() {
    this.loadData()
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
      
      // 并行加载各种统计数据
      await Promise.all([
        this.loadOverallStats(),
        this.loadHabitStats(),
        this.loadTrendData(),
        this.loadCategoryStats()
      ])
      
    } catch (error) {
      console.error('加载统计数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载总体统计
  async loadOverallStats() {
    const stats = await api.getStatistics(this.data.period)
    this.setData({ stats })
  },

  // 加载习惯统计
  async loadHabitStats() {
    const habits = await api.getHabits()
    const habitStats = []
    
    for (const habit of habits) {
      const { start, end } = this.getPeriodRange()
      const checkins = await api.getCheckins(habit.id, start, end)
      
      const totalDays = dateUtils.daysBetween(start, end) + 1
      const checkinDays = checkins.length
      const completionRate = Math.round((checkinDays / totalDays) * 100)
      const streakDays = this.calculateStreakDays(checkins)
      
      habitStats.push({
        ...habit,
        checkinDays,
        totalDays,
        completionRate,
        streakDays
      })
    }
    
    // 按完成率排序
    habitStats.sort((a, b) => b.completionRate - a.completionRate)
    
    this.setData({ habitStats })
  },

  // 加载趋势数据
  async loadTrendData() {
    const { start, end } = this.getPeriodRange()
    const dates = dateUtils.getDateRange(start, end)
    const trendData = []
    
    for (const date of dates) {
      const dayCheckins = await api.getCheckins(null, date, date)
      trendData.push({
        date,
        count: dayCheckins.length,
        label: this.formatDateLabel(date)
      })
    }
    
    this.setData({ trendData })
  },

  // 加载分类统计
  async loadCategoryStats() {
    const habits = await api.getHabits()
    const categoryMap = {}
    
    for (const habit of habits) {
      const category = habit.category || 'other'
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          name: this.getCategoryName(category),
          count: 0,
          totalCheckins: 0,
          completionRate: 0
        }
      }
      
      categoryMap[category].count++
      
      // 计算该分类的打卡数据
      const { start, end } = this.getPeriodRange()
      const checkins = await api.getCheckins(habit.id, start, end)
      categoryMap[category].totalCheckins += checkins.length
    }
    
    // 计算完成率
    const totalDays = dateUtils.daysBetween(...Object.values(this.getPeriodRange())) + 1
    Object.values(categoryMap).forEach(cat => {
      cat.completionRate = Math.round((cat.totalCheckins / (cat.count * totalDays)) * 100)
    })
    
    const categoryStats = Object.values(categoryMap)
      .sort((a, b) => b.completionRate - a.completionRate)
    
    this.setData({ categoryStats })
  },

  // 获取时间段范围
  getPeriodRange() {
    const now = new Date()
    
    switch (this.data.period) {
      case 'week':
        return dateUtils.getWeekRange(now)
      case 'month':
        return dateUtils.getMonthRange(now)
      case 'year':
        const year = now.getFullYear()
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`
        }
      default:
        return dateUtils.getMonthRange(now)
    }
  },

  // 计算连续打卡天数
  calculateStreakDays(checkins) {
    if (!checkins.length) return 0
    
    const sortedCheckins = checkins.sort((a, b) => 
      new Date(b.checkin_date) - new Date(a.checkin_date)
    )
    
    let streak = 0
    let currentDate = new Date()
    
    for (const checkin of sortedCheckins) {
      const checkinDate = new Date(checkin.checkin_date)
      const diffDays = dateUtils.daysBetween(checkinDate, currentDate)
      
      if (diffDays <= 1) {
        streak++
        currentDate = checkinDate
      } else {
        break
      }
    }
    
    return streak
  },

  // 格式化日期标签
  formatDateLabel(date) {
    const d = new Date(date)
    const { period } = this.data
    
    if (period === 'week') {
      return dateUtils.getWeekDay(d)
    } else if (period === 'month') {
      return d.getDate().toString()
    } else {
      return `${d.getMonth() + 1}月`
    }
  },

  // 获取分类名称
  getCategoryName(category) {
    const categoryMap = {
      health: '健康',
      study: '学习',
      work: '工作',
      life: '生活',
      sport: '运动',
      hobby: '爱好',
      other: '其他'
    }
    return categoryMap[category] || '其他'
  },

  // 切换时间段
  onPeriodChange(e) {
    const { value } = e.detail
    const period = this.data.periods[value]
    
    this.setData({ period: period.value })
    this.loadData()
  },

  // 跳转到习惯详情
  goToHabitDetail(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkin/checkin?habitId=${habitId}`
    })
  },

  // 获取完成率颜色
  getCompletionColor(rate) {
    if (rate >= 80) return '#4CAF50'
    if (rate >= 60) return '#FF9800'
    return '#f44336'
  },

  // 获取完成率等级
  getCompletionLevel(rate) {
    if (rate >= 90) return '优秀'
    if (rate >= 80) return '良好'
    if (rate >= 60) return '一般'
    return '需努力'
  },

  // 获取时间段标题
  getPeriodTitle() {
    const { period } = this.data
    const periodMap = {
      week: '本周统计',
      month: '本月统计',
      year: '本年统计'
    }
    return periodMap[period] || '统计分析'
  },

  // 分享统计数据
  onShareAppMessage() {
    const { stats } = this.data
    return {
      title: `我的习惯打卡统计：完成率${stats.completionRate}%，连续${stats.streakDays}天！`,
      path: '/pages/index/index'
    }
  }
})
