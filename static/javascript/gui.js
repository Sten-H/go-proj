function GUI() {}

GUI.update_to_play = function(next_color) {
  var color_string = (next_color == 1) ? 'Black' : 'White';
  $('#color-to-play').text(color_string);
}
//Logging to event history and such
GUI.update_event_history = function (move){
  var evt_string = '<li><span>';  
  var current_name = "<span class='chat-name'>";
  current_name += (move.color == player_color) ? names.client : names.opponent;
  current_name += "</span>";
  var color_string = (move.color == 1) ? '(Black) ' : '(White) ';
  evt_string += current_name + color_string;
  if(move.stone != null) 
    evt_string += 'played at ' + "<span class='move-info'>" + (move.stone.x + 1) + ', ' + (move.stone.y) + "</span>."; 
  else if(move.pass != null)
    evt_string += 'passed.';
  else if(move.resign != null)
    evt_string += 'resigned.'
  else if(move.msg != null)
    evt_string += 'says: ' + move.msg;
  else if(move.global_msg != null)
    evt_string = '<span><li>' + move.global_msg + '</span></li>';
  evt_string += '</span></li>';
  $('#event-list').append(evt_string);
  //Scroll to bottom of log
  $("#event-history").animate({ scrollTop: $("#event-history")[0].scrollHeight}, 1000);
}

GUI.create_ok_dialog = function(title, body){
   $('<div></div>').dialog({
      modal: true,
      title: title,
      open: function() {
        $(this).html(body);
      },
      buttons: {
        Ok: function() {
          $( this ).dialog( "close" );
        }
      }
    });  //end confirm dialog
}

GUI.update_capture_text = function(cap_black, cap_white) {
  $('#black-captures').text(board.cap_black);
  $('#white-captures').text(board.cap_white);
}
//Animation effects
GUI.mark_active_player = function(current_player) { 
  if(current_player == 1) {
    $('#player-black').addClass('active-player');
    $('#player-white').removeClass('active-player');
  }
  else {
    $('#player-white').addClass('active-player');
    $('#player-black').removeClass('active-player');
  }
}

GUI.set_names_on_cards = function(player_color, names) {
  $('#black-name').text((player_color == 1) ? names.client : names.opponent);
  $('#white-name').text((player_color == 0) ? names.client : names.opponent);
}