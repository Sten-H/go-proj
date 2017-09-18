/**
 * Connection functions keeps track of the clients peer (opponent) and
 * all communications between them. Because peerjs uses alot of callbacks
 * on network events it's created quite the spaghetti code. This object
 * will run global functions from controller.js. It's kinda scary.
 */
var network = {};  // Namespace for network connection
(function (context) {
  'use strict';
  /**
   * Create new Peer object (peerjs), key is to access a peerjs server (can create my own later)
   * Stun servers are added to avoid NAT issues, the peer to peer play will not work without it
   * except locally.
   */
  var peer = new Peer({key: 'slhk5rehnzc15rk9',
                      config: {'iceServers': [
                      { url: 'stun:stun.l.google.com:19302' },
                      { url: 'stun:stun1.l.google.com:19302' },
                      { url: 'stun:stun2.l.google.com:19302' },
                      { url: 'stun:stun3.l.google.com:19302' },
                      ]}, 
                      debug: 2,
                      //secure: true,
                      secure: false,
                      host: 'go.stenh.com',
                      path: '/peerjs',
                      port: 80
			});
                      //port: 443});
  var conn = null;  // I don't remember this clearly, but I think this is the connection for this peer to send to other peer
  var my_id;    //A token to connect to this peer

  this.get_id = function() { return my_id; };

  /**
   * Send message to peer, message should be sent in a dict like structur {msg: 'hello'}
   * @param  {dict} - Different keywords will have different responses. {move: move}, will play a move
   */
  var send_data = function(msg) {
    if(conn !== null)
      conn.send(msg);
  };

  // Public wrapper of send_data
  this.send = function(msg) {
    send_data(msg);
  };

  /**
   * Connects to a player. If request_connect_back is true it will tell the
   * peer we're connecting to to connect back to this peer. The first connectee will
   * request connect back.
   * @param  {String} id                    - peerjs token
   * @param  {Boolean} request_connect_back - If true will request peer to connect back
   */
  var connect_to_player = function(id, request_connect_back){
    conn = peer.connect(id);
    conn.on('open', function(){
      if(request_connect_back === true){
        player_color = Math.round(Math.random()); // Random a color
        conn.send({id: my_id, opponent_color: player_color}); //Send info so peer can connect back
      }          
      conn.send({opponent_name: names.client}); //Send client nickname.
      init();
    });
  };

  // When Peer object is created, set my_id to peerjs token
  peer.on('open', function(id) {
    my_id = id;  // peerjs token is assigned
    $('#search-button').prop('disabled', false);  // Activates search button
    console.log('My peer ID is: ' + id);
  });

  //Receiving connection
  peer.on('connection', function(connection) {
    //Connection sending data
    connection.on('data', function(data){
      if("id" in data) {
        player_color = (data.opponent_color == 1) ? 0 : 1;
        connect_to_player(data.id, false); // Connect back to peer
      }
      if("opponent_name" in data) { // If we receive opponent name, we store it.
        if(names.opponent === null){
          names.opponent = data.opponent_name;
          send_data({opponent_name: names.client});
        }
      }
      else if("move" in data){
        play_move(data.move);
      }
      else if("disconnect" in data) {
        if(board.winner === null) {
          var loser = (player_color == 1) ? 0 : 1;
          //board.set_winner(player_color);
          play_move({resign: true, color: loser});
        }
      }
      else if("msg" in data) {
        console.log('I received a chat message');
        gui.update_event_history({msg: data.msg, color: data.color});
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
  
  // The most common error is being matched with a dead token (someone pressing search then exiting before matched)
  peer.on('error', function(err){
    console.log(err);
    $('.content').prepend("<div class='ui-state-error'>" + err + "</div>");
    $('#search-button').prop('disabled', false);
    $('#search-text').text('Welcome! Press the search button to find an opponent');
    // both ids are removed this way and client gets a new one. User should atleast be informed somehow what happened.
  });

  /**
   * This function is called when search match button is pressed. It will tell the backend
   * to put the clients peerjs token in the player queue. If a match is found it will return
   * the opponents peerjs token.
   * @return {[type]} [description]
   */
  this.search_match = function() {
    $('#id').val(my_id);
    $.ajax({
      type : "POST",
      url : SCRIPT_ROOT + "/search",
      data: JSON.stringify({id: my_id, size: $('#size').val()}),
      contentType: 'application/json;charset=UTF-8',
      success: function(result) {
        if(result.id != null)
          connect_to_player(result.id, true);
        else
          console.log(result);
        },
      error: function(error) {
        console.log(error);
      }
    }); //End of Ajax
  };

  /**
   * Updates a users win/loss/draw record by increment of given numbers
   * @param  {String} name - Username
   * @param  {Number} win  - Update wins by this amount
   * @param  {Number} loss - Update losses by this amount
   * @param  {Number} draw - Update draws by this amount
   */
  var report_results = function(name, win, loss, draw) {
    $.ajax({
      type : "POST",
      url : SCRIPT_ROOT + "/record_results",
      data: JSON.stringify({username: name, wins: win, losses: loss, draws: draw}),
      contentType: 'application/json;charset=UTF-8',
      success: function(result) {
        console.log('I sent the results!');
        },
      error: function(error) {
        console.log(error);
      }
    }); //End of Ajax
  };

  this.report_win = function(name) {
    report_results(name, 1, 0, 0);
  };

  this.report_loss = function(name) {
    report_results(name, 0, 1, 0);
  };

  this.report_draw = function(name) {
    report_results(name, 0, 0, 1);
  };

  /**
   * Reports the game specific results to the backend. This includes
   * board size, end score, winner, player names (by color), and a
   * smart game format string which contains the whole game play by play and more.
   * @param  {String} black        - Username of black player
   * @param  {String} white        - Username of white player
   * @param  {String} winner       - Username of winner
   * @param  {Number} size         - Board size of game
   * @param  {String} score_string - String describing final game state
   * @param  {String} sgf          - smart game format string, contains whole game history.
   */
  this.report_game_results = function(black, white, winner, size, score_string, sgf) {
    $.ajax({
      type : "POST",
      url : SCRIPT_ROOT + "/record_game",
      data: JSON.stringify({black: black, white: white, size: size, winner: winner, score_string: score_string, sgf: sgf}),
      contentType: 'application/json;charset=UTF-8',
      success: function(result) {
        console.log('I sent game info to server!');
        },
      error: function(error) {
        console.log(error);
      }
    }); //End of Ajax
  };
}).apply(network);  // Apply assign all this above to the connection object so it effetively becomes a namespace.
