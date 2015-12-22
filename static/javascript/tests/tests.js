//These strings are used for quick board setups
// E = empty, B = black, W = White.
var simple_board_monocolor = 'EBBB';
/*
EB
BB
 */
var board_bicolor = 'EBEEBBEEEEWWEEWE';
/*
EBEE
BBEE
EEWW
EEWE
 */

var sixbysix_bicolor = 'EEEEBEBBBBBEEEBWWWEEBWEEEEBWEEBBBWWW';
/*
EEEEBE
BBBBBE
EEBWWW
EEBWEE
EEBWEE
BBBWWW
 */
/**
 * Creates a new board and places stones according to string param, returns result.
 * @param  {String} placement - A string representing stone placements.
 * @return {Board} returns a Board with placements according to string.
 */
function board_with_placement(placement) {
	var size = Math.sqrt(placement.length);
	var board = new Board(size);
	for(var i = 0; i < placement.length; i++) {
		var pos = {x: i%size ,y: Math.floor(i/size)};
		var char = placement[i];
		if(char == 'W')
			board.place_stone_forced(pos.x, pos.y, 0);
		else if(char == 'B')
			board.place_stone_forced(pos.x, pos.y, 1);
	}
	return board;
}
/**
 * At the end of the game the board's empty spaces will be filled with score stones.
 */
QUnit.test("Hello test", function(assert) {
	assert.ok(1 == "1", "Passed!");
});

QUnit.test('Score Stones fill test', function(assert) {
	var simple_board = board_with_placement(simple_board_monocolor);
	var medium_board = board_with_placement(board_bicolor);
	simple_board.area_score();
	medium_board.area_score();
	assert.equal(simple_board.get_stones_length(), 4, 'stones.length, 4; equal succeeded, board is filled with score stones');
	assert.equal(medium_board.get_stones_length(), 16, 'stones.length, 16; equal succeeded, board is filled with score stones');

});

QUnit.test('Simple score test, 1 color', function(assert) {
	var board = board_with_placement(simple_board_monocolor);
	var score = board.area_score();
	
	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
});

QUnit.test('Slightly less simple score test, 2 colors', function(assert) {
	var board = board_with_placement(board_bicolor);
	var score = board.area_score();
	var board_six = board_with_placement(sixbysix_bicolor);
	var score_six = board_six.area_score();

	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
	assert.equal(score.white, 4, 'score.white, 4; equal succeeded');

	assert.equal(score_six.black, 22, 'score.black, 22; equal succeeded');
	assert.equal(score_six.white, 12, 'score.white, 12; equal succeeded');
});

QUnit.test('Determine winner, medium complexity board', function(assert) {
	var board = board_with_placement(board_bicolor);
	var board_six = board_with_placement(sixbysix_bicolor);
	var winner = board_six.determine_winner();
	
	assert.equal(winner, 1, 'winner, 1; equal succeeded');
});

QUnit.test('Test board setup with string', function(assert){
	var placement = 'EBEEBBEEEEWWEEWE';
	var board = board_with_placement('EBEEBBEEEEWWEEWE');
	
	assert.equal(board.get_stones_length(), 6, 'stones.length, 6; equal succeeded')
	var score = board.area_score();
	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
	assert.equal(score.white, 4, 'score.white, 4; equal succeeded');
});


/*
(0,0)(1,0)(2,0)(3,0)
(0,1)(1,1)(2,1)(3,1)
(0,2)(1,2)(2,2)(3,2)
(0,3)(1,3)(2,3)(3,3)
*/