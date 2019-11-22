// pages/chat/chat.js
const app = getApp()
var websocket = require('../../utils/websocket.js');
var utils = require('../../utils/util.js');
var page = 1;
var hadLastPage = false;
var localsrcs = [];
var cloundLists = [];
var timer = null;
Page({
  /**
   * 页面的初始数据
   */
  data: {
    items: [],
    newslist: [],
    userInfo: {},
    scrollTop: 0,
    increase: false, //图片添加区域隐藏
    aniStyle: true, //动画效果
    message: "",
    previewImgList: [],
    ip: "",
    sceneid: '',
    itemsIndex: 0,
    showId: '',
    notScanCode: true,
    state: "-1"
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    //this.onWebsocket();
  },
  onShow: function() {
    console.log('onShow');
    console.log(app.globalData.userInfo);

    page = 1;
    hadLastPage = false;

    var connectData = utils.getStor('connectData') || '';
    if (connectData == '' || connectData == undefined) {
      this.setData({
        items: []
      });
      if (this.data.notScanCode) {
        wx.showToast({
          title: '登录已过期，请重新扫码',
          icon: "none",
          duration: 2000
        });
      }
      this.setData({
        notScanCode: true
      });
      return;
    }
    this.setData({
      ip: connectData
    });

    var that = this;
    websocket.connect(this.data.ip, function(res) {
      console.log("接受服务器返回来的消息");
      console.log(res);

      // 服务器主动断开连接
      if (res.data == "_sclose_") {
        clearInterval(timer);

      } else if (res.data == "ok") {
        console.log("心跳发送成功");

      } else {
        var jsonObj = JSON.parse(res.data);
        if (jsonObj.command == undefined) {
          //下载中
          if (jsonObj.data.command == "_changresstate" && jsonObj.data.type == 2) {
            var id = jsonObj.data.id;
            var data = that.data.items;
            console.log(id);
            console.log(data);
            for (let i = 0; i < data.length; i++) {
              if (data[i].id == id) {
                var state = 'items[' + i + '].state';
                if (jsonObj.data.state == 1) {
                  setTimeout(function() {
                    that.setData({
                      [state]: jsonObj.data.state
                    });
                  }, 1500);
                } else {
                  that.setData({
                    [state]: jsonObj.data.state
                  });
                }
                break;
              }
            }
          }
        } else {
          if (jsonObj.command == "sendctrl") {
            if (jsonObj.result == "FAILED") {
              wx.showToast({
                title: jsonObj.message,
                icon: "none",
                duration: 2000
              })
            }
            return;
          }

          if (jsonObj.command == "login") {
            if (jsonObj.result == "SUCCESS") {
              // 5秒发送一次心跳
              timer = setInterval(function() {
                websocket.send("_m");
              }, 5000);

              that.getScenes();
            } else {
              wx.showToast({
                title: jsonObj.message,
                icon: "none",
                duration: 2000
              })
            }
          }
          if (jsonObj.command == "getsrc") {
            if (jsonObj.result == "SUCCESS") {
              var data = jsonObj.datas;
              // var data = app.globalData.scenesData;
              var item = page > 1 ? that.data.items : [];
              console.log(data);
              console.log(item);
              data.forEach((items, index, arr) => {
                // if (items.state == that.data.state || that.data.state == "-1") {
                item.push(items);
                // }
              });
              console.log(item);
              that.setData({
                items: item
              });
              if (data.length > 0) {
                page++;
              } else {
                hadLastPage = true;
              }
              wx.hideNavigationBarLoading();
              return;
            } else if (jsonObj.result == "FAILED") {
              wx.showToast({
                title: jsonObj.message,
                icon: "none",
                duration: 2000
              })
            }
          }

          //下载
          // if (jsonObj.command == "changresstate" && jsonObj.type == 2) {
          //   if (jsonObj.result == "SUCCESS") {
          //     var id = jsonObj.id;
          //     var data = that.data.items;
          //     console.log(data);
          //     for (let i = 0; i < data.length; i++) {
          //       if (data[i].id == id) {
          //         var state = 'items[' + i + '].state';
          //         that.setData({
          //           [state]: jsonObj.state
          //         });
          //       }
          //     }
          //   } else if (jsonObj.result == "FAILED") {
          //     wx.showToast({
          //       title: '下载失败，请联系工作人员',
          //       icon: "none",
          //       duration: 2000
          //     })
          //   }
          // }
        }
      }
    }, function(res) {
      websocket.send('{ "command": "login", "nickName": "' + app.globalData.userInfo.nickName + '", "avatarUrl": "' + app.globalData.userInfo.avatarUrl + '","code":"' + app.globalData.authcode + '","iv":"' + app.globalData.iv + '","encryptedData":"' + app.globalData.encryptedData + '" ,"roomcode":"' + app.globalData.roomcode + '"}');
    });
  },
  onHide: function() {
    console.log("onhide");
    clearInterval(timer);
    wx.closeSocket();
  },
  onUnload: function() {
    console.log("onUnload");
    clearInterval(timer);
    wx.closeSocket();
  },
  getScenes: function() {
    // 显示加载图标
    wx.showNavigationBarLoading();

    if (hadLastPage != false) {
      wx.hideNavigationBarLoading();
      wx.showToast({
        title: '没有加载的数据了',
      });
      return;
    }

    console.log('默认获取全部数据：');
    var data = {};
    data.command = "getsrc";
    data.type = "2";
    data.classify = "-1";
    data.state = "-1";
    data.current = page;
    data.size = 8;
    data.channel = app.globalData.channel;
    console.log(JSON.stringify(data));
    websocket.send(JSON.stringify(data));
  },
  // 选中场景
  chooseScenes: function(e) {
    var scenes = e.currentTarget.dataset.scenes;
    var itemsIndex = e.currentTarget.dataset.index;
    this.setData({
      itemsIndex: itemsIndex,
      showId: scenes.id
    });

    if (scenes.state == 0) {
      //未下载，先下载
      console.log("下载场景");
      var data = {};
      data.command = "changresstate";
      data.id = scenes.id;
      data.type = "2";

      // var state = 'items[' + itemsIndex + '].state';
      // this.setData({
      //   [state]: 2
      // });

      console.log(JSON.stringify(data));
      websocket.send(JSON.stringify(data));
    } else if (scenes.state == 1) {
      //已下载，就播放
      var data = {
        command: "sendctrl",
        v: "17",
        d: {
          k1: scenes.txtPath
        }
      };
      console.log("播放场景");
      console.log(JSON.stringify(data));
      websocket.send(JSON.stringify(data));
    } else {
      //下载中
      wx.showToast({
        title: '下载中，请稍后',
        icon: "none",
        duration: 2000
      })
    }
  },
  // 页面卸载
  onUnload() {
    wx.closeSocket();
    /*  wx.showToast({
        title: '连接已断开~',
        icon: "none",
        duration: 2000
      })*/
  },
  menuItemClick: function(res) {
    //获取点击事件的信息
    let clickInfo = res.detail.iteminfo
    console.log(clickInfo);
    // 根据不同类型进行判别处理
    //事件的处理 代码
    switch (clickInfo.id) {
      case "1":
        websocket.send('{ "command": "sendctrl","v":"46","d":{"k1":0,"k2":0}}');
        break;
      case "2":
        websocket.send('{ "command": "sendctrl","v":"46","d":{"k1":0,"k2":1}}');
        break;
      case "3":
        websocket.send('{ "command": "sendctrl","v":"47","d":{"k1":0,"k2":0}}');
        break;
      case "4":
        websocket.send('{ "command": "sendctrl","v":"47","d":{"k1":0,"k2":1}}');
        break;
      case "5":
        websocket.send('{ "command": "sendctrl","v":"43","d":{"k1":0,"k2":1}}');
        break;
      case "6":
        this.setData({
          notScanCode: false
        });
        wx.scanCode({
          success: (res) => {
            var arr = res.result.split(",");
            console.log(arr);
            if (arr.length > 1) {
              utils.setStor('connectData', arr[0]);
              wx.setStorageSync('roomcode', arr[1]);
              wx.setStorageSync('channel', arr[2]);
              app.globalData.roomcode = arr[1];
              app.globalData.channel = arr[2];
            } else {
              utils.setStor('connectData', arr);
              wx.setStorageSync('roomcode', '12345');
              app.globalData.roomcode = '12345';
              app.globalData.channel = '-1';
            }
            this.setData({
              connectData: utils.getStor('connectData')
            });
            this.onShow();
          },
          fail: (res) => {
            wx.showToast({
              title: '失败',
              icon: 'success',
              duration: 2000
            })
          },
          complete: (res) => {}
        });
    }
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    console.log("执行下拉");
    // 显示顶部刷新图标
    wx.showNavigationBarLoading();
    page = 1;
    hadLastPage = false;
    this.setData({
      items: []
    });
    this.getScenes();

    // 隐藏导航栏加载框
    wx.hideNavigationBarLoading();

    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
    console.log("执行上拉");
    this.getScenes();
  },
})