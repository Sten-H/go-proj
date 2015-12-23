//These directions are used quite often for searching areas.
var dir = [{x: 1, y: 0}, 
					 {x: -1, y: 0}, 
					 {x: 0, y: 1},
					 {x: 0, y: -1}]; //Cross direction excluding middle
var ndir = dir.slice();
ndir.push({x: 0, y: 0}); //Cross direction with middle coord.

/**
 * @param {Number} x - x-coord
 * @param {Number} y - y-coord
 * @param {Number} color - color 1 is black color 0 is white. for scoring -1 is neutral, 2 is white score, 3 is black score.
 */
function Stone(x, y, color) {
	this.x = x;
	this.y = y;
	this.color = color;
	this.liberty_count = 4;
	this.visited = false; //Is used to avoid checking life of the samge group multiple times. 

	this.set_liberty_count = function(c) {
		this.liberty_count = c;
	}
	this.get_x = function() {
		return this.x;
	}
	this.get_y = function() {
		return this.y;
	}
}
/**
 * Used for finding dead groups
 * @param {Array} stones - Group starting stones
 */
function Group(stones) {
	this.stones = stones;
	this.color = null;
	this.liberties = 0;
	this.length = function() { return this.stones.length; }
	this.add = function(stone) {
		if(this.color == null)
			this.color = stone.color;
		this.stones.push(stone);
		this.liberties += stone.liberty_count;
	}
	this.is_dead = function() { return (this.liberties == 0); }
}
function ScoreGroup(stones) {
	this.stones = stones;
	this.colors_found = { black: false, white: false };
	this.length = function() { return this.stones.length; }
	this.add_color = function(color) {
		if(color == 1)
			this.colors_found.black = true;
		else if(color == 0)
			this.colors_found.white = true;
	}
	this.color = function() {
		if(this.colors_found.black == true && this.colors_found.white == false)
			return 1;
		else if(this.colors_found.black == false && this.colors_found.white == true)
			return 0;
		else
			return -1; // Neutral group
	}
	this.add = function(stone) { this.stones.push(stone);}
}
/**
 * The go board, with rules.
 * @param {Number} size - Size of board
 */
function Board(size) {
	this.size = size;
	this.current_player = 1;
	this.stones = new Array(this.size);
	for (var i = 0; i < this.size; i++)
		this.stones[i] = new Array(this.size);
	this.history = new Array();
	this.winner = null;
	//Captures stones for each player. Could be a list later, for visualisation. Now only to count score.
	this.cap_white = 0;
	this.cap_black = 0;
	this.final_score = {black: 0, white: 0};
	/**
	 * Returns komi (extra score for white) based on board size. Not sure what to set this to
	 * for any board size, so it's all (almost) the same for now.
	 * @return {Number} returns a komi value
	 */
	this.get_komi = function() {
		if(this.size == 9)
			return 7;
		else if(this.size == 13)
			return 7;
		else if (this.size < 9) {
			return 8;
		}
		else {
			return 7;
		}
	}
	this.set_winner = function(color) {
		this.winner = color;
	}
	this.get_winner = function() {
		return this.winner;
	}

	this.get_stones_length = function() {
		var length = 0;
		for (var x = 0; x < this.size; x++)
			for (var y = 0; y < this.size; y++)
				if (this.stones[x][y] != null)
					length++;
		return length;
	}
	this.switch_current_player = function() {
		this.current_player = (this.current_player == 1) ? 0 : 1;
	}

	this.tile_occupied = function(x, y) {
		return (this.stones[x][y] != null)
	}
	/**
	 * Player passes his turn, game ends on two consecutive passes.
	 * @return {[type]} [description]
	 */
	this.player_pass = function() {
		var last_move = this.history[this.history.length - 1]
		this.history.push("P");
		if (last_move == "P")
			this.determine_winner();
		this.switch_current_player();
	}

	this.player_resign = function(color) {
		this.history.push("R W");
		this.set_winner((color == 1) ? 0 : 1);
	}
	this.legal_coordinate = function(x, y) {
		return (x >= 0 && x < this.size && y >= 0 && y < this.size)
	}

	this.count_liberties = function(x, y) {
		if (this.tile_occupied(x, y)) {
			var liberties = 0;
			var stone = this.stones[x][y];
			for( var i = 0; i < dir.length; i++) {
				var new_dir = { x: x + dir[i].x, y: y + dir[i].y };
				if (this.legal_coordinate(new_dir.x, new_dir.y) && !this.tile_occupied(new_dir.x, new_dir.y))
					liberties++;
			}
			stone.set_liberty_count(liberties);
		} else
			return;
	}
	/**
	 * Recalculates the liberties surrounding a coordinate. Usually done after a stone placement on x, y.
	 * @param  {Number} x - x coord
	 * @param  {Number} y - y coord
	 */
	this.recalculate_neighbouring_stone_liberties = function(x, y) {
		for(var i = 0; i < dir.length; i++){
			if(this.legal_coordinate(x + dir[i].x, y + dir[i].y))
				this.count_liberties(x + dir[i].x, y + dir[i].y);
		}
	}
	/**
	 * Counts the liberties of all stones. This should be done sparingly.
	 */
	this.count_all_liberties = function() {
		for (var x = 0; x < this.size; x++)
			for (var y = 0; y < this.size; y++)
				this.count_liberties(x, y);
	}
	/**
	 *Removes 1 stone from play, this removal updates liberties locally. quick. Used for undo.
	 */
	this.remove_stone = function(stone) {
		this.stones[stone.x][stone.y] = null;
		this.recalculate_neighbouring_stone_liberties(stone.x, stone.y);
	}

	this.remove_group = function(group) {
		for (var i = 0; i < group.length; i++)
			this.stones[group[i].x][group[i].y] = null;
	}

	this.undo_last_move = function() {
		var last_stone = this.history.pop();
		this.remove_stone(last_stone);
	}
	/**
	 *Sets the visited property of each stone to false. Should be done after each new stone has been settled.
	 */
	this.reset_visited = function() {
		for (var x = 0; x < this.size; x++)
			for (var y = 0; y < this.size; y++)
				if (this.tile_occupied(x, y))
					this.stones[x][y].visited = false;
	}
	/**
	 *Finds entire groups of stones recursively. the visited array that is passed in the paramaters
	 *is the actual stones visited in the end. The visited property on each stone is used for search 
	 *optimization not to find the group of stones.
	 */	
	this.recursive_group_search = function(queue, group) {
		//FIXME think this can be clean up a great deal. Visited stone is pushed several times?
		if (queue.length < 1) {
			return group;
		}
		var stone = queue.shift();
		if($.inArray(stone, group.stones) != -1)
			return this.recursive_group_search(queue, group);
		group.add(stone);
		for (var i = 0; i < dir.length; i++) {
			var new_x = Number(stone.x + dir[i].x);
			var new_y = Number(stone.y + dir[i].y);
			if (this.legal_coordinate(new_x, new_y) && this.tile_occupied(new_x, new_y)) {
				var neighbour = this.stones[new_x][new_y];
				if (neighbour.color == stone.color && neighbour.visited == false) {
					queue.push(neighbour);
					neighbour.visited = true;
				}
			}
		}
		return this.recursive_group_search(queue, group);
	}
	/**
	 * Gets the group (if any) beginning with the stone on x, y coord
	 * @param  {Number} x - x-coord
	 * @param  {Number} y - y-coord
	 * @return {Group} returns a Group object
	 */
	this.get_group_info = function(x, y) {
		this.stones[x][y].visited = true;
		var group = new Group([]);
		var group_info = this.recursive_group_search([this.stones[x][y]], group);
		return group_info;
	}
	/**
	 * Returns a queue of the stones in an area, the opponent stones are placed at the front of the queue.
	 * This is important because the placed stones, and the player who made the move, should have its stones
	 * checked for life last. Make suicidal moves where you capture work.
	 */
	this.get_stone_queue = function(x, y) {
		var stone_queue = [];
		//Add the the five stones in a cross pattern +. The center stone (x, y) is the newly placed stone.
		for (var i = 0; i < ndir.length; i++) {
			var curr_dir = {
				xx: x + ndir[i].x,
				yy: y + ndir[i].y
			};
			if (this.legal_coordinate(curr_dir.xx, curr_dir.yy) && this.tile_occupied(curr_dir.xx, curr_dir.yy)) {
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
	 * Removes dead groups from board and updates liberties of ALL stones.
	 * @param {}
	 */
	this.remove_dead_groups = function(dead_groups) {
		if (dead_groups.length == 0) // do nothing if no dead groups.
			return;
		var enemy_color = dead_groups[0].color; //We only remove enemy, if current player has dead group, it will live.
		for (var i = 0; i < dead_groups.length; i++) {
			if (dead_groups[i].color == enemy_color){
				if(this.current_player == 1){
					this.cap_black += dead_groups[i].length();
				}
				else {
					this.cap_white += dead_groups[i].length();
				}
				this.remove_group(dead_groups[i].stones);
			}
		}
	}
	/**
	 *Returns a list of group info on the groups surrounding x, y. The list is sorted
	 *with enemy groups coming first and current player last. This is very important.
	 */
	this.get_area_groups = function(x, y) {
		var stone_queue = this.get_stone_queue(x, y);
		var stone_groups = [];
		while (stone_queue.length > 0) {
			var curr_stone = stone_queue.shift();
			if (curr_stone.visited == true)
				continue;
			else
				stone_groups.push(this.get_group_info(curr_stone.x, curr_stone.y));
		}
		return stone_groups;
	}
	/**
	 * Finds and returns all dead groups surrounding and on the x, y coordinate.
	 * @param  {number} x - x-coordinate of center of search area.
	 * @param  {number} y - y-coordinate of center of search area.
	 * @return {array} returns an array of dead groups.
	 */
	this.get_dead_groups = function(x, y) {
		var groups = this.get_area_groups(x, y); // Gets all groups in area
		var dead_groups = groups.filter(function(g) {
			return g.is_dead() == true; //Filter out alive groups
		});
		this.reset_visited(); //We have traversed the groups for this update. This could be optimized by only reseting visited (var groups) stones.
		return dead_groups;
	}
	/**
	 * Checks if move is self-harming by looking at the dead groups created by latest move.
	 * @param  {Group} dead_groups - all groups that are now dead after last placed stone.
	 * @return {boolean} returns true if move only kills stones of current player
	 */
	this.suicide_move = function(dead_groups) {
		return (dead_groups.length >= 1 && dead_groups[0].color == this.current_player)
	}
	/**
	 * Removes dead stones, recounts liberties of remaining stones. Board ready for next turn.
	 * @param  {array} dead_groups - a list of dead groups to remove.
	 */
	this.cleanup = function(dead_groups) {
		this.remove_dead_groups(dead_groups);
		this.count_all_liberties();
	}
	/**
	 * places score stones of color -1 (neutral) on all empty tiles, to be used for scoring.
	 * @return {array} an array of the score stones
	 */
	this.place_score_stones = function() {
		var score_stones = new Array();
		for (var x = 0; x < this.size; x++) {
			for (var y = 0; y < this.size; y++) {
				if (this.stones[x][y] == null) {
					score_stone = new Stone(x, y, -1); //Add stone of neutral colour
					this.stones[x][y] = score_stone;
					score_stones.push(score_stone);
				}
			}
		}
		return score_stones;
	}
	/**
	 * Counts both players total amount of stones separately. This is a bit slow
	 * it could be done in other loops that are already looping through board, but it
	 * runs once (at the end of the game).
	 * @return {dictionary} returns a dict with .white and .black Number values
	 */
	this.count_player_stones = function() {
		var count = {black: 0, white: 0};
		for (var x = 0; x < this.size; x++) {
			for (var y = 0; y < this.size; y++) {
				var stone = this.stones[x][y]; // Don't have to worry about null, because board is filled with score stones.
				if(stone.color == 1)
					count.black += 1;
				else if (stone.color == 0) // Cant use else becaues of neutral color (-1) during scoring.
					count.white += 1;
			}
		}
		return count;
	}
	/**
	 * A breadth first search to find a group, starting from the first stone in queue.
	 * Collects information needed for scoring in ScoreGroup object.
	 * @param  {Array} queue - Queue used for breadth first search
	 * @param  {ScoreGroup} group - The group that is built up through
	 * @return {[type]}       [description]
	 */
	this.recursive_group_score = function(queue, group) {
		if (queue.length < 1)
			return group;
		var stone = queue.pop();
		group.add(stone);
		for (var i = 0; i < dir.length; i++) {
			var curr_dir = { x: stone.x + dir[i].x, y: stone.y + dir[i].y };
			if (this.legal_coordinate(curr_dir.x, curr_dir.y)) {
				var neighbour = this.stones[curr_dir.x][curr_dir.y];
				if (neighbour.color == -1 && neighbour.visited == false) {
					queue.push(neighbour)
					neighbour.visited = true;
				} 
				else
					group.add_color(neighbour.color);
			}
		}
		return this.recursive_group_score(queue, group);
	}
	/**
	 * Scores the game and sets the winner accordingly. Scoring will be done according to chinese rules of go
	 * (area scoring instead of territory scoring).
	 * @return {dict} returns a dict with white and black score without komi, this is only used for testing.
	 */
	this.area_score = function() {
		this.reset_visited(); // Probably best to do this, so it's clean after life check of last move.
		var bscore = 0;
		var wscore = 0; // + komi whatever that is
		var score_stones = this.place_score_stones();
		var score_groups = new Array();
		
		//Gather all score groups (areas that are owned by someone)
		while(score_stones.length >= 1){
			active_stone = score_stones.pop();
			if(active_stone.visited != true) {
				active_stone.visited = true;
				score_groups.push(this.recursive_group_score([active_stone], new ScoreGroup([])));
			}
		}
		//Count score of areas
		for(var i = 0; i < score_groups.length; i++){
			if(score_groups[i].color() == 1)
				bscore += score_groups[i].length();
			else if(score_groups[i].color() == 0)
				wscore += score_groups[i].length();
		}
		//Count the placed stones, 1p each.
		placed_stones = this.count_player_stones();
		bscore += placed_stones.black;
		wscore += placed_stones.white;
		return {
			black: bscore,
			white: wscore
		};
	}
	/**
	 * Adds komi to area scoring and determines winner.
	 * @param {dict} score - contains .black .white scores, WITHOUT komi
	 * @return {Number}
	 */
	this.determine_winner = function() {
		var score = this.area_score();
		var komi = this.get_komi();
		score.black += this.cap_black;
		score.white += this.cap_white + komi;
		if(score.black > score.white)
			this.winner = 1;
		else if(score.black < score.white)
			this.winner = 0;
		else
			this.winner = -1; // Draw
		winner_string = (this.winner == 1) ? 'Black' : 'White'; //FIXME delete later
		this.final_score = score;
		return this.winner;
	}

	//This is only used for testing purposes to set up scoring situations. Does no validty checks, no life check.
	this.place_stone_forced = function(x, y, color) {
		var new_stone = new Stone(x, y, color);
		this.stones[x][y] = new_stone;
	}
	/**
	 * Places stone on the x,y coordinates and then tries the board for possible self-harming move.
	 * Returns false if stone is placed on occupied tile, or move is self-harming.
	 * @param  {Number} x - x-coord
	 * @param  {Number} y - y-coord
	 * @return {boolean}  returns true if move was legal, else false.
	 */
	this.place_stone = function(x, y) {
		if (!this.tile_occupied(x, y)) {
			var new_stone = new Stone(x, y, this.current_player);
			this.stones[x][y] = new_stone;
			this.history.push(new_stone);
			//Update liberties
			this.recalculate_neighbouring_stone_liberties(x, y);
			this.count_liberties(x, y);
			//Get dead groups in area
			var dead_groups = this.get_dead_groups(x, y);

			if (this.suicide_move(dead_groups)) {
				this.undo_last_move();
				return false;
			} else {
				this.cleanup(dead_groups);
				this.switch_current_player();
				return true;
			}
		} 
		else
			return false; //Tried to place on an existing stone
	}
}