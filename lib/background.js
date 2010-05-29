function Yermah() {
  this.checkInterval = 1000 * 60; // 1 minute
  this.originalInterval = this.checkInterval;
  this.maximumInterval = 1000 * 60 * 60; // 1 hour
  this.debugMode = false;
  
  this.yammerUrl = "https://www.yammer.com/";
  this.yammerApiVersion = "v1";
  
  this.newestMessageId = 0;
  this.lastYammerResponse = {};
  
  this.timeoutId = 0;
}

Yermah.prototype = {

  log: function(message) {
    if(this.debugMode) {
      console.log(message);
    }
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

  resetCheckInterval: function() {
    if(this.checkInterval != this.originalInterval)
      this.checkInterval = this.originalInterval;
      
    this.log("checkInterval: " + this.checkInterval);
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
    var result = JSON.parse(responseText);
    this.lastYammerResponse = result;
    
    this.resetCheckInterval();

    if(result.messages && result.messages.length > 0) {
      var newestMessage = result.messages[0];
      this.newestMessageId = newestMessage.id;
      this.updateBadgeText(result.messages.length.toString());
      this.updateBadgeIcon("red");
      localStorage.lastMessageId = this.newestMessageId;
    }
  },
  
  handleError: function(url) {
    this.log("Failed: " + url);
    this.updateBadgeText();
    this.updateBadgeIcon("grey");
    this.newestMessageId = 0;
    // localStorage.removeItem("lastMessageId");
    if(this.checkInterval < this.maximumInterval)
      this.checkInterval = this.checkInterval + 30000;
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
  
  handleBrowserAction: function() {
    this.resetCheckInterval();
    this.goToYammer();
    this.updateBadgeText();
    this.updateBadgeIcon();
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
      that.log("Waited " + that.checkInterval);
      that.go();
    }, this.checkInterval);
  }
}