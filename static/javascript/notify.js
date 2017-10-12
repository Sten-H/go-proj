/**
* notify namespace contains functions that can create html notifications.
* Notifications are not shown if browser tab is active.
*/
var notify = {};
(function(context) {
  var prevEvent;  // Variable keeps track if browser tab is inactive or active (blur/focus)
  // Listener that updates if tab is inactive active
  $(window).on('blur focus', function(e) {
    prevEvent = e.type;
  });
  
  //Base of this code is taken from http://stackoverflow.com/questions/2271156/chrome-desktop-notification-example
  // Request permission on page load
  addEventListener('DOMContentLoaded', function () {
    if (Notification.permission !== "granted")
      Notification.requestPermission();  // If notifications are not permitted, permission is requested.
  });
  
  //shows a notification if permission is granted, notification auotimatically closes after timeout duration in ms
  this.createNotification = function(title, body, timeout) {
    if (!Notification || prevEvent !== 'blur') {
      // Either notifications are not supported by browser or tab is active (no need to show).
      return;
    }

    if (Notification.permission !== "granted")
      Notification.requestPermission();  // This doesn't ask again if user has denied permission before.

    else {
        var notification = new Notification(title, {
        icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',  // FIXME this is from copy source, change
        body: body,
      });
      
      // Switch to tab when clicking notification
      notification.onclick = function () {
        window.focus(); 
      };
      setTimeout(function() { notification.close(); }, timeout);  // Notification dies after timeout in ms
    }
  };
  
  this.gameFound = function(opponent_name) {
    opponent_name = (opponent_name === undefined) ? 'an opponent' : opponent_name;
    this.createNotification('Game started!', 'You have been matched with ' + opponent_name, 2000);
  };
  
  this.opponentMove = function(opponent_name, move) {
    opponent_name = (opponent_name === null) ? 'Your opponent' : opponent_name;
    if('resign' in move) {
      this.createNotification('You win!', opponent_name + ' has resigned.', 2000);  
    }
    if('pass' in move) {
      this.createNotification('Your turn!', opponent_name + ' has passed', 2000);
    }
    else
      this.createNotification('Your turn!', opponent_name + ' has made a move', 2000);
  };
  /*
  // FIXME This function is just used for testing, delete later
  this.delayNotify = function(title, body, timeout) {
    var cN = this.createNotification;
    console.log('delayNotify');
    setTimeout(
      function() {cN(title, body, timeout);}, 
      1000);
  };
  */
}).apply(notify);
