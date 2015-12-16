(function(){
  var canvas_width = 800;
  var canvas, ctx;
  var board_view;
  var board;

function init() {
    board = new Board(9);
    board_view = new BoardView(9, canvas_width);
  }
  
  function update() {
    //?
  }
  
  function render() {
    board_view.draw(board, ctx); 
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
      var mouse_pos = get_mouse_pos(canvas, e);
      var tile_pos = board_view.get_tile_coord(mouse_pos.x, mouse_pos.y);
      if(!board.place_stone(tile_pos.x, tile_pos.y))
        illegal_move_dialog();
    });
    //Detect resize
    $(window).resize(function(evt){
      canvas.width = canvas.height = canvas_width = $(window).innerHeight() * 0.9 ;
      board_view.recalculate_size(canvas_width);
    });

    init();
    tick();
  });
}());