var draw = {};
(function(context) {
  "use strict";

  //Returns a gradient on the current pixel coordinates, color depends on
  //the stone to be drawn.
  function get_gradient(x, y, current_color, radius, ctx) {
    var gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    var color1;
    var color2;
    if (current_color === 1 || current_color === 3) { // 3 is black territory color, for end screen
      color1 = '#353535';
      color2 = '#000';
    } else {
      color1 = '#FFFFFF';
      color2 = '#DEDEDE';
    }
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  /**
   * BoardView object can draw a Board object to a HTML canvas
   * to visualize the game state. The canvas is square
   * @param {Number} tile_amount  - This is board size
   * @param {Number} canvas_width - Pixel width of canvas (canvas is square)
   * @param {2DContext} ctx       - Canvas context
   */
  function BoardView(tile_amount, canvas_width, ctx) {
    this.mouse_marker = {}; //This is stored in board position, not pixel coordinates.
    this.tile_amount = tile_amount;
    this.tile_size = canvas_width / this.tile_amount;
    this.offset = this.tile_size / 2; // The board is not at 0, 0 coordinates in canvas    
    this.ctx = ctx;
    this.canvas_width = canvas_width;

    /**
     * Recalculates size if window is resized
     * @param  {Number} canvas_width - New pixel width
     */
    this.recalculate_size = function (canvas_width) {
      this.tile_size = canvas_width / this.tile_amount;
      this.offset = this.tile_size / 2;
      this.canvas_width = canvas_width;
    };
    /**
     * Translates pixel coordinate to grid coordinate. For example
     * 300, 300 pixel coordinate might be 5,5 grid coordinate
     * @param  {Number} coord_x - Pixel coordinate
     * @param  {Number} coord_y - Pixel coordinate
     * @return {Dict} Returns a dict with x, y grid coordinates
     */
    this.get_tile_coord = function (coord_x, coord_y) {
      var tile_coord = {x: Math.floor(coord_x / this.tile_size),
                        y: Math.floor(coord_y / this.tile_size)};
      return tile_coord;
    };

    this.update_mouse_marker = function (coord_x, coord_y) {
      var min_break = this.offset / 2;
      var max_break = canvas_width - this.offset / 2;

      if (coord_x > min_break && coord_y > min_break &&
          coord_x < max_break && coord_y < max_break) {
        this.mouse_marker = this.get_tile_coord(coord_x, coord_y);
      } else {
        this.mouse_marker = {};
      }
    };

    /**
     * Draws a marker that snaps to grid underneath the user's
     * mouse position. Color depends on active player.
     * @param  {[type]} current_player - Current player color
     */
    this.draw_mouse_marker = function (current_player) {
      if (this.mouse_marker === null) {
        return;
      } else {
        var rect_size = this.tile_size * 0.3;
        var marker_coord = {x: this.mouse_marker.x * this.tile_size + this.offset,
                            y: this.mouse_marker.y * this.tile_size + this.offset};
        this.ctx.fillStyle =  (current_player === 1) ? 'black' : 'white';
        this.ctx.fillRect(marker_coord.x - rect_size / 2, marker_coord.y - rect_size / 2, rect_size, rect_size);
      }
    };

    this.draw_background = function() {
      //Draw background image (wood texture)
      var img = document.getElementById('wood');
      var pat = this.ctx.createPattern(img, "repeat");
      this.ctx.rect(0, 0, this.canvas_width, this.canvas_width);
      this.ctx.fillStyle = pat;
      this.ctx.fill();
    };

    /**
     * Draws the star points on the grid.
     */
    this.draw_circle_points = function() {
      if(this.tile_amount === 9){
        this.ctx.fillStyle = 'black';
        //midpoint mark
        this.ctx.beginPath();
        var midpoint = Math.floor(this.tile_amount / 2) * this.tile_size + this.offset;
        this.ctx.arc(midpoint, midpoint, this.tile_size*0.075, 0, 2 * Math.PI );
        this.ctx.fill();
        //corner marks
        for(var x = 2; x <= 6; x += 4) {
          for(var y = 2; y <= 6; y += 4) {
            this.ctx.beginPath();
            var midpoint_x = x * this.tile_size + this.offset;
            var midpoint_y = y * this.tile_size + this.offset;
            this.ctx.arc(midpoint_x, midpoint_y, this.tile_size*0.075, 0, 2 * Math.PI );
            this.ctx.fill();
          }
        }
      }
    };

    this.draw_board_lines = function() {
      for(var i = 0; i < this.tile_amount; i++) {
        //Draw vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(i * this.tile_size + this.offset, 0 + this.offset);
        this.ctx.lineTo(i * this.tile_size + this.offset, (this.tile_amount - 1) * this.tile_size + this.offset);
        this.ctx.stroke();

        //Draw Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(0 + this.offset, i * this.tile_size + this.offset);
        this.ctx.lineTo( (this.tile_amount - 1) * this.tile_size + this.offset, i * this.tile_size + this.offset);
        this.ctx.stroke();
        this.ctx.fillStyle = '#3B3B3B';
        //Draw vertical line text
        this.ctx.font = "bold 16px Arial";
        this.ctx.fillText(i + 1, 0 + this.offset / 2, i * this.tile_size + this.offset * 1.15);

        //Draw horizontal line text
        this.ctx.fillText(i + 1, i * this.tile_size + this.offset * 1.15, 0 + this.offset / 2);
      }
      //Draw center circle
      this.draw_circle_points();
    };

    this.draw_stone = function(stone) {
      if(stone.color != -1) {
        var midpoint_x = stone.x * this.tile_size + this.offset;
        var midpoint_y = stone.y * this.tile_size + this.offset;

        this.ctx.shadowBlur = this.tile_size*0.125;
        this.ctx.shadowOffsetY = this.tile_size*0.03;
        this.ctx.shadowOffsetX = this.tile_size*0.03;
        this.ctx.shadowColor="#4F4F4F";

        var radius = (this.tile_size / 2) * 0.98;
        if(stone.color > 1)
          radius = this.tile_size / 5;
        this.ctx.beginPath();
        this.ctx.arc(midpoint_x, midpoint_y, radius, 0, 2 * Math.PI );
        //In the end I should probably just use images for the stones, right now its a gradient, and shadow.
        this.ctx.fillStyle = get_gradient(midpoint_x, midpoint_y, stone.color, radius, this.ctx);
        this.ctx.fill();
        this.ctx.shadowBlur=0;
        this.ctx.shadowOffsetY=0;
        this.ctx.shadowOffsetX=0;
      }
    };

    /**
     * Draws a marking of a dead stone by a player
     * @param  {Mark} mark - Mark object to be drawn
     */
    this.draw_mark = function(mark) {
      this.ctx.font = "bold 30px Arial";
      this.ctx.fillStyle = 'red';
      this.ctx.fillText("X", mark.x * this.tile_size + this.offset - 20, mark.y * this.tile_size + this.offset);
      this.ctx.font = "bold 12px Arial";
      this.ctx.fillStyle = 'red';
      var color_string = (mark.color == 1) ? 'B' : 'W';
      this.ctx.fillText(color_string, mark.x * this.tile_size + this.offset, mark.y * this.tile_size + this.offset);
    };

    /**
     * Draws all markings
     * @param  {Array} markings  List of all marks
     */
    this.draw_markings = function(markings){
      for(var i = 0; i < markings.length; i++) {
        this.draw_mark(markings[i]);
      }
    };

    this.draw = function(board) {
      this.draw_background(this.ctx);
      this.draw_board_lines(this.ctx);
      this.draw_mouse_marker(this.ctx, board.current_player);
      //draw stones
      var stones = board.stones;
      for(var x = 0; x < this.tile_amount; x++)
        for(var y = 0; y < this.tile_amount; y++)
          if(stones[x][y] !== null)
            this.draw_stone(stones[x][y], this.ctx);
    };
  }
  
  /**
   * Creates and return a BoardView object
   * @param   {Number} size         board size expressed in tile amount (9 = 9x9)
   * @param   {Number} canvas_width canvas width in pixels
   * @param   {Object ctx           2d context
   * @returns {Object}              BoardView object
   */
  this.create_boardview = function(size, canvas_width, ctx) {
    return new BoardView(size, canvas_width, ctx);
  };
}).apply(draw);