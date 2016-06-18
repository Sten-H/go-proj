//Base of this code is taken from http://stackoverflow.com/questions/2271156/chrome-desktop-notification-example

// Request permission on page load
addEventListener('DOMContentLoaded', function () {
  if (Notification.permission !== "granted")
    Notification.requestPermission();  // If notifications are not permitted, permission is requested.
});

//shows a notification if permission is granted, notification auotimatically closes after timeout duration in ms
function createNotification(title, body, timeout) {
  if (!Notification) {
    alert('Desktop notifications not available in your browser.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();  // Why request again? Remove?
  
  else {
      var notification = new Notification(title, {
      icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
      body: body,
    });

    notification.onclick = function () {
	//Do nothing, could maybe switch to tab?
	window.focus(); // like this?
    };
    setTimeout(function() { notification.close() }, timeout);
  }

}
