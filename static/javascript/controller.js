(function(){
  var canvas_width = 800;
  var canvas, ctx;
  var board_view;
  var board;

  var peer = new Peer({key: 'lwjd5qra8257b9', debug: 2});
  var conn = null;
  var my_id;    //A token to connec to this peer
  var player_color; //Player color in the game.


//Gameboard interaction


  
  function update() {
    //?
  }
  
  function render() {
    board_view.draw(board, ctx); 
  }

  function play_opponent_move(x, y, color) {
    board.place_stone(x, y);
  }

  function tick() {
    if(board.getWinner() == null){
      window.requestAnimationFrame(tick); //This is a bit overkill. Render on change later.
      update();
      render();
    }
    else {
      var winner_string = (board.getWinner() == 1) ? 'Black' : 'White';
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
  }

  function init() {
    console.log('initializing game');
    
    board = new Board(13);
    board_view = new BoardView(13, canvas_width);
    $('#game-container').show();
    $('#search-box').hide();
    tick();
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
    console.log('My peer ID is: ' + id);
  });

  //Receiving connection
  peer.on('connection', function(connz) {
  //Connection sending data
    connz.on('data', function(data){
      if(data.id != null) {
        player_color = (data.opponent_color == 1) ? 0 : 1;
        connect_to_player(data.id, false); // Connect back to peer
      }
      else if(data.move != null){
        console.log('gonna play oppoent move');
        play_opponent_move(data.move.x, data.move.y, data.color);
      }
      else
        console.log(data);
      });
  });

  $(function() {  //document ready short
    canvas = document.getElementById('go-canvas');
    canvas.width = canvas.height = canvas_width = $(window).innerHeight() * 0.9;
    ctx = canvas.getContext("2d");

    //Add listener to pass button
    $('#pass-button').click(function(){
      board.player_pass();
    });
    //Add listener to resign button
    $('#resign-button').click(function(){
      board.player_resign();
    });
    //Detect mouse movement
    $(canvas).mousemove(function(e){
      var mouse_pos = get_mouse_pos(canvas, e);
      board_view.update_mouse_marker(mouse_pos.x, mouse_pos.y);
    });
    //Detect mouse click
    $(canvas).click(function(e) {
      if(player_color == board.current_player){
        var mouse_pos = get_mouse_pos(canvas, e);
        var tile_pos = board_view.get_tile_coord(mouse_pos.x, mouse_pos.y);
        if(!board.place_stone(tile_pos.x, tile_pos.y))
          illegal_move_dialog();
        else{
          send_data({move: {x: tile_pos.x, y: tile_pos.y}, player_color});
        }
      }
    });
    //Detect resize
    $(window).resize(function(evt){
      if(board_view != null){
        canvas.width = canvas.height = canvas_width = $(window).innerHeight() * 0.9 ;
        board_view.recalculate_size(canvas_width);
      }
    });
    
    //Add functionality to search button
    $('#search-form').submit(function(event){
        event.preventDefault();
    });
    
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
    //init();
    //tick();
  });
}());