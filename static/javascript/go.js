var dir = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
function Stone(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.liberty_count = 4;
    this.visited = false; //Is used to avoid checking life of the samge group multiple times. 

    this.set_liberty_count = function(c) { 
      this.liberty_count = c;
    }
    this.get_x = function() { return this.x; }
    this.get_y = function() { return this.y; }
}

function Board(size) {
    this.size = size;
    this.current_player = 1;
    this.stones = new Array(this.size);
    for(var i = 0; i < this.size; i++)
      this.stones[i] = new Array(this.size);
    this.history = new Array();
    this.winner = null;
    
  this.get_stones = function() {
    return this.stones;
  }
  this.set_winner = function(color) {
    this.winner = color;
  }
  this.get_winner = function() {
    return this.winner;
  }
  this.switch_current_player = function() {
    this.current_player = (this.current_player == 1) ? 0 : 1;
  }
  
  this.tile_occupied = function(x, y) {
    if(this.stones[x][y] != null)
      return true;
    else
      return false;
  }
  this.legal_coordinate = function(x, y) {
    if(x >= 0 && x < this.size && y >= 0 && y < this.size)
      return true;
    else {
      return false;
    }
  }
  this.count_liberties = function(x, y) {
    if(this.tile_occupied(x, y)) {
      var liberties = 0;
      var stone = this.stones[x][y];
      for(var i = -1; i <= 1; i += 2) {
        if(this.legal_coordinate(x + i, y) && !this.tile_occupied(x + i, y))
          liberties++;
        if(this.legal_coordinate(x, y + i) && !this.tile_occupied(x, y + i))
          liberties++;
      }
      stone.set_liberty_count(liberties);
    }
    else
      return;
  }

  this.recalculate_neighbouring_stone_liberties = function(x, y) {
    for(var i = -1; i <= 1; i += 2) {
        if(this.legal_coordinate(x + i, y))
          this.count_liberties(x + i, y);
        if(this.legal_coordinate(x, y + i))
          this.count_liberties(x, y + i);
      }
  }

  this.count_all_liberties = function() {
    for(var x = 0; x < this.size; x++)
      for(var y = 0; y < this.size; y++)
        this.count_liberties(x, y);
  }
  
  /**
  *Sets the visited property of each stone to false. Should be done after each new stone has been settled.
  */
  this.reset_visited = function() {
    for(var x = 0; x < this.size; x++)
      for(var y = 0; y < this.size; y++)
        if(this.tile_occupied(x, y))
          this.stones[x][y].visited = false;
  }
  /**
  *Removes 1 stone from play, this removal updates liberties locally. quick. Used for undo.
  */
  this.remove_stone = function(stone) {
    this.stones[stone.x][stone.y] = null;
    this.recalculate_neighbouring_stone_liberties(stone.x, stone.y);
  }

  this.remove_group = function(group) {
    for(var i = 0; i < group.length; i++)
      this.stones[group[i].x][group[i].y] = null;
  }
  /**
  *Finds entire groups of stones recursively. the visited array that is passed in the paramaters
  *is the actual stones visited in the end. The visited property on each stone is used for search 
  *optimization not to find the group of stones.
  */
  this.recursive_group_search = function(queue, liberties, visited) {
    if(queue.length < 1) {
      return {is_dead: (liberties == 0) ? true : false, group: visited, color: visited[0].color};
    }
    var stone = queue.shift();
    liberties += stone.liberty_count;
    visited.push(stone);
    for(var i = 0; i < dir.length; i++){
      var new_x = Number(stone.x + dir[i].x);
      var new_y = Number(stone.y + dir[i].y);
      if(this.legal_coordinate(new_x, new_y) 
          && this.tile_occupied(new_x, new_y)) {
        var neighbour = this.stones[new_x][new_y];
        if(neighbour.color == stone.color && neighbour.visited == false){
          queue.push(neighbour); 
          visited.push(neighbour);
          neighbour.visited = true;
        }
      }
    }
    return this.recursive_group_search(queue, liberties, visited);
  }

  this.get_group_info = function(x, y) {
    var queue = new Array();
    queue.push(this.stones[x][y]);
    this.stones[x][y].visited = true;
    var group_info = this.recursive_group_search(queue, 0, [this.stones[x][y]]);
    return group_info;
  }
  /**
  *Returns a queue of the stones in an area, the opponent stones are placed at the front of the queue.
  *This is important because the placed stones, and the player who made the move, should have its stones
  *checked for life last. Make suicidal moves where you capture work.
  */
  this.get_stone_queue = function(x, y){
    var ndir = dir.slice(); //copy array
    ndir.push({x: 0, y:0}); //add 0-dir
    var stone_queue = [];
    //Add the the five stones in a cross pattern +. The center stone (x, y) is the newly placed stone. 
    for(var i = 0; i < ndir.length; i++){
      var curr_dir = {xx: x + ndir[i].x, yy: y + ndir[i].y};
      if(this.legal_coordinate(curr_dir.xx, curr_dir.yy) 
        &&  this.tile_occupied(curr_dir.xx, curr_dir.yy)) {
        stone_queue.push(this.stones[curr_dir.xx][curr_dir.yy]);
      }
    }
    var color_mult = (this.current_player == 0) ? -1 : 1; // used to reverse order of sort depending on color
    //Sort stones so enemy stones are first, this is important because of removal priority of dead groups.
    stone_queue.sort(function(a, b) {
      return (a.color - b.color) * color_mult;
    });
    return stone_queue;
  }
  /**
  *Removes dead groups from board and updates liberties of ALL stones.
  */
  this.remove_dead_groups = function(dead_groups) {
    if(dead_groups.length == 0)
      return;
    var enemy_color = dead_groups[0].color;  //We only remove enemy, if current player has dead group, it will live.
    for(var i = 0; i < dead_groups.length; i++) {
      if(dead_groups[i].color == enemy_color)
        this.remove_group(dead_groups[i].group);
    }
  }
  /**
  *Returns a list of group info on the groups surrounding x, y. The list is sorted
  *with enemy groups coming first and current player last. This is very important.
  */
  this.get_area_groups = function(x, y) {
    var stone_queue = this.get_stone_queue(x, y);
    var stone_groups = [];
    while(stone_queue.length > 0){
      var curr_stone = stone_queue.shift();
      if(curr_stone.visited == true)
        continue;
      else
        stone_groups.push(this.get_group_info(curr_stone.x, curr_stone.y));
    }
    return stone_groups;
  }
  /*
  Finds and returns all dead groups surrounding and on the x, y coordinate.
  */
  this.get_dead_groups = function(x, y) {
    var groups = this.get_area_groups(x, y);  // Gets all groups in area
    var dead_groups = groups.filter(function(g){
      return g.is_dead == true; //Filter out alive groups
    });
    this.reset_visited(); //We have traversed the groups for this update. This could be optimized by only reseting visited (var groups) stones.
    return dead_groups;
  }

  this.suicide_move = function(dead_groups) {
    if(dead_groups.length >= 1 && dead_groups[0].color == this.current_player)
      return true;
    else
      return false;
  }
  /*
  Removes dead stones, and prepares board for next turn.
  */
  this.cleanup = function(dead_groups) {
    this.remove_dead_groups(dead_groups);
    this.count_all_liberties();
  }
  this.undo_last_move = function() {
    var last_stone = this.history.pop();
    this.remove_stone(last_stone);
  }
  this.place_stone = function(x, y) {
    if(!this.tile_occupied(x, y)) {
      var new_stone = new Stone(x, y, this.current_player);
      this.stones[x][y] = new_stone;
      this.history.push(new_stone);
      //Update liberties
      this.recalculate_neighbouring_stone_liberties(x, y);
      this.count_liberties(x, y);
      //Get dead groups in area
      var dead_groups = this.get_dead_groups(x, y);
      
      if(this.suicide_move(dead_groups)){
        this.undo_last_move();
        return false;
      }
      else {
        console.log('stone was placed at' + x + ", " + y);
        this.cleanup(dead_groups);
        this.switch_current_player();
        return true;
      }
    } 
    else {
      return false; //Tried to place on an existing stone
    }
  }

  this.player_pass = function() {
    this.history.push("P");
    this.switch_current_player();
  }

  this.player_resign = function(color) {
    this.history.push("R W");
    this.set_winner((color == 1) ? 0 : 1);
  }
}


