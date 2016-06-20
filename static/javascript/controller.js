"use strict";
var canvas_width = 800;
var canvas, ctx;
var board_view = null;     // BoardView object. Draws a Board object on a html canvas
var board = null;          // Board object. Go Engine
var canvas_change = true;  // Rudimentary render optimization. Renders on mouse move, and on board events.
var marking_mode = false;  // marking_mode true activates manual marking of dead stones
var marking_list = new MarkArray();
var connection = new Connection();  // Maintains connection and messaging to peer
//these things below should probably be in a Player class or something.
var marking_ready = {client: false, opponent: false};
var player_color; //Clients color in the game.
var names = {client: null, opponent: null, names_set: false};

/**
 * Changes paragraph text when searching for a game.
 * @param  {String} text - Text to be displayed
 */
function change_search_button_text(text){
  $('#search-button').text(text);
}

function render() {
  board_view.draw(board); 
  if(marking_mode)
    board_view.draw_markings(marking_list.mark_list);
}

/**
 * Very simple game cycle. Canvas is only rendered on change or mouse move
 * as a crude optimization. It's quite demanding otherwise.
 */
function tick() {
  window.requestAnimationFrame(tick);
  if(canvas_change)
    render();
  if(!names.names_set && names.client !== null && names.opponent !== null)
    GUI.set_names_on_cards(player_color, names);
  canvas_change = false;
}

/**
 * Initializes Board and BoardView upon successfull peer matching. Game begins.
 * Right now this is usually called from network namespace (network.js), that's really
 * weird. It can also be called if the opponent sends a move but client hasn't initialized
 * board yet, in that case it is called from controller.js
 */
function init() {
  notify.gameFound(names.opponent);  // Sends a html notification that game is starting.
  if(board === null && board_view === null) {
    $('#search-box').slideUp(1000, function() {
      $('#game-container').show(); // This is sort of a hack. I show and hide this to get proportions of div.
      var size = Number($('#size').val());
      canvas.width = canvas.height = canvas_width = Math.min($('#canvas-wrapper').width(), $('#canvas-wrapper').height());
      board = new Board(size);
      board_view = new BoardView(size, canvas_width, ctx);
      GUI.mark_active_player(board.current_player);
      render(); // Render board once for slide reveal
      $('#game-container').hide(); // Now hide again to reveal game with slide
      $('#game-container').show("slide", { direction: "down", easing: "swing" }, 800, function() {
        tick();
      });
    });
  }
}
/**
 * In manual marking mode both players can mark stones
 * they consider dead. A player can dispute the other players
 * marks and the game will resume normal play until double pass or resign.
 */
function activate_manual_marking_mode() {
  marking_mode = true;
  marking_list.clear();
  $('#pass-button').prop('disabled', true);
  $('#resign-button').prop('disabled', true);
  $('#marking-button').show();
  GUI.create_ok_dialog('Mark dead stones', 'You can now mark dead stones, if you opponent ' + 
    'disagrees on a stone marking, play will begin again, until double pass or resign. When you are done, press complete marking.');
}

function deactivate_manual_marking_mode() {
  marking_mode = false;
  $('#pass-button').prop('disabled', false);
  $('#resign-button').prop('disabled', false);
  $('#marking-button').hide();
  GUI.update_event_history({global_msg: 'A stone has been disputed. Game is back in play.'});
}

/**
 * Is called by peer (from Network object) or by client by clicking
 * to execute a marking of dead stone on the board.
 * @param  {Mark} mark - A mark object of new mark.
 */
function mark_move(mark) {
  if(!marking_list.add(mark)){
    if(mark.color == player_color) { // Player is disputing
      $('<div></div>').dialog({
        autoOpen: true,
        modal: true,
        title: 'Dispute stone',
         open: function() {
        $(this).html('Do you really want to dispute this stone? The game will resume from latest pass');
        },
        buttons: {
          "Yes": function() {
            deactivate_manual_marking_mode();
            connection.send({mark: {x: mark.x, y: mark.y, color: mark.color}});
            $(this).dialog("close");
          },
          "Cancel": function() {
            $(this).dialog("close");  // We dont send move on cancel, this complicates the function.
          }
        }
      });
    }
    else {
      deactivate_manual_marking_mode(); // Player received dispute, goes back to play mode.
    }
  }
  else if(mark.color == player_color)
    connection.send({mark: {x: mark.x, y: mark.y, color: mark.color}});
  canvas_change = true;
}

