/**
 * A class used to keep track of manually marked dead stones
 * @param {Number} x - x-coord
 * @param {Number} y - y-coord
 * @param {Numberss} color - color of player that marked tile
 */
function Mark(x, y, color) {
  this.x = x;
  this.y = y;
  this.color = color;
}
/**
 * A wrapper around a list of all markings.
 */
function MarkArray() {
	this.mark_list = new Array();
	/**
	 * Adds a mark if it is not in the array and returns true. Otherwise false.
	 * @param {boolean} mark - true if added, false if already in array.
	 */
	this.add = function(mark) {
		var found = null;
		var found_index = -1;
		for (var i = 0; i < this.mark_list.length; i++){
			if (this.mark_list[i].x == mark.x && this.mark_list[i].y == mark.y) {
				found = this.mark_list[i];
				found_index = i;
			}
		}
		if(found != null) {
	  		if(found.color != mark.color)
	  			return false; // Opposing color is disputing mark
	  		if(found.color == mark.color) {
	  			//This is so weird, removing in an add function. Situation, white marked his own mark. Should remove it probably. Not like this though.
	  			this.mark_list.splice(found_index, 1);
	  			return true;
	  		}
	    }
	  else {
		  this.mark_list.push(mark);
		  return true;
	  }
	}
	this.clear = function() {
		this.mark_list = new Array();
	}
	this.pop = function (){
		return this.mark_list.pop();
	}
	this.length = function() { return this.mark_list.length; }
}
