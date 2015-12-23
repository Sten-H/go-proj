(function(){
  var canvas_width = 800;
  var canvas, ctx;
  var board_view;
  var board;
  var names = {client: null, opponent: null};
  var canvas_change = true; //Rudimentary render optimization. Renders on mouse move, and on board events.
  var peer;
  function create_peer() {
    peer = new Peer({key: 'slhk5rehnzc15rk9', 
                      config: {'iceServers': [
                      { url: 'stun:stun.l.google.com:19302' },
                      { url: 'stun:stun1.l.google.com:19302' },
                      { url: 'stun:stun2.l.google.com:19302' },
                      { url: 'stun:stun3.l.google.com:19302' },
                      ]}, 
                      debug: 2});
  }
  create_peer();
  var conn = null;
  var my_id;    //A token to connec to this peer
  var player_color; //Player color in the game.

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

  function change_search_button_text(text){
    $('#search-button').text(text);
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
  
  //Gameboard interactions
  function update() {
    //?
  }
  
  function render() {
    board_view.draw(board, ctx); 
  }

  function tick() {
    window.requestAnimationFrame(tick); //This is a bit overkill. Render on change later.
    update();
    if(canvas_change)
      render();
    canvas_change = false;
  }


  function play_move(move) {
    //Place stone
    if(board == null) // This is to prevent a situation where one player sends a move to a person who hasn't initalized his board. Can happen.
      init();
    if(move.stone != null){
      var stone = move.stone
      if(!board.place_stone(stone.x, stone.y)){
        illegal_move_dialog();
        return;
      }
      else { //If move was legal
        update_capture_text();
      }
    }
    else if(move.pass != null) {
      board.player_pass();
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
  }

  function init() {
    console.log('initializing game');
    if(board == null && board_view == null){
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
  //Network functions
  var send_data = function(msg) {
    if(conn != null)
      conn.send(msg);
  }

  var connect_to_player = function(id, request_connect_back){
    conn = peer.connect(id);
    conn.on('open', function(){
      if(request_connect_back == true){
        player_color = Math.round(Math.random()); // Random a color
        conn.send({id: my_id, opponent_color: player_color}); //Send info so peer can connect back
      }          
      conn.send({opponent_name: names.client}); //Send client nickname.
      init();
    });
  }

  peer.on('open', function(id) {
    my_id = id;
    $('#search-button').prop('disabled', false);
    console.log('My peer ID is: ' + id);
  });

  //Receiving connection
  peer.on('connection', function(connection) {
  //Connection sending data
    connection.on('data', function(data){
      if(data.id != null) {
        player_color = (data.opponent_color == 1) ? 0 : 1;
        connect_to_player(data.id, false); // Connect back to peer
      }

      if(data.opponent_name != null) { // If we receive opponent name, we store it.
        if(names.opponent == null){
          names.opponent = data.opponent_name;
          set_names_on_cards();
          send_data({opponent_name: names.client});
        }
      }
      else if(data.move != null){
        play_move(data.move);
      }

      else if(data.disconnect != null) {
        if(board.winner == null) {
          board.set_winner(player_color);
          winner_dialog();
        }
      }
      else if(data.msg != null) {
        update_event_history({msg: data.msg, color: data.color});
      }
      else
        console.log(data);
      });
  });

  peer.on('error', function(err){
    console.log(err);
    $('body').append("<div class='ui-state-error'> An error occured connecting to opponent. Please try again. Sorry :(");
    $('#search-button').prop('disabled', false);
    $('#search-text').text('Welcome! Press the search button to find an opponent');
                       // both ids are removed this way and client gets a new one. User should atleast be informed somehow what happened.
  });
  function search_match() {
    $.ajax({
    type : "POST",
    url : SCRIPT_ROOT + "/search",
    data: $('#search-form').serialize(),
    success: function(result) {
            if(result['id'] != null)
                connect_to_player(result['id'], true);
        },
    error: function(error) {
      console.log(error);
    }
  }); //End of Ajax
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
      if(player_color == board.current_player && board.winner == null){
        var mouse_pos = get_mouse_pos(canvas, e);
        var tile_pos = board_view.get_tile_coord(mouse_pos.x, mouse_pos.y);
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
}());