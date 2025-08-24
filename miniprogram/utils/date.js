// utils/date.js - 日期处理工具
class DateUtils {
  constructor() {
    this.weekDays = ['日', '一', '二', '三', '四', '五', '六']
    this.months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  }

  // 格式化日期
  format(date, pattern = 'YYYY-MM-DD') {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')

    return pattern
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
  }

  // 获取今天的日期字符串
  today() {
    return this.format(new Date(), 'YYYY-MM-DD')
  }

  // 获取昨天的日期
  yesterday() {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return this.format(date, 'YYYY-MM-DD')
  }

  // 获取明天的日期
  tomorrow() {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return this.format(date, 'YYYY-MM-DD')
  }

  // 获取本周的开始和结束日期
  getWeekRange(date = new Date(), weekStart = 1) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : weekStart)
    
    const startDate = new Date(d.setDate(diff))
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    return {
      start: this.format(startDate, 'YYYY-MM-DD'),
      end: this.format(endDate, 'YYYY-MM-DD')
    }
  }

  // 获取本月的开始和结束日期
  getMonthRange(date = new Date()) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = d.getMonth()

    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    return {
      start: this.format(startDate, 'YYYY-MM-DD'),
      end: this.format(endDate, 'YYYY-MM-DD')
    }
  }

  // 获取日期范围内的所有日期
  getDateRange(startDate, endDate) {
    const dates = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    while (start <= end) {
      dates.push(this.format(start, 'YYYY-MM-DD'))
      start.setDate(start.getDate() + 1)
    }

    return dates
  }

  // 计算两个日期之间的天数差
  daysBetween(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const timeDiff = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  // 判断是否是今天
  isToday(date) {
    return this.format(date, 'YYYY-MM-DD') === this.today()
  }

  // 判断是否是昨天
  isYesterday(date) {
    return this.format(date, 'YYYY-MM-DD') === this.yesterday()
  }

  // 判断是否是本周
  isThisWeek(date) {
    const weekRange = this.getWeekRange()
    const dateStr = this.format(date, 'YYYY-MM-DD')
    return dateStr >= weekRange.start && dateStr <= weekRange.end
  }

  // 判断是否是本月
  isThisMonth(date) {
    const d = new Date(date)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }

  // 获取友好的时间显示
  getRelativeTime(date) {
    const now = new Date()
    const target = new Date(date)
    const diff = now.getTime() - target.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      if (this.isYesterday(date)) return '昨天'
      if (days < 7) return `${days}天前`
      return this.format(date, 'MM-DD')
    }

    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  // 获取星期几
  getWeekDay(date) {
    const d = new Date(date)
    return this.weekDays[d.getDay()]
  }

  // 获取月份名称
  getMonthName(date) {
    const d = new Date(date)
    return this.months[d.getMonth()]
  }

  // 生成日历数据
  generateCalendar(year, month) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const calendar = []
    let week = []

    // 填充月初空白
    for (let i = 0; i < firstDayWeek; i++) {
      week.push(null)
    }

    // 填充月份日期
    for (let day = 1; day <= daysInMonth; day++) {
      week.push({
        date: day,
        fullDate: this.format(new Date(year, month, day), 'YYYY-MM-DD'),
        isToday: this.isToday(new Date(year, month, day)),
        isWeekend: new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
      })

      if (week.length === 7) {
        calendar.push(week)
        week = []
      }
    }

    // 填充月末空白
    while (week.length < 7) {
      week.push(null)
    }
    if (week.some(day => day !== null)) {
      calendar.push(week)
    }

    return calendar
  }

  // 解析时间字符串 (HH:mm)
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return { hours, minutes }
  }

  // 格式化时间 (HH:mm)
  formatTime(hours, minutes) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // 检查时间是否在范围内
  isTimeInRange(time, startTime, endTime) {
    const timeMinutes = this.timeToMinutes(time)
    const startMinutes = this.timeToMinutes(startTime)
    const endMinutes = this.timeToMinutes(endTime)

    if (startMinutes <= endMinutes) {
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes
    } else {
      // 跨天的情况
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes
    }
  }

  // 时间转换为分钟数
  timeToMinutes(timeStr) {
    const { hours, minutes } = this.parseTime(timeStr)
    return hours * 60 + minutes
  }

  // 分钟数转换为时间
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return this.formatTime(hours, mins)
  }
}

module.exports = new DateUtils()
