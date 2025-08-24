// utils/storage.js - 本地存储管理
class StorageManager {
  constructor() {
    this.prefix = 'habit_tracker_'
  }

  // 生成带前缀的key
  getKey(key) {
    return this.prefix + key
  }

  // 设置数据
  set(key, value) {
    try {
      const fullKey = this.getKey(key)
      wx.setStorageSync(fullKey, value)
      return true
    } catch (error) {
      console.error('存储数据失败:', error)
      return false
    }
  }

  // 获取数据
  get(key, defaultValue = null) {
    try {
      const fullKey = this.getKey(key)
      const value = wx.getStorageSync(fullKey)
      return value !== '' ? value : defaultValue
    } catch (error) {
      console.error('获取数据失败:', error)
      return defaultValue
    }
  }

  // 删除数据
  remove(key) {
    try {
      const fullKey = this.getKey(key)
      wx.removeStorageSync(fullKey)
      return true
    } catch (error) {
      console.error('删除数据失败:', error)
      return false
    }
  }

  // 清空所有数据
  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }

  // 获取存储信息
  getStorageInfo() {
    try {
      return wx.getStorageInfoSync()
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return null
    }
  }

  // 检查存储空间
  checkStorageSpace() {
    const info = this.getStorageInfo()
    if (info) {
      const usedMB = (info.currentSize / 1024).toFixed(2)
      const limitMB = (info.limitSize / 1024).toFixed(2)
      const usagePercent = ((info.currentSize / info.limitSize) * 100).toFixed(1)
      
      console.log(`存储使用情况: ${usedMB}MB / ${limitMB}MB (${usagePercent}%)`)
      
      // 如果使用超过80%，提醒清理
      if (usagePercent > 80) {
        wx.showModal({
          title: '存储空间不足',
          content: '本地存储空间使用过多，建议清理部分数据',
          showCancel: false
        })
      }
      
      return {
        used: usedMB,
        limit: limitMB,
        percentage: usagePercent
      }
    }
    return null
  }
}

// 缓存管理器
class CacheManager extends StorageManager {
  constructor() {
    super()
    this.cachePrefix = 'cache_'
    this.defaultTTL = 30 * 60 * 1000 // 30分钟
  }

  // 设置缓存（带过期时间）
  setCache(key, value, ttl = this.defaultTTL) {
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl
    }
    return this.set(this.cachePrefix + key, cacheData)
  }

  // 获取缓存
  getCache(key) {
    const cacheData = this.get(this.cachePrefix + key)
    
    if (!cacheData) {
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - cacheData.timestamp > cacheData.ttl) {
      // 缓存过期，删除并返回null
      this.remove(this.cachePrefix + key)
      return null
    }

    return cacheData.value
  }

  // 清理过期缓存
  clearExpiredCache() {
    try {
      const info = wx.getStorageInfoSync()
      const now = Date.now()
      let clearedCount = 0

      info.keys.forEach(key => {
        if (key.startsWith(this.getKey(this.cachePrefix))) {
          try {
            const cacheData = wx.getStorageSync(key)
            if (cacheData && now - cacheData.timestamp > cacheData.ttl) {
              wx.removeStorageSync(key)
              clearedCount++
            }
          } catch (error) {
            console.error('清理缓存失败:', error)
          }
        }
      })

      console.log(`清理了 ${clearedCount} 个过期缓存`)
      return clearedCount
    } catch (error) {
      console.error('清理过期缓存失败:', error)
      return 0
    }
  }
}

// 用户偏好设置管理
class PreferenceManager extends StorageManager {
  constructor() {
    super()
    this.prefKey = 'preferences'
    this.defaultPreferences = {
      theme: 'light', // light, dark
      notifications: true,
      reminderTime: '09:00',
      weekStart: 1, // 1=Monday, 0=Sunday
      language: 'zh-CN',
      autoSync: true,
      soundEnabled: true,
      vibrationEnabled: true
    }
  }

  // 获取所有偏好设置
  getPreferences() {
    const prefs = this.get(this.prefKey, {})
    return { ...this.defaultPreferences, ...prefs }
  }

  // 设置偏好
  setPreference(key, value) {
    const prefs = this.getPreferences()
    prefs[key] = value
    return this.set(this.prefKey, prefs)
  }

  // 获取单个偏好
  getPreference(key) {
    const prefs = this.getPreferences()
    return prefs[key]
  }

  // 重置为默认设置
  resetPreferences() {
    return this.set(this.prefKey, this.defaultPreferences)
  }
}

// 导出实例
const storage = new StorageManager()
const cache = new CacheManager()
const preferences = new PreferenceManager()

module.exports = {
  storage,
  cache,
  preferences
}
