function Yermah() {
  this.CheckInterval = 2000;
}

Yermah.prototype = {

  Log: function(message) {
    console.log(message);
  },
  
  UpdateBadge: function(message) {
    chrome.browserAction.setBadgeText({
      "text": message
    });
  },
  
  Run: function() {
    var interval = this.CheckInterval;
    var that = this;
    var now = new Date();
    var seconds = now.getSeconds();
    
    this.UpdateBadge(seconds.toString());
    this.Log("i: " + interval + " s: " + seconds);
    
    setTimeout(function() { that.Run(interval); }, interval);
  }
}