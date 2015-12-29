function Connection() {
  var peer = new Peer({key: 'slhk5rehnzc15rk9', 
                      config: {'iceServers': [
                      { url: 'stun:stun.l.google.com:19302' },
                      { url: 'stun:stun1.l.google.com:19302' },
                      { url: 'stun:stun2.l.google.com:19302' },
                      { url: 'stun:stun3.l.google.com:19302' },
                      ]}, 
                      debug: 2});
  var conn = null;
  var my_id;    //A token to connect to this peer

  this.get_id = function() { return my_id; }

  //Network functions
  /**
   * Send message to peer, message should be sent in a dict like structur {msg: 'hello'}
   * @param  {dict} - Different keywords will have different responses. {move: move}, will play a move
   */
  var send_data = function(msg) {
    if(conn != null)
      conn.send(msg);
  }
  /**
   * Used to acces send_data from outside sources.
   */
  this.send = function(msg) {
    send_data(msg);
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
      else if(data.mark != null)
        mark_move(data.mark);
      else if(data.complete_mark != null) {
        update_marking_ready({opponent: data.complete_mark});
      }
      else
        console.log(data);
      });
  });

  peer.on('error', function(err){
    console.log(err);
    $('body').append("<div class='ui-state-error'>" + err + "</div>");

    $('#search-button').prop('disabled', false);
    $('#search-text').text('Welcome! Press the search button to find an opponent');
    // both ids are removed this way and client gets a new one. User should atleast be informed somehow what happened.
  });

  this.search_match = function() {
    console.log('gonna search');
    $('#id').val(my_id);
    $.ajax({
      type : "POST",
      url : SCRIPT_ROOT + "/search",
      data: $('#search-form').serialize(),
      success: function(result) {
        if(result['id'] != null)
          connect_to_player(result['id'], true);
        else
          console.log(result);
        },
      error: function(error) {
        console.log(error);
      }
    }); //End of Ajax
  }
}
