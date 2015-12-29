var canvas_width = 800;
var canvas;
var board_view;
var board;
var canvas_change = true; //Rudimentary render optimization. Renders on mouse move, and on board events.
var marking_mode = false;
var marking_list = new MarkArray();
var connection = new Connection();
//these things below should probably be in a Player class or something.
var marking_ready = {client: false, opponent: false};
var player_color; //Clients color in the game.
var names = {client: null, opponent: null, names_set: false};




function change_search_button_text(text){
  $('#search-button').text(text);
}

//Gameboard interactions
function update() {
  //?
}

function render() {
  board_view.draw(board); 
  if(marking_mode)
    board_view.draw_markings(marking_list.mark_list);
}

function tick() {
  window.requestAnimationFrame(tick);
  update();
  if(canvas_change)
    render();
  if(!names.names_set && names.client !== null && names.opponent != null)
    GUI.set_names_on_cards(player_color, names)
  canvas_change = false;
}
function activate_manual_marking_mode() {
  marking_mode = true;
  marking_list.clear();
  $('#pass-button').prop('disabled', true);
  $('#resign-button').prop('disabled', true);
  $('#marking-button').show();
  GUI.create_ok_dialog('Mark dead stones', 'You can now mark dead stones, if you opponent '
    + 'disagrees on a stone marking, play will begin again, until double pass or resign. When you are done, press complete marking.');
}
function deactivate_manual_marking_mode() {
  marking_mode = false;
  $('#pass-button').prop('disabled', false);
  $('#resign-button').prop('disabled', false);
  $('#marking-button').hide();
  GUI.update_event_history({global_msg: 'A stone has been disputed. Game is back in play.'});
}
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
function play_move(move) {
  //Place stone
  if(board == null) // This is to prevent a situation where one player sends a move to a person who hasn't initalized his board. Can happen.
    init();
  if(move.stone != null){
    var stone = move.stone
    if(board.place_stone(stone.x, stone.y)){
      GUI.update_capture_text(board.cap_black, board.cap_white); 
    }
    else { //If move was legal
      GUI.create_ok_dialog('Illegal move', 'That move is illegal');
      return;
    }
  }
  else if(move.pass != null) {
    board.player_pass();
    if(board.double_pass())
      activate_manual_marking_mode();
  }
  else if(move.resign != null) {
    board.player_resign(move.color);
    var win_str = "";
    if (move.color == player_color){
      win_str + names.opponent;
    }
    else 
      win_str + names.client;
    win_str += " wins by resignation.";
    GUI.create_ok_dialog('Winner!', win_str);
  }
  if(move.color == player_color){
      connection.send({move: move});
  }
  GUI.update_event_history(move);
  GUI.mark_active_player(board.current_player);
  canvas_change = true;
  $('#chat-message').focus();
}

function init() {
  if(board == null && board_view == null) {
    console.log('initializing game');
    var size = Number($('#size').val());
    $('#game-container').show();
    canvas.width = canvas.height = canvas_width = Math.min($('#canvas-wrapper').width(), $('#canvas-wrapper').height());
    board = new Board(size);
    board_view = new BoardView(size, canvas_width, ctx);
    
    $('#search-box').hide();
    
    GUI.mark_active_player(board.current_player);
    tick();
  }
}

function end_game() {
  marking_mode = false;
  board.remove_dead_marks(marking_list);
  var winner_color = board.determine_winner();
  var score = board.final_score;
  var score_string = '<br> Black: ' + score.black + '<br> White: ' + score.white;
  var win_str = (winner_color == 1) ? 'Black' : 'White';
  win_str += ' is the winner!' + score_string;
  if(winner_color == -1)
    GUI.create_ok_dialog('Draw', 'The game is a draw!' + score_string);
  else
    GUI.create_ok_dialog('Winner!', win_str);
}
function get_mouse_pos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}
function update_marking_ready(status) {
  if(status.client != null)
    marking_ready.client = status.client;
  else if(status.opponent != null)
    marking_ready.opponent = status.opponent;

  if(marking_ready.opponent && marking_ready.client)
    end_game();
  if(marking_ready.opponent == true)
    $('#marking-button').addClass('player-ready');
  else
    $('#marking-button').removeClass('player-ready');
}

$(function() {  //document ready short
  canvas = document.getElementById('go-canvas');
  ctx = canvas.getContext("2d");

  //Add listener to pass button
  $('#pass-button').click(function(){
    if(player_color == board.current_player && board.winner == null){
      play_move({pass: true, color: player_color})
    }
  });
  //Add listener to resign button
  $('#resign-button').click(function(){
    if( board.winner == null) {
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
    else if(player_color == board.current_player && board.winner == null){
      
      play_move({stone: {x: tile_pos.x, y: tile_pos.y}, color: player_color});
    }
  });
  //Detect resize
  $(window).resize(function(evt){
    if(board_view != null){
      canvas.width = canvas.height = canvas_width = Math.min($('#canvas-wrapper').width(), $('#canvas-wrapper').height());
      board_view.recalculate_size(canvas_width);
    }
  });

  $(window).unload(function(){
    connection.send({disconnect: true});
  });
  //Add functionality to chat button
  $('#chat-send').click(function(){
    var msg = $('#chat-message').val();
    $('#chat-message').val('');
    if(msg != ''){
      connection.send({msg: msg, color: player_color});
      GUI.update_event_history
  ({msg: msg, color: player_color});
    }  
  });
  //Add functionality to marking complete button
  $('#marking-button').hide();
  $('#marking-button').click(function(){
    if(marking_ready.client == true) {
      update_marking_ready({client: false})
      connection.send({complete_mark: false});
    }
    else {
      connection.send({complete_mark: true});
      update_marking_ready({client: true});
    }
    //Remove stones after coordinats of marks
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