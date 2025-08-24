// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://your-api-domain.com/api', // 替换为实际API地址
    version: '1.0.0'
  },

  onLaunch() {
    console.log('小程序启动')
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 检查小程序更新
    this.checkForUpdate()
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  },

  // 检查小程序更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本')
        }
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(() => {
        console.log('新版本下载失败')
      })
    }
  },

  // 全局错误处理
  onError(error) {
    console.error('小程序错误:', error)
    
    // 可以在这里上报错误到服务器
    // this.reportError(error)
  }
})
