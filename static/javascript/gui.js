/**
 * The GUI namespace handles all dynamic updates to GUI elements such
 * as the event history (list of played moves and chat messages)
 */
var gui = {};  // This really shouldn't be in caps
(function (context) {
  'use strict';
  
  /**
   * Updates the text displaying who the active color is
   * @param {Number} next_color next color to play expressed as int, black = 0.
   */
  this.update_to_play = function (next_color) {
    var color_string = (next_color === 1) ? 'Black' : 'White';
    $('#color-to-play').text(color_string);
  };

  /**
   * Creates an event which is output to the event history/chat to the left.
   * The event is created as a <li> item that is appended to the event-list (<ul>)
   * @param {Move} move Move object, containing information about the latest move
   */
  // FIXME this function should also take names object as an argument, 
  // uses global variable right now unlike other functions.
  this.update_event_history = function (move) {
    var evt_string = '<li><span>', current_name = "<span class='chat-name'>";
    current_name += (move.color === names.client) ? names.client : names.opponent;
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
  
  /**
   * Creates a jquery confirmation dialogue window.
   * @param {String} title Title displayed in dialogue
   * @param {String} body  Text body displayed in dialogue
   */
  this.create_ok_dialog = function(title, body){
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
    
  /**
   * Updates the amount of stones that have been captured for each player
   * @param {Number} cap_black Amount of stones that black has captured
   * @param {Number} cap_white Amount of stones that white has captured
   */
  this.update_capture_text = function(cap_black, cap_white) {
    $('#black-captures').text(board.cap_black);
    $('#white-captures').text(board.cap_white);
  }

  // FIXME Animation effects. I think I stopped using this? Or atleast it's no longer animated?
  this.mark_active_player = function(current_player) { 
    if(current_player == 1) {
      $('#player-black').addClass('active-player');
      $('#player-white').removeClass('active-player');
    }
    else {
      $('#player-white').addClass('active-player');
      $('#player-black').removeClass('active-player');
    }
  }

  /**
   * Sets the names on the cards (black and white cards containing, name, color and captures of a player)
   * @param {Number} player_color Player color as int, 0 = black
   * @param {object}   names        Object containing both player names
   */
  this.set_names_on_cards = function(player_color, names) {
    $('#black-name').text((player_color == 1) ? names.client : names.opponent);
    $('#white-name').text((player_color == 0) ? names.client : names.opponent);
  }
}).apply(gui);