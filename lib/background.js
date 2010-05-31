function Yermah() {
  this.pollInterval = 1000 * 60; // 1 minute
  this.originalInterval = this.pollInterval;
  this.maximumInterval = 1000 * 60 * 60; // 1 hour
  this.debugMode = false;
  
  this.yammerUrl = "https://www.yammer.com/";
  this.yammerApiVersion = "v1";
  
  this.newestMessageId = 0;
  this.lastYammerResponse = {};
  
  this.timeoutId = 0;
  
  // Notification options
  this.enableNotifications = true;
  this.notificationTimeout = 10000;
  this.maxNotifications = 3;
  
  this.flash = [];
  
  this.lastCheckSuccess = false;
}

Yermah.prototype = {

  log: function(message) {
    if(this.debugMode) {
      console.log(message);
    }
  },
  
  applyOptions: function(options) {
    this.pollInterval = 1000 * 60 * options.pollingInterval;
    this.enableNotifications = options.desktopNotificationsEnabled;
    this.notificationTimeout = 1000 * options.notificationLifetime;
    this.maxNotifications = options.maxNotifications;
  },
  
  isYammerUrl: function(url) {
    var yammer = this.yammerUrl;
    if(url.indexOf(yammer) != 0) {
      return false;
    }
    return true;
  },
  
  getApiCallUrl: function(methodName) {
    return this.yammerUrl + "api/" + this.yammerApiVersion + "/" + methodName + ".json";
  },

  resetpollInterval: function() {
    if(this.pollInterval != this.originalInterval)
      this.pollInterval = this.originalInterval;
      
    this.log("pollInterval: " + this.pollInterval);
  },
  
  checkForNewMessages: function(messageId) {
    this.log("checking for new messages since id: " + messageId);
    
    var url = this.getApiCallUrl("messages");
    
    if(messageId > 0)
      url = url + "?newer_than=" + messageId;
    
    var xhr = new XMLHttpRequest();
    var that = this;
    
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4)
        if (xhr.status == 200) {
          that.handleSuccessfulResponse(xhr.responseText);
          that.log("Successfully called: " + url);
        } else {
          that.handleError(url);
        }
    }
    
    this.log(url);
    xhr.open("GET", url, true);
    xhr.send(null);
  },
  
  handleSuccessfulResponse: function(responseText) {
    if(!this.lastCheckSuccess) {
      this.resetBadge();
    }
    
    this.lastCheckSuccess = true;
  
    var result = JSON.parse(responseText);
    this.lastYammerResponse = result;
    
    this.resetpollInterval();

    if(result.messages && result.messages.length > 0) {
      var newestMessage = result.messages[0];
      this.newestMessageId = newestMessage.id;
      this.updateBadgeText(result.messages.length.toString());
      this.updateBadgeIcon("red");
      localStorage.lastMessageId = this.newestMessageId;
      this.lastYammerResponse = result;
      
      if(this.enableNotifications) {
        this.notify(result);
      }
    }
  },
  
  handleError: function(url) {
    this.log("Failed: " + url);
    this.lastCheckSuccess = false;
    this.updateBadgeText();
    this.updateBadgeIcon("grey");
    if(this.pollInterval < this.maximumInterval)
      this.pollInterval = this.pollInterval + 30000;
  },
  
  notify: function(result) {
    var that = this;
    for(var i = 0, message; message = result.messages[i]; i++) {
      if(i < this.maxNotifications) {
        // The hash at the end of the url let's the notification know which message to show
        var notification = webkitNotifications.createHTMLNotification('notification.html#' + message.id);
        var user = this.getReference(message.sender_id, "user", result.references);
        var targetUrl = message.web_url;
        var urlType = "message";
        
        if(message.id != message.thread_id) {
          var thread = this.getReference(message.thread_id, "thread", result.references);
          targetUrl = thread.web_url;
          urlType = "thread";
        }
        
        message.sender_mugshot = user.mugshot_url;
        message.sender_fullName = user.full_name;
        message.notification = notification;
        message.targetUrl = targetUrl;
        message.urlType = urlType;
        
        // Store the message in ym.flash - the notification will delete it once it's displayed the message
        this.flash["#" + message.id] = message;        
        notification.show();
      }
    }
  },
  
  getReference: function(id, type, references) {
    for(var i = 0, ref; ref = references[i]; i++ ) {
      if(ref.type == type && ref.id == id) {
        return ref;
      }
    }
    
    return null;
  },
  
  updateBadgeText: function(message) {
    if(!message)
      message = "";
    else
      message = message.toString();
      
    chrome.browserAction.setBadgeText({
      "text": message
    });
  },
  
  updateBadgeIcon: function(colour) {
    if(!colour)
      colour = "";
    else
      colour = "-" + colour;
      
    chrome.browserAction.setIcon({ path: "img/yammer-19" + colour + ".png" });
  },
  
  resetBadge: function() {
    this.updateBadgeText();
    this.updateBadgeIcon();
  },
  
  handleBrowserAction: function() {
    this.resetpollInterval();
    this.goToYammer();
    this.resetBadge();
  },
  
  goToYammer: function() {
    var that = this;
  
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
      for(var i = 0, tab; tab = tabs[i]; i++) {
        if(tab.url && that.isYammerUrl(tab.url)) {
          chrome.tabs.update(tab.id, { selected: true });
          return;
        }
      }
      chrome.tabs.create({url: that.yammerUrl});
    });
  },
  
  go: function() {
    clearTimeout(this.timeoutId);
    this.log("Polling...");
    var that = this;
    this.checkForNewMessages(this.newestMessageId);
    this.timeoutId = setTimeout(function() {
      that.log("Waited " + that.pollInterval);
      that.go();
    }, this.pollInterval);
  }
}