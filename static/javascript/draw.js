function get_gradient(x, y, current_color, tile_size, ctx) {
  var gradient = ctx.createLinearGradient(x-tile_size/2,y-tile_size/2,x+tile_size/2,y+tile_size/2);
  var color1;
  var color2;
  if(current_color == 1){
    color1 = '#444444';
    color2 = '#171717';
  }
  else {
    color1 = '#FFFFFF';
    color2 = '#DEDEDE';
  }
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}
function draw_mark(mark, tile_size, offset, ctx) {
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = 'red';
  ctx.fillText("X", mark.x * tile_size + offset - 20, mark.y * tile_size + offset);
  ctx.font = "bold 12px Arial";
  ctx.fillStyle = 'red';
  var color_string = (mark.color == 1) ? 'B' : 'W';
  ctx.fillText(color_string, mark.x * tile_size + offset, mark.y * tile_size + offset);
}
function draw_stone(stone, tile_size, offset, ctx) {  
    ctx.beginPath();

    var midpoint_x = stone.x * tile_size + offset;
    var midpoint_y = stone.y * tile_size + offset;
      
    ctx.shadowBlur=tile_size*0.15;
    ctx.shadowOffsetY=tile_size*0.04;
    ctx.shadowOffsetX=tile_size*0.04;
    ctx.shadowColor="#4F4F4F";

    ctx.arc(midpoint_x, midpoint_y, tile_size / 2, 0, 2 * Math.PI );
    //In the end I should probably just use images for the stones, right now its a gradient, and shadow.
    ctx.fillStyle = get_gradient(midpoint_x, midpoint_y, stone.color, tile_size, ctx);
    ctx.fill(); 
    ctx.shadowBlur=0;
    ctx.shadowOffsetY=0;
    ctx.shadowOffsetX=0;
}

function BoardView(tile_amount, canvas_width) {
    this.mouse_marker = {}; //This is stored in board position, not pixel coordinates.
    this.tile_amount = tile_amount;
    this.tile_size = canvas_width / this.tile_amount;
    this.offset = this.tile_size / 2; // The board is not at 0, 0 coordinates in canvas    
  
  this.recalculate_size = function(canvas_width) {
    this.tile_size = canvas_width / this.tile_amount;
    this.offset = this.tile_size / 2;
  }
  this.get_tile_coord = function(coord_x, coord_y) {
    var tile_coord = {x: Math.floor(coord_x / this.tile_size),
                      y: Math.floor(coord_y / this.tile_size)};
     return tile_coord;
  }

  this.update_mouse_marker = function(coord_x, coord_y) {
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
  this.draw_mouse_marker = function(ctx, current_player) {
    if(this.mouse_marker == null) {
      return;
    }
    else {
      var rect_size = this.tile_size * 0.3;
      var marker_coord = {x: this.mouse_marker.x * this.tile_size + this.offset,
                          y: this.mouse_marker.y * this.tile_size + this.offset};
      ctx.fillStyle =  (current_player == 1) ? 'black' : 'white';
      ctx.fillRect(marker_coord.x - rect_size / 2, marker_coord.y - rect_size / 2, rect_size, rect_size);
    }
  }
  this.draw_background = function(ctx) {
    //Draw background image (wood texture)
    var img = document.getElementById('wood');
    var pat = ctx.createPattern(img,"no-repeat");
    ctx.rect(0,0, canvas_width, canvas_width);
    ctx.fillStyle = pat;
    ctx.fill();
  }
  this.draw_board_lines = function(ctx) {
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
      ctx.fillStyle = '#3B3B3B';
      //Draw vertical line text
      ctx.font = "bold 16px Arial";
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
  }
  
  this.draw = function(board, ctx) {
    this.draw_background(ctx);
    this.draw_board_lines(ctx);
    this.draw_mouse_marker(ctx, board.current_player);
    //draw stones
    var stones = board.stones;
    for(var x = 0; x < this.tile_amount; x++)
      for(var y = 0; y < this.tile_amount; y++)
        if(stones[x][y] != null)
          draw_stone(stones[x][y], this.tile_size, this.offset, ctx);
  }

  this.draw_markings = function(markings, ctx){
    for(var i = 0; i < markings.length; i++) {
      draw_mark(markings[i], this.tile_size, this.offset, ctx);
    }
  }
}