/**
 * Is called by peer (from Network object) or by client by clicking
 * to execute moves on the gameboard.
 * @param  {Dict} move - A move can contain stone placement, pass, resign
 */
function play_move(move) {
  //Place stone
  if(board === null) // This is to prevent a situation where one player sends a move to a person who hasn't initalized his board. Can happen.
    init();
  if("stone" in move){
    var stone = move.stone;
    if(board.place_stone(stone.x, stone.y)){
      GUI.update_capture_text(board.cap_black, board.cap_white);  // Update capture score in case stones were captured.
    }
    else { //If move was legal
      GUI.create_ok_dialog('Illegal move', 'That move is illegal');
      return;
    }
  }
  else if("pass" in move) {
    board.player_pass();
    if(board.double_pass())
      activate_manual_marking_mode();
  }
  else if("resign" in move) {
    board.player_resign(move.color);
    end_game_on_resign();
  }
  // Send move to opponent if client made the move
  if(move.color == player_color){  
      connection.send({move: move});
  }
  // Notify client if opponent made the move
  else {
    notify.opponentMove(names.opponent, move);
  }
  
  GUI.update_event_history(move);
  GUI.update_to_play(board.current_player);
  GUI.mark_active_player(board.current_player);
  canvas_change = true;
  $('#chat-message').focus();
}

/**
 * Reports the game results to the backend
 * @param  {String} score_string - Describes win state
 * @param  {Number} winner       - Winner color
 * @param  {String} sgf          - Smart Game Format string
 */
function report_game(score_string, winner, sgf) {
  var black_name;
  var white_name;
  if(player_color == 1){
    black_name = names.client;
    white_name = names.opponent;
  } else {
    black_name = names.opponent;
    white_name = names.client;
  }

  var size_str = board.size + "x" + board.size;
  connection.report_game_results(black_name, white_name, size_str, winner, score_string, sgf);
}

/**
 * Decides which player sends information to the backend
 * on winner and loser. This can be exploited at the moment. Both players
 * should send same information and backend should consolidate it somehow.
 * @param  {String} score_string - Describes win state
 * @param  {String} sgf          - Smart Game Format string
 */
function report_game_results(score_string, sgf) {
  if(board.winner == -1){
    connection.report_draw(names.client); // Each client reports his own draw.
    if(player_color == 1) //black reports the game info. Arbitrary choice.
      report_game(score_string, 'draw', sgf);
  }
  else if(board.winner == player_color) {  // Winner reports results, most likely to still have tab open, resign by tab close and such.
    connection.report_win(names.client);
    connection.report_loss(names.opponent);
    report_game(score_string, names.client, sgf);
  }
}

/**
 * [end_game_cleanup description]
 * @param  {String} win_str - String describing board win state
 */
function end_game_cleanup(win_str) {
  var sgf = board.get_sgf();
  report_game_results(win_str, sgf);
  $('#go-button-wrapper').hide();
  $('#sgf').val(sgf);
  $('#upload-form-container').show();
}

/**
 * Ends the game on a resign by any player.
 * @param  {Number} resign_color - Color of player who resigned.
 */
function end_game_on_resign(resign_color) {
  var win_str = (resign_color == player_color) ? names.client : names.opponent;
  win_str += " wins by resignation.";
  GUI.create_ok_dialog('Winner!', win_str);
  end_game_cleanup(win_str);
}

/**
 * Ends the game on detected double pass
 */
function end_game_on_pass() {
  marking_mode = false;
  board.remove_dead_marks(marking_list);
  GUI.update_capture_text(board.cap_back, board.cap_white);
  
  //Create a string for dialog
  var winner_color = board.determine_winner();
  var score = board.final_score;
  var score_string = '<br> Black: ' + score.black + '<br> White: ' + score.white;
  var win_str = (winner_color == 1) ? 'Black' : 'White';
  win_str += ' is the winner!' + score_string;
  canvas_change = true;

  if(winner_color == -1)
    GUI.create_ok_dialog('Draw', 'The game is a draw!' + score_string);
  else
    GUI.create_ok_dialog('Winner!', win_str);
  score_string = 'Black: ' + board.final_score.black + ", White: " + board.final_score.white; // reuse for db entry
  end_game_cleanup(score_string);
}

