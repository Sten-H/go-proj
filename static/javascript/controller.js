var canvas_width = 800;
var canvas, ctx;
var board_view;
var board;
var names = {client: null, opponent: null};
var canvas_change = true; //Rudimentary render optimization. Renders on mouse move, and on board events.
var player_color; //Clients color in the game.
var marking_mode = false;
var marking_list = new MarkArray();





function change_search_button_text(text){
  $('#search-button').text(text);
}

//Gameboard interactions
function update() {
  //?
}

function render() {
  board_view.draw(board, ctx); 
  if(marking_mode)
    board_view.draw_markings(marking_list.mark_list, ctx);
}

function tick() {
  window.requestAnimationFrame(tick); //This is a bit overkill. Render on change later.
  update();
  if(canvas_change)
    render();
  canvas_change = false;
}
function activate_manual_marking_mode() {
  marking_mode = true;
  $('#pass-button').prop('disabled', true);
  $('#resign-button').prop('disabled', true);
  marking_dialog();
}
function deactivate_manual_marking_mode() {
  marking_mode = true;
  $('#pass-button').prop('disabled', false);
  $('#resign-button').prop('disabled', false);
}
function mark_move(mark){
  if(!marking_list.add(mark)){
    dispute_mark_dialog();
    //Confirm dialog
  }
  else {
    if(mark.color == player_color)
      send_data({mark: {x: mark.x, y: mark.y, color: mark.color}});
  }
  canvas_change = true;
}
function play_move(move) {
  //Place stone
  if(board == null) // This is to prevent a situation where one player sends a move to a person who hasn't initalized his board. Can happen.
    init();
  if(move.stone != null){
    var stone = move.stone
    if(board.place_stone(stone.x, stone.y)){
      update_capture_text(); 
    }
    else { //If move was legal
      illegal_move_dialog();
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
    winner_dialog();
  }
  if(move.color == player_color){
      send_data({move: move});
  }
  update_event_history(move);
  mark_active_player();
  canvas_change = true;
  $('#chat-message').focus();
}

function init() {
  if(board == null && board_view == null) {
    console.log('initializing game');
    var size = Number($('#size').val());
    board = new Board(size);
    board_view = new BoardView(size, canvas_width);
    $('#game-container').show();
    $('#search-box').hide();
    
    mark_active_player();
    tick();
  }
}

function get_mouse_pos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

$(function() {  //document ready short
  canvas = document.getElementById('go-canvas');
  canvas.width = canvas.height = canvas_width = $(window).innerHeight() * 0.9;
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
      canvas.width = canvas.height = canvas_width = $(window).innerHeight() * 0.9 ;
      board_view.recalculate_size(canvas_width);
    }
  });

  $(window).unload(function(){
    send_data({disconnect: true});
  });
  //Add functionality to chat button
  $('#chat-send').click(function(){
    var msg = $('#chat-message').val();
    $('#chat-message').val('');
    if(msg != ''){
      send_data({msg: msg, color: player_color});
      update_event_history({msg: msg, color: player_color});
    }  
  });
  //Add functionality to marking complete button
  $('#marking-button').hide();
  $('#marking-button').click() {
    //Remove stones after coordinats of marks
  }
  //Add functionality to search button
  $('#search-button').prop('disabled', true); // Disabled until clients has acquired a peer id
  $('#search-button').click(function(){
      $('.ui-state-error').remove();
      $('#id').val(my_id);
      names.client = $('#username').val();
      $('#search-text').text('Searching for opponent...');
      $(this).prop('disabled', true);
      search_match();
  }); //End of search button
}); //End of document ready
