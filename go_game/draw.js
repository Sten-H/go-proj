(function() {
  'use strict';
  
  var canvas_width = 800;
  var canvas, ctx;
  var board_view;
  var board;

  function DrawStone {
    static draw(stone, tile_size, offset) {
      ctx.beginPath();
      var midpoint_x = stone.x * tile_size + offset;
      var midpoint_y = stone.y * tile_size + offset;
      ctx.arc(midpoint_x, midpoint_y, tile_size / 2, 0, 2 * Math.PI );
      ctx.fillStyle = (stone.color == 1) ? 'black' : 'white';
      ctx.fill(); 

      //Draw liberty count on top
      ctx.font = "12px Arial";
      ctx.fillStyle = (stone.color == 1) ? 'white' : 'black';
      ctx.fillText(stone.liberty_count, midpoint_x, midpoint_y);
    };
  }
  
  class BoardView {
    
    constructor(tile_amount) {
      this.mouse_marker = {}; //This is stored in board position, not pixel coordinates.
      this.tile_amount = tile_amount;
      this.tile_size = canvas_width / this.tile_amount;
      this.offset = this.tile_size / 2; // The board is not at 0, 0 coordinates in canvas    
    }
    recalculate_size() {
      this.tile_size = canvas_width / this.tile_amount;
      this.offset = this.tile_size / 2;
    }
    get_tile_coord(coord_x, coord_y) {
      var tile_coord = {x: Math.floor(coord_x / this.tile_size),
                        y: Math.floor(coord_y / this.tile_size)};
       return tile_coord;
    }

    update_mouse_marker(coord_x, coord_y) {
      var min_break = this.offset / 2;
      var max_break = canvas_width - this.offset / 2;
      
      if(coord_x > min_break && coord_y > min_break &&
         coord_x < max_break && coord_y < max_break) {
        this.mouse_marker = this.get_tile_coord(coord_x, coord_y);
      }
      else {
        this.mouse_marker = {};
      }
    }
    draw_mouse_marker() {
        //color should be set somewhere 
      if(this.mouse_marker == null) {
        return;
      }
      else {
        var rect_size = this.tile_size * 0.3;
        var marker_coord = {x: this.mouse_marker.x * this.tile_size + this.offset,
                            y: this.mouse_marker.y * this.tile_size + this.offset};
        ctx.fillStyle =  (board.current_player == 1) ? 'black' : 'white';
        ctx.fillRect(marker_coord.x - rect_size / 2, marker_coord.y - rect_size / 2, rect_size, rect_size);
      }
    }
    draw_background() {
      //Draw background image (wood texture)
      var img = document.getElementById('wood');
      var pat = ctx.createPattern(img,"no-repeat");
      ctx.rect(0,0, canvas_width, canvas_width);
      ctx.fillStyle = pat;
      ctx.fill();
    };
    draw_board_lines() {
      for(var i = 0; i < this.tile_amount; i++) {
        //Draw vertical line
        ctx.beginPath();
        ctx.moveTo(i * this.tile_size + this.offset, 0 + this.offset);
        ctx.lineTo(i * this.tile_size + this.offset, (this.tile_amount - 1) * this.tile_size + this.offset);
        ctx.stroke();
        
        //Draw Horizontal line
        ctx.beginPath();
        ctx.moveTo(0 + this.offset, i * this.tile_size + this.offset);
        ctx.lineTo( (this.tile_amount - 1) * this.tile_size + this.offset, i * this.tile_size + this.offset);
        ctx.stroke();
        ctx.fillStyle = 'black';
        //Draw vertical line text
        ctx.font = "12px Arial";
        ctx.fillText(i + 1, 0 + this.offset / 2, i * this.tile_size + this.offset * 1.15);
        
        //Draw horizontal line text
        ctx.fillText(i + 1, i * this.tile_size + this.offset * 1.15, 0 + this.offset / 2);
      }
      //Draw center circle
      ctx.beginPath();
      var midpoint = Math.floor(this.tile_amount / 2) * this.tile_size + this.offset;
      ctx.arc(midpoint, midpoint, this.tile_size*0.075, 0, 2 * Math.PI );
      ctx.fillStyle = 'black';
      ctx.fill();
    };
    
    draw() {
      this.draw_background();
      this.draw_board_lines();
      this.draw_mouse_marker();
      //draw stones
      var stones = board.get_stones();
      for(var x = 0; x < this.tile_amount; x++)
        for(var y = 0; y < this.tile_amount; y++)
          if(stones[x][y] != null)
            DrawStone.draw(stones[x][y], this.tile_size, this.offset);

    };
    
    init() {
      this.draw();
    };
  }
  function init() {
    board = new Board(9);
    board_view = new BoardView(9);
    board_view.init();
  }
  function update() {
  }
  
  function render() {
    board_view.draw();
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
          click: function() {
            $( this ).dialog( "close" );
          }
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
      board_view.recalculate_size();
    });

    init();
    tick();
  });
}());

