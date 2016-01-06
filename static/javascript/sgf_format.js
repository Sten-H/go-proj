var coordinates = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

function set_sgf() {
	$('#sgf').val("(;GM[1]FF[4]CA[UTF-8]SZ[19];B[gh];W[kf])");
}

function SGF_format(black_name, white_name, size) {
	this.game_tree = [];

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
		var string = color + get_coord_string(x,y) + ";";
	}
}