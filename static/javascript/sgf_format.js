var coordinates = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/*
Missing params:
BP[name] = black player name
WP[name]
KM[number] = komi
RE[B+25] = result
*/

function SGFFormat(size) {
	this.game_info = "(;GM[1]FF[4]"; // should be in start of string when completed
	this.game_info += "SZ" + "[" + size + "]";
	//this.game_info += "KM" + "[" + komi + "]";
	this.game_tree = "";

	this.with_brackets = function(string) {
		return "[" + string + "]";
	}

	this.translate_color = function(color) {
		return (color == 1) ? 'B' : 'W';
	}

	this.translate_coord = function(coord) {
		return coordinates[coord]
	}

	this.get_coord_string = function(x, y) {
		return "[" + this.translate_coord(x) + this.translate_coord(y) + "]";
	}

	this.add_stone = function(x, y, color) {
		var color = this.translate_color(color);
		var string = ";" + color + this.get_coord_string(x,y) + "\n";
		this.game_tree += string;
	}

	this.add_pass = function(color) {
		this.game_tree += ";" + this.translate_color(color) + "[]" + "\n";
	}

	this.get_sgf_string = function() {
		var string = this.game_info + this.game_tree + ")"
		console.log(string);
		return string;
	}
}