(function(){
  var canvas_width = 800;
  var canvas, ctx;
  var board_view;
  var board;

  var peer = new Peer({key: 'slhk5rehnzc15rk9', 
                      config: {'iceServers': [
                      { url: 'stun:stun.l.google.com:19302' },
                      { url: 'stun:stun1.l.google.com:19302' },
                      { url: 'stun:stun2.l.google.com:19302' },
                      { url: 'stun:stun3.l.google.com:19302' },
                      { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }}, 
                      debug: 2});
  var conn = null;
  var my_id;    //A token to connec to this peer
  var player_color; //Player color in the game.

  //Logging to event history
  function update_event_history(move){
    var evt_string = '<li><span>';
    var color_string = (move.color == 1) ? 'Black ' : 'White ';
    if(move.stone != null) 
      evt_string += color_string + 'played at ' + (move.stone.x + 1) + ', ' + (move.stone.y); 
    
    else if(move.pass != null)
      evt_string += color_string + 'passed';
    else if(move.resign != null)
      evt_string += color_string + 'resigned. You win!'
    evt_string += '</span></li>';
    $('#event-list').append(evt_string);
    //Scroll to bottom of log
    $("#event-history").animate({ scrollTop: $("#event-history")[0].scrollHeight}, 1000);
  }
  //Animation effects
  function switch_player_cards() {
    var black_move = $('#player-black').outerHeight() * ((board.current_player == 1) ? -1 : 1);
    var white_move = black_move * -1;
    var black_string = "+=" + black_move.toString() + "px";
    var white_string = "+=" + white_move.toString() + "px";
    $('#player-black').animate({
      top: black_string
    }, 1000)
    $('#player-white').animate({
      top: white_string
    }, 1000)

  }

  //Gameboard interactions
  function update() {
    //?
  }
  
  function render() {
    board_view.draw(board, ctx); 
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
        update_event_history(move);
      }
    }
    //Pass
    else if(move.pass != null) {
      board.player_pass();
      update_event_history(move);
    }
    else if(move.resign != null) {
      console.log('hello?');
      board.player_resign(move.color);
      update_event_history(move);
      winner_dialog();
    }
    if(move.color == player_color){
        send_data({move: move});
    }
    if(move.resign == null)
      switch_player_cards();
  }
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

  function tick() {
      window.requestAnimationFrame(tick); //This is a bit overkill. Render on change later.
      update();
      render();
    
      
  }

  function init() {
    console.log('initializing game');
    if(board == null && board_view == null){
      var size = Number($('#size').val());
      board = new Board(size);
      board_view = new BoardView(size, canvas_width);
      $('#game-container').show();
      $('#search-box').hide();
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
  
  //Network functions
  var send_data = function(msg) {
    conn.send(msg);
  }

  var connect_to_player = function(id, request_connect_back){
    conn = peer.connect(id);
    conn.on('open', function(){
      if(request_connect_back == true){
        player_color = Math.round(Math.random()); // Random a color
        conn.send({id: my_id, opponent_color: player_color}); //Send info so peer can connect back
      }          
      console.log((player_color == 1) ? 'black' : 'white');
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
      else if(data.move != null){
        play_move(data.move);
      }

      else if(data.disconnect != null) {
        if(board.winner == null) {
          board.set_winner(player_color);
          winner_dialog();
        }
      }
      else
        console.log(data);
      });
  });

  peer.on('error', function(err){
    console.log(err);
    location.reload(); // FIXME this is sort of a hack. Matching probably failed because received id was dead, 
                       // both ids are removed this way and client gets a new one. User should atleast be informed somehow what happened.
  });

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
        console.log('listener');
        play_move({resign: true, color: player_color});
      }
    });
    //Detect mouse movement
    $(canvas).mousemove(function(e){
      var mouse_pos = get_mouse_pos(canvas, e);
      board_view.update_mouse_marker(mouse_pos.x, mouse_pos.y);
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
    
    //Add functionality to search button
    $('#search-button').prop('disabled', true); // Disabled until clients has acquired a peer id
    $('#search-button').click(function(){
        $('#id').val(my_id);
        $('#search-text').text('Searching for opponent...');
        $(this).prop('disabled', true);
    $.ajax({
        type : "POST",
        url : SCRIPT_ROOT + "/search",
        data: $('#search-form').serialize(),
        success: function(result) {
                console.log(result)
                if(result['id'] != null)
                    connect_to_player(result['id'], true);
            },
        error: function(error) {
          console.log(error);
        }
      }); //End of Ajax
    }); //End of search button
  });
}());