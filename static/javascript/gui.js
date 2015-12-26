//Logging to event history and such
function update_event_history(move){
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
  evt_string += '</span></li>';
  $('#event-list').append(evt_string);
  //Scroll to bottom of log
  $("#event-history").animate({ scrollTop: $("#event-history")[0].scrollHeight}, 1000);
}

function update_capture_text() {
  $('#black-captures').text(board.cap_black);
  $('#white-captures').text(board.cap_white);
}
//Animation effects
function mark_active_player() { 
  var curr = board.current_player;
  if(curr == 1) {
    $('#player-black').addClass('active-player');
    $('#player-white').removeClass('active-player');
  }
  else {
    $('#player-white').addClass('active-player');
    $('#player-black').removeClass('active-player');
  }
}

function set_names_on_cards() {
  $('#black-name').text((player_color == 1) ? names.client : names.opponent);
  $('#white-name').text((player_color == 0) ? names.client : names.opponent);
}
//Dialogs
function winner_dialog(){
  var winner_string = (board.get_winner() == 1) ? 'Black' : 'White';
  $('#winner-dialog-text').text(winner_string + ' is the winner!');
  $('#winner-dialog').dialog({
    dialogClass: "no-close",  
    buttons: [
      {
        text: "OK",
        click: function() { $( this ).dialog( "close" ); }
      }
    ]
  });
}
function illegal_move_dialog(){
  $('#invalid-move-dialog').dialog({
      dialogClass: "no-close",  
      buttons: [
      {
        text: "OK",
        click: function() {
          $( this ).dialog( "close" );
        }
      }
    ]
  });
}
function dispute_mark_dialog(){
  
}
function marking_dialog(){
  $('#marking-dialog').dialog({
      dialogClass: "no-close",  
      buttons: [
      {
        text: "OK",
        click: function() {
          $( this ).dialog( "close" );
        }
      }
    ]
  });
}