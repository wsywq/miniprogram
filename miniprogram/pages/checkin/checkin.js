// pages/checkin/checkin.js - 打卡详情页面
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')
const dateUtils = require('../../utils/date.js')

Page({
  data: {
    habitId: null,
    habit: null,
    checkins: [],
    currentMonth: '',
    calendar: [],
    todayCheckin: null,
    streakDays: 0,
    completionRate: 0,
    loading: true,
    showCheckinModal: false,
    checkinForm: {
      note: '',
      image: ''
    }
  },

  onLoad(options) {
    if (options.habitId) {
      this.setData({ habitId: options.habitId })
      this.loadData()
    }
  },

  onShow() {
    // 从其他页面返回时刷新数据
    if (this.data.habitId) {
      this.loadTodayCheckin()
    }
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
      
      const currentMonth = dateUtils.format(new Date(), 'YYYY-MM')
      this.setData({ currentMonth })
      
      // 并行加载数据
      await Promise.all([
        this.loadHabitInfo(),
        this.loadMonthCheckins(),
        this.loadTodayCheckin()
      ])
      
      this.generateCalendar()
      this.calculateStats()
      
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

  // 加载习惯信息
  async loadHabitInfo() {
    const habit = await api.get(`/habits/${this.data.habitId}`)
    this.setData({ habit })
    
    wx.setNavigationBarTitle({
      title: habit.name
    })
  },

  // 加载本月打卡记录
  async loadMonthCheckins() {
    const { start, end } = dateUtils.getMonthRange()
    const checkins = await api.getCheckins(this.data.habitId, start, end)
    
    // 转换为以日期为key的对象
    const checkinsMap = {}
    checkins.forEach(checkin => {
      checkinsMap[checkin.checkin_date] = checkin
    })
    
    this.setData({ 
      checkins: checkinsMap,
      streakDays: this.calculateStreakDays(checkins)
    })
  },

  // 加载今日打卡
  async loadTodayCheckin() {
    const today = dateUtils.today()
    const todayCheckin = this.data.checkins[today] || null
    this.setData({ todayCheckin })
  },

  // 生成日历
  generateCalendar() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    const calendar = dateUtils.generateCalendar(year, month)
    
    // 为每个日期添加打卡状态
    calendar.forEach(week => {
      week.forEach(day => {
        if (day) {
          const checkin = this.data.checkins[day.fullDate]
          day.hasCheckin = !!checkin
          day.checkinData = checkin
        }
      })
    })
    
    this.setData({ calendar })
  },

  // 计算统计数据
  calculateStats() {
    const { checkins } = this.data
    const { start, end } = dateUtils.getMonthRange()
    const totalDays = dateUtils.daysBetween(start, end) + 1
    const checkinDays = Object.keys(checkins).length
    const completionRate = Math.round((checkinDays / totalDays) * 100)
    
    this.setData({ completionRate })
  },

  // 计算连续打卡天数
  calculateStreakDays(checkins) {
    if (!checkins.length) return 0
    
    // 按日期排序
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

  // 显示打卡弹窗
  showCheckinModal() {
    if (this.data.todayCheckin) {
      wx.showToast({
        title: '今日已打卡',
        icon: 'none'
      })
      return
    }
    
    this.setData({ 
      showCheckinModal: true,
      checkinForm: { note: '', image: '' }
    })
  },

  // 隐藏打卡弹窗
  hideCheckinModal() {
    this.setData({ showCheckinModal: false })
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({
      'checkinForm.note': e.detail.value
    })
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      const tempFilePath = res.tempFilePaths[0]
      
      // 上传图片
      wx.showLoading({ title: '上传中...' })
      const imageUrl = await api.uploadFile(tempFilePath)
      
      this.setData({
        'checkinForm.image': imageUrl
      })
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('选择图片失败:', error)
    }
  },

  // 删除图片
  removeImage() {
    this.setData({
      'checkinForm.image': ''
    })
  },

  // 确认打卡
  async confirmCheckin() {
    try {
      wx.showLoading({ title: '打卡中...' })
      
      const checkinData = {
        habit_id: this.data.habitId,
        checkin_date: dateUtils.today(),
        note: this.data.checkinForm.note,
        image: this.data.checkinForm.image
      }
      
      const checkin = await api.createCheckin(checkinData)
      
      // 更新本地数据
      const checkins = { ...this.data.checkins }
      checkins[dateUtils.today()] = checkin
      
      this.setData({
        checkins,
        todayCheckin: checkin,
        showCheckinModal: false,
        streakDays: this.data.streakDays + 1
      })
      
      this.generateCalendar()
      this.calculateStats()
      
      wx.hideLoading()
      wx.showToast({
        title: '打卡成功！',
        icon: 'success'
      })
      
      // 显示积分奖励
      this.showPointsReward()
      
    } catch (error) {
      wx.hideLoading()
      console.error('打卡失败:', error)
      wx.showToast({
        title: error.message || '打卡失败',
        icon: 'none'
      })
    }
  },

  // 显示积分奖励
  showPointsReward() {
    let points = 10
    const { streakDays } = this.data
    
    if (streakDays % 7 === 0) points += 50
    if (streakDays % 30 === 0) points += 200
    
    wx.showModal({
      title: '打卡成功！',
      content: `获得 ${points} 积分${streakDays % 7 === 0 ? '\n连续7天额外奖励！' : ''}`,
      showCancel: false
    })
  },

  // 点击日历日期
  onDateTap(e) {
    const { date } = e.currentTarget.dataset
    if (!date || !date.hasCheckin) return
    
    const checkin = date.checkinData
    
    wx.showModal({
      title: `${date.date}日打卡记录`,
      content: `打卡时间: ${dateUtils.format(checkin.checkin_time, 'HH:mm')}\n${checkin.note ? '备注: ' + checkin.note : ''}`,
      showCancel: false
    })
  },

  // 补卡
  async makeupCheckin(e) {
    const { date } = e.currentTarget.dataset
    
    const res = await wx.showModal({
      title: '补卡确认',
      content: `补卡 ${date.fullDate} 需要消耗 20 积分，确定要补卡吗？`
    })
    
    if (!res.confirm) return
    
    try {
      wx.showLoading({ title: '补卡中...' })
      
      const checkin = await api.makeupCheckin(this.data.habitId, date.fullDate)
      
      // 更新本地数据
      const checkins = { ...this.data.checkins }
      checkins[date.fullDate] = checkin
      
      this.setData({ checkins })
      this.generateCalendar()
      this.calculateStats()
      
      wx.hideLoading()
      wx.showToast({
        title: '补卡成功',
        icon: 'success'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('补卡失败:', error)
      wx.showToast({
        title: error.message || '补卡失败',
        icon: 'none'
      })
    }
  },

  // 跳转到编辑页面
  goToEdit() {
    wx.navigateTo({
      url: `/pages/habit-form/habit-form?id=${this.data.habitId}`
    })
  }
})
