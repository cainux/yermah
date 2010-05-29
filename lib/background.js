function Yermah() {
  this.checkInterval = 30000;
  this.debugMode = false;
  this.yammerUrl = "https://www.yammer.com/";
  this.yammerApiVersion = "v1";
  this.newestMessageId = 0;
  this.lastYammerResponse = "";
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

  checkForNewMessages: function(messageId) {
    this.log("checking for new messages since id: " + messageId);
    
    var url = this.getApiCallUrl("messages");
    
    if(messageId > 0)
      url = url + "?newer_than=" + messageId;
    
    var xhr = new XMLHttpRequest();
    var that = this;
    
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4 && xhr.status == 200) {
        that.handleSuccessfulResponse(xhr.responseText);
        that.log("Successfully called: " + url);
      }
    }
    
    this.log(url);
    xhr.open("GET", url, true);
    xhr.send(null);
  },
  
  handleSuccessfulResponse: function(responseText) {
    var result = JSON.parse(responseText);
    this.lastYammerResponse = result;
    
    if(result.messages && result.messages.length > 0) {
      var newestMessage = result.messages[0];
      this.newestMessageId = newestMessage.id;
      this.updateBadge(result.messages.length.toString());
    }
  },
  
  updateBadge: function(message) {
    chrome.browserAction.setBadgeText({
      "text": message
    });
  },
  
  goToYammer: function() {
    var that = this;
  
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
      for(var i = 0, tab; tab = tabs[i]; i++) {
        if(tab.url && that.isYammerUrl(tab.url)) {
          that.updateBadge();
          chrome.tabs.update(tab.id, { selected: true });
          return;
        }
      }
      that.updateBadge();
      chrome.tabs.create({url: that.yammerUrl});
    });
  },
  
  start: function() {
    var interval = this.checkInterval;
    var that = this;
    var now = new Date();
    var seconds = now.getSeconds();
    
    this.updateBadge(seconds.toString());
    this.log("i: " + interval + " s: " + seconds);
    
    setTimeout(function() { that.start(interval); }, interval);
  }
}