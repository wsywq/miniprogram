// pages/habit-form/habit-form.js - 习惯创建/编辑页面
const { api } = require('../../utils/api.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    isEdit: false,
    habitId: null,
    formData: {
      name: '',
      description: '',
      icon: '📝',
      category: 'life',
      frequency: 'daily',
      reminder_time: '09:00'
    },
    categories: [
      { value: 'health', label: '健康', icon: '💪' },
      { value: 'study', label: '学习', icon: '📚' },
      { value: 'work', label: '工作', icon: '💼' },
      { value: 'life', label: '生活', icon: '🏠' },
      { value: 'sport', label: '运动', icon: '🏃' },
      { value: 'hobby', label: '爱好', icon: '🎨' }
    ],
    frequencies: [
      { value: 'daily', label: '每天' },
      { value: 'weekly', label: '每周' },
      { value: 'custom', label: '自定义' }
    ],
    icons: [
      '📝', '💪', '📚', '💼', '🏃', '🎨', '🍎', '💧', 
      '😴', '🧘', '📖', '✍️', '🎵', '🌱', '🏋️', '🚶'
    ],
    loading: false,
    showIconPicker: false,
    showTimePicker: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        isEdit: true,
        habitId: options.id
      })
      this.loadHabitData(options.id)
    }
    
    wx.setNavigationBarTitle({
      title: options.id ? '编辑习惯' : '创建习惯'
    })
  },

  // 加载习惯数据（编辑模式）
  async loadHabitData(habitId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const habit = await api.get(`/habits/${habitId}`)
      
      this.setData({
        formData: {
          name: habit.name || '',
          description: habit.description || '',
          icon: habit.icon || '📝',
          category: habit.category || 'life',
          frequency: habit.frequency || 'daily',
          reminder_time: habit.reminder_time || '09:00'
        }
      })
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('加载习惯数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 输入框变化
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 选择分类
  onCategoryChange(e) {
    const { value } = e.detail
    const category = this.data.categories[value]
    
    this.setData({
      'formData.category': category.value,
      'formData.icon': category.icon // 自动设置对应图标
    })
  },

  // 选择频率
  onFrequencyChange(e) {
    const { value } = e.detail
    const frequency = this.data.frequencies[value]
    
    this.setData({
      'formData.frequency': frequency.value
    })
  },

  // 显示图标选择器
  showIconPicker() {
    this.setData({ showIconPicker: true })
  },

  // 选择图标
  selectIcon(e) {
    const { icon } = e.currentTarget.dataset
    
    this.setData({
      'formData.icon': icon,
      showIconPicker: false
    })
  },

  // 隐藏图标选择器
  hideIconPicker() {
    this.setData({ showIconPicker: false })
  },

  // 显示时间选择器
  showTimePicker() {
    this.setData({ showTimePicker: true })
  },

  // 时间选择变化
  onTimeChange(e) {
    const { value } = e.detail
    
    this.setData({
      'formData.reminder_time': value,
      showTimePicker: false
    })
  },

  // 取消时间选择
  onTimeCancel() {
    this.setData({ showTimePicker: false })
  },

  // 表单验证
  validateForm() {
    const { name } = this.data.formData
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入习惯名称',
        icon: 'none'
      })
      return false
    }
    
    if (name.length > 20) {
      wx.showToast({
        title: '习惯名称不能超过20个字符',
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 保存习惯
  async saveHabit() {
    if (!this.validateForm()) return
    
    try {
      await auth.ensureLogin()
      
      this.setData({ loading: true })
      wx.showLoading({ title: '保存中...' })
      
      const { formData, isEdit, habitId } = this.data
      
      if (isEdit) {
        await api.updateHabit(habitId, formData)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        await api.createHabit(formData)
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        })
      }
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('保存习惯失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  // 删除习惯
  async deleteHabit() {
    const res = await wx.showModal({
      title: '删除确认',
      content: '确定要删除这个习惯吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff4444'
    })
    
    if (!res.confirm) return
    
    try {
      wx.showLoading({ title: '删除中...' })
      
      await api.deleteHabit(this.data.habitId)
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      console.error('删除习惯失败:', error)
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取分类显示文本
  getCategoryLabel(value) {
    const category = this.data.categories.find(cat => cat.value === value)
    return category ? category.label : '生活'
  },

  // 获取频率显示文本
  getFrequencyLabel(value) {
    const frequency = this.data.frequencies.find(freq => freq.value === value)
    return frequency ? frequency.label : '每天'
  }
})