/**
 * Returns the mouse position on canvas
 * @param  {Canvas} canvas - HTML canvas
 * @param  {Event} evt - Mouse event object
 * @return {Dict} Dict containing x and y coords
 */
function get_mouse_pos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

/**
 * This is called when the peer (or client) has marked that
 * he is ready/not ready with the marking of dead stones.
 * @param  {dict} status - Can be ready or not ready
 */
function update_marking_ready(status) {
  if("client" in status)
    marking_ready.client = status.client;
  else if("opponent" in status)
    marking_ready.opponent = status.opponent;

  if(marking_ready.opponent && marking_ready.client)
    end_game_on_pass();

  if(marking_ready.opponent === true)
    $('#marking-button').addClass('player-ready');
  else
    $('#marking-button').removeClass('player-ready');
}

$(function() {
  canvas = document.getElementById('go-canvas');
  ctx = canvas.getContext("2d");

  $('#upload-form-container').hide();
  $('#upload-button').tooltip();
  $('#marking-button').tooltip();
  $('#marking-button').tooltip({
    content: function() {
      if ($('#marking-button').hasClass('player-ready')) {
        return names.opponent + " is ready!";
      }
      else {
        return names.opponent + " is not ready";
      }
    }
  });
  
  //Add listener to pass button
  $('#pass-button').click(function(){
    if(player_color == board.current_player && board.winner === null){
      play_move({pass: true, color: player_color});
    }
  });

  //Add listener to resign button
  $('#resign-button').click(function(){
    if( board.winner === null) {
      play_move({resign: true, color: player_color});
    }
  });

  //Detect mouse movement
  $(canvas).mousemove(function(e){
    var mouse_pos = get_mouse_pos(canvas, e);
    board_view.update_mouse_marker(mouse_pos.x, mouse_pos.y);
    canvas_change = true;
  });

  //Detect mouse click
  $(canvas).click(function(e) {
    var mouse_pos = get_mouse_pos(canvas, e);
    var tile_pos = board_view.get_tile_coord(mouse_pos.x, mouse_pos.y);
    if(marking_mode){
      if(board.tile_occupied(tile_pos.x, tile_pos.y))
        mark_move(new Mark(tile_pos.x, tile_pos.y, player_color));
    }
    else if(player_color == board.current_player && board.winner === null){
      
      play_move({stone: {x: tile_pos.x, y: tile_pos.y}, color: player_color});
    }
  });

  //Detect resize
  $(window).resize(function(evt){
    if(board_view !== null){
      canvas.width = canvas.height = canvas_width = Math.min($('#canvas-wrapper').width(), $('#canvas-wrapper').height());
      board_view.recalculate_size(canvas_width);
      canvas_change = true;
    }
  });

  $(window).unload(function(){
    connection.send({disconnect: true});
  });

  //Add functionality to chat button
  $('#chat-send').click(function(){
    var msg = $('#chat-message').val();
    $('#chat-message').val('');
    if(msg !== ''){
      connection.send({msg: msg, color: player_color});
      GUI.update_event_history
  ({msg: msg, color: player_color});
    }  
  });

  //Add functionality to marking complete button
  $('#marking-button').hide();
  $('#marking-button').click(function(){
    if(marking_ready.client === true) {
      update_marking_ready({client: false});
      connection.send({complete_mark: false});
    }
    else {
      connection.send({complete_mark: true});
      update_marking_ready({client: true});
    }
    //Remove stones after coordinates of marks
  });
    
  //Add functionality to search button
  $('#search-button').prop('disabled', true); // Disabled until clients has acquired a peer id
  $('#search-button').click(function(){
      $('.ui-state-error').remove();
      names.client = $('#username').val(); //FIXME
      $('#search-text').text('Searching for opponent...');
      $(this).prop('disabled', true);
      connection.search_match();
  }); //End of search button
}); //End of document ready