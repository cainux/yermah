/*jslint white: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true */
/*global console, XMLHttpRequest, localStorage, webkitNotifications, chrome, clearTimeout, setTimeout */
var Yermah = function () {

    this.pollInterval = 1000 * 60; // 1 minute
    this.originalInterval = this.pollInterval;
    this.maximumInterval = 1000 * 60 * 60; // 1 hour
    this.debugMode = false;
    this.includeOwnMessages = false;

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
};

Yermah.prototype = {

    log: function (message) {
        if (this.debugMode && console) {
            console.log(message);
        }
    },
  
    applyOptions: function (options) {
        this.pollInterval = 1000 * 60 * options.pollingInterval;
        this.includeOwnMessages = options.includeOwnMessages;
        this.enableNotifications = options.desktopNotificationsEnabled;
        this.notificationTimeout = 1000 * options.notificationLifetime;
        this.maxNotifications = options.maxNotifications;
    },
  
    isYammerUrl: function (url) {
        var yammer = this.yammerUrl;
        
        if (url.indexOf(yammer) !== 0) {
            return false;
        }
        
        return true;
    },
  
    getApiCallUrl: function (methodName) {
        return this.yammerUrl + "api/" + this.yammerApiVersion + "/" + methodName + ".json";
    },

    resetpollInterval: function () {
        if (this.pollInterval !== this.originalInterval) {
            this.pollInterval = this.originalInterval;
        }
        
        this.log("pollInterval: " + this.pollInterval);
    },

    doXhr: function (url, onSuccess, onError) {
        var xhr = new XMLHttpRequest(),
            that = this;

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    onSuccess(JSON.parse(xhr.responseText));
                    that.log("Successfully called: " + url);
                }
                else {
                    onError(url);
                }
            }
        };
    
        this.log(url);
        xhr.open("GET", url, true);
        xhr.send(null);
    },
  
    checkForNewMessages: function (messageId) {
        var that = this;
        
        if (!this.includeOwnMessages) {
            this.getCurrentUser(function () {
                that.getMessages(messageId);
            });
        }
        else {
            this.getMessages(messageId);
        }
    },

    getCurrentUser: function (onSuccess) {
        var that = this;

        this.log("checking for current user id");

        this.doXhr(
            this.getApiCallUrl("users/current"),
            function (jsonData) {
                that.currentUserId = jsonData.id;
                if (onSuccess) {
                    onSuccess();
                }
            },
            function (url) {
                that.handleError(url);
            }
        );
    },

    getMessages: function (messageId) {
        var that = this,
            url = this.getApiCallUrl("messages/following");
        
        this.log("checking for new messages since id: " + messageId);
        
        if (messageId > 0) {
            url = url + "?newer_than=" + messageId;
        }

        this.doXhr(
            url,
            function (jsonData) {
                that.handleMessagesResponse(jsonData);
            },
            function (url) {
                that.handleError(url);
            }
        );
    },
  
    handleMessagesResponse: function (jsonData) {
        var result = jsonData,
            messages = result.messages,
            message,
            filteredMessages = [],
            i,
            newestMessage;
  
        if (!this.lastCheckSuccess) {
            this.resetBadge();
        }
    
        this.lastCheckSuccess = true;
        this.lastYammerResponse = result;
        this.resetpollInterval();

        if (!this.includeOwnMessages) {
            for (i = 0; i < messages.length; i += 1) {
                message = messages[i];
                if (message.sender_id !== this.currentUserId) {
                    filteredMessages.push(message);
                }
            }
            messages = filteredMessages;
        }

        if (messages && messages.length > 0) {
            newestMessage = messages[0];
            this.newestMessageId = newestMessage.id;
            this.updateBadgeText(messages.length.toString());
            this.updateBadgeIcon("red");
            localStorage.lastMessageId = this.newestMessageId;

            if (this.enableNotifications) {
                this.notify(messages, result.references);
            }
        }
    },
  
    handleError: function (url) {
        this.log("Failed: " + url);
        this.lastCheckSuccess = false;
        this.updateBadgeText();
        this.updateBadgeIcon("grey");
        if (this.pollInterval < this.maximumInterval) {
            this.pollInterval = this.pollInterval + 30000;
        }
    },
  
    notify: function (messages, references) {
        var that = this,
            i, message,
            notification, user, targetUrl, urlType,
            thread;
            
        for (i = 0; i < messages.length; i += 1) {
            message = messages[i];
            if (i < this.maxNotifications) {
                // The hash at the end of the url let's the notification know which message to show
                notification = webkitNotifications.createHTMLNotification('notification.html#' + message.id);
                user = this.getReference(message.sender_id, "user", references);
                targetUrl = message.web_url;
                urlType = "message";
                
                if (message.id !== message.thread_id) {
                    thread = this.getReference(message.thread_id, "thread", references);
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
  
    getReference: function (id, type, references) {
        var i, ref;
        
        for (i = 0; i < references.length; i += 1) {
            ref = references[i];
            if (ref.type === type && ref.id === id) {
                return ref;
            }
        }
    
        return null;
    },
  
    updateBadgeText: function (message) {
        if (!message) {
            message = "";
        }
        else {
            message = message.toString();
        }
        chrome.browserAction.setBadgeText({
            "text": message
        });
    },
  
    updateBadgeIcon: function (colour) {
        if (!colour) {
            colour = "";
        }
        else {
            colour = "-" + colour;
        }
      
        chrome.browserAction.setIcon({
            path: "img/yammer-19" + colour + ".png"
        });
    },
  
    resetBadge: function () {
        this.updateBadgeText();
        this.updateBadgeIcon();
    },
  
    handleBrowserAction: function () {
        this.resetpollInterval();
        this.goToYammer();
        this.resetBadge();
    },
  
    goToYammer: function () {
        var that = this,
            i, tab;
  
        chrome.tabs.getAllInWindow(undefined, function (tabs) {
            for (i = 0; i < tabs.length; i += 1) {
                tab = tabs[i];
                if (tab.url && that.isYammerUrl(tab.url)) {
                    chrome.tabs.update(tab.id, {
                        selected: true
                    });
                    return;
                }
            }
            chrome.tabs.create({
                url: that.yammerUrl
            });
        });
    },
  
    go: function () {
        var that = this;
        clearTimeout(this.timeoutId);
        this.log("Polling...");
        this.checkForNewMessages(this.newestMessageId);
        this.timeoutId = setTimeout(function () {
            that.log("Waited " + that.pollInterval);
            that.go();
        }, this.pollInterval);
    }
};