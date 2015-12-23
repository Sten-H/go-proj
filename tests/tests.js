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
var board_advanced_capture = 'EBWEBBWEWWWWEEWE'
/*
EBWE
BBWE
WWWW
EEWE
 */
var board_simple_capture = 'EBEEWBEBE'
/*
EBE
EWB
EBE
*/
var sixbysix_bicolor = 'EEEEBEBBBBBEEEBWWWEEBWEEEEBWEEBBBWWW'; //score b: 22, 12 + komi(8) = 20
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
	board.count_all_liberties();
	return board;
}
/**
 * At the end of the game the board's empty spaces will be filled with score stones.
 */
QUnit.test('Score Stones fill test', function(assert) {
	var simple_board = board_with_placement(simple_board_monocolor);
	var medium_board = board_with_placement(board_bicolor);
	simple_board.area_score();
	medium_board.area_score();
	assert.equal(simple_board.get_stones_length(), 4, 'stones.length, 4; equal succeeded, board is filled with score stones');
	assert.equal(medium_board.get_stones_length(), 16, 'stones.length, 16; equal succeeded, board is filled with score stones');

});

QUnit.test('Simple area score test, 1 color', function(assert) {
	var board = board_with_placement(simple_board_monocolor);
	var score = board.area_score();
	
	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
	assert.equal(score.white, 0, 'score.white, 0; equal succeeded');
});

QUnit.test('Slightly less simple area score test, 2 colors', function(assert) {
	var board = board_with_placement(board_bicolor);
	var score = board.area_score();
	var board_six = board_with_placement(sixbysix_bicolor);
	var score_six = board_six.area_score();

	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
	assert.equal(score.white, 4, 'score.white, 4; equal succeeded');

	assert.equal(score_six.black, 22, 'score.black, 22; equal succeeded');
	assert.equal(score_six.white, 12, 'score.white, 12; equal succeeded');
});

QUnit.test('Test score with with captures', function(assert) {
	var board = board_with_placement(board_simple_capture);
	board.place_stone(0, 1);
	var winner = board.determine_winner();
	
	assert.equal(board.final_score.black, 10, 'score, 10; equal succeeded');
	assert.equal(board.final_score.white, 8, 'score, 8; equal succeeded'); //komi = 8
});

QUnit.test('Determine winner, medium complexity board, no captures', function(assert) {
	var board_six = board_with_placement(sixbysix_bicolor);
	var winner = board_six.determine_winner();
	
	assert.equal(winner, 1, 'winner, 1; equal succeeded');
});

QUnit.test('Test board setup with string', function(assert){
	var board = board_with_placement(board_bicolor);
	
	assert.equal(board.get_stones_length(), 6, 'stones.length, 6; equal succeeded')
	var score = board.area_score();
	assert.equal(score.black, 4, 'score.black, 4; equal succeeded');
	assert.equal(score.white, 4, 'score.white, 4; equal succeeded');
});

QUnit.test('Test illegal to place on occupied space', function(assert){
	var board = board_with_placement(simple_board_monocolor);
	assert.notOk(board.place_stone(0,1), 'Success; Illegal to place on occupied tile');
});

QUnit.test('Test suicidal move not allowed', function(assert) {
	var board = board_with_placement(board_bicolor);
	var board_six = board_with_placement(sixbysix_bicolor);
	board.current_player = 0;
	assert.notOk(board.place_stone(0, 0), 'Success; suicidal move was not legal for white');
	board.current_player = 1;
	assert.notOk(board_six.place_stone(3, 3), 'Success,; suicidal move was not legal for black');
});

QUnit.test('Test capture', function(assert) {
	var board_simple = board_with_placement(board_simple_capture);
	var board_advanced = board_with_placement(board_advanced_capture);
	//Black to capture 1 stone.
	board_simple.current_player = 1;
	board_simple.place_stone(0,1)
	assert.equal(board_simple.cap_black, 1, 'captures.black, 1; equal succeded');
	//White to capture 3 stones, suicidal move if not capture, advanced.
	board_advanced.current_player = 0;
	board_advanced.place_stone(0,0);
	assert.equal(board_advanced.cap_white, 3, 'captures.white, 3; equal succeded');
});
/*
(0,0)(1,0)(2,0)(3,0)
(0,1)(1,1)(2,1)(3,1)
(0,2)(1,2)(2,2)(3,2)
(0,3)(1,3)(2,3)(3,3)
*/