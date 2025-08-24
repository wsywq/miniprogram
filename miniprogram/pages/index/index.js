// pages/index/index.js - 首页
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')
const dateUtils = require('../../utils/date.js')

Page({
  data: {
    userInfo: null,
    habits: [],
    todayCheckins: {},
    loading: true,
    refreshing: false,
    todayDate: '',
    greeting: ''
  },

  onLoad() {
    this.setData({
      todayDate: dateUtils.today()
    })
    this.setGreeting()
  },

  onShow() {
    this.loadData()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    })
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好'
    
    if (hour >= 12 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18) {
      greeting = '晚上好'
    }
    
    this.setData({ greeting })
  },

  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true })
      
      // 确保用户已登录
      await auth.ensureLogin()
      
      // 并行加载数据
      const [userInfo, habits, todayCheckins] = await Promise.all([
        this.loadUserInfo(),
        this.loadHabits(),
        this.loadTodayCheckins()
      ])
      
      this.setData({
        userInfo,
        habits,
        todayCheckins,
        loading: false
      })
    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      return await api.getUserInfo()
    } catch (error) {
      return auth.getUserInfo()
    }
  },

  // 加载习惯列表
  async loadHabits() {
    return await api.getHabits()
  },

  // 加载今日打卡记录
  async loadTodayCheckins() {
    const today = dateUtils.today()
    const checkins = await api.getCheckins(null, today, today)
    
    // 转换为以habit_id为key的对象
    const checkinsMap = {}
    checkins.forEach(checkin => {
      checkinsMap[checkin.habit_id] = checkin
    })
    
    return checkinsMap
  },

  // 快速打卡
  async quickCheckin(e) {
    const { habitId } = e.currentTarget.dataset
    
    try {
      wx.showLoading({ title: '打卡中...' })
      
      const checkinData = {
        habit_id: habitId,
        checkin_date: dateUtils.today(),
        note: ''
      }
      
      const checkin = await api.createCheckin(checkinData)
      
      // 更新本地数据
      const todayCheckins = { ...this.data.todayCheckins }
      todayCheckins[habitId] = checkin
      
      this.setData({ todayCheckins })
      
      wx.hideLoading()
      wx.showToast({
        title: '打卡成功！',
        icon: 'success'
      })
      
      // 显示获得积分动画
      this.showPointsAnimation(10)
      
    } catch (error) {
      wx.hideLoading()
      console.error('打卡失败:', error)
      wx.showToast({
        title: error.message || '打卡失败',
        icon: 'none'
      })
    }
  },

  // 显示积分获得动画
  showPointsAnimation(points) {
    wx.showToast({
      title: `+${points} 积分`,
      icon: 'success',
      duration: 1500
    })
  },

  // 跳转到打卡详情页
  goToCheckin(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkin/checkin?habitId=${habitId}`
    })
  },

  // 跳转到创建习惯页面
  goToCreateHabit() {
    wx.navigateTo({
      url: '/pages/habit-form/habit-form'
    })
  },

  // 跳转到习惯编辑页面
  goToEditHabit(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/habit-form/habit-form?id=${habitId}`
    })
  },

  // 长按习惯卡片
  onHabitLongPress(e) {
    const { habitId, habitName } = e.currentTarget.dataset
    
    wx.showActionSheet({
      itemList: ['编辑习惯', '查看详情', '暂停习惯'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.goToEditHabit(e)
            break
          case 1:
            this.goToCheckin(e)
            break
          case 2:
            this.pauseHabit(habitId, habitName)
            break
        }
      }
    })
  },

  // 暂停习惯
  async pauseHabit(habitId, habitName) {
    try {
      const res = await wx.showModal({
        title: '暂停习惯',
        content: `确定要暂停"${habitName}"吗？暂停后将不会显示在首页。`
      })
      
      if (res.confirm) {
        await api.updateHabit(habitId, { status: 'paused' })
        
        // 从列表中移除
        const habits = this.data.habits.filter(habit => habit.id !== habitId)
        this.setData({ habits })
        
        wx.showToast({
          title: '已暂停',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('暂停习惯失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 获取习惯完成状态
  getHabitStatus(habitId) {
    return this.data.todayCheckins[habitId] ? 'completed' : 'pending'
  },

  // 获取连续打卡天数
  getStreakDays(habit) {
    return habit.streak_days || 0
  },

  // 格式化连续天数显示
  formatStreakText(days) {
    if (days === 0) return '开始打卡'
    return `连续${days}天`
  }
})
