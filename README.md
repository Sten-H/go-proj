# go-proj
## peer to peer javascript go game
### How to run
If you want to run go-proj:  
1. Clone this repo  
2. Make sure you have pip installed  
3. Enter root directory and "pip install -r requirements.txt" (recommend using a virtualenv before running this)  
4. "python go_proj.py"  

Alternatively you can go to [go.stenh.com](http://go.stenh.com), it is not guaranteed to be up but it is very likely.
### Introduction
This is the game of go implemented in javascript using a python flask backend to match players who can then play peer to peer (with peerjs).
The scoring rules are according to chinese rules. I like japanese rules better, but chinese rules are better with a weak scoring system (which this definitely is) becaue chinese scoring does not penaize plays in your own territory.
At the moment the game can score territories at game end but it has no feature to classify stones as dead (in endgame, this is a tough problem in many cases).

### To do
#### Complex: Disconnect during search
If a user disconnects while searching match this creates a dead token in the python servers list of players searching game. Solve this with some sort of long polling thing or websocket, probably websocket? High prio
#### Complex: Multiple games
be able to leave and enter games and have them keep going.
#### Medium: Bug with webRTC not supported by browser
If someone presses search when webRTC is not supported by browser, no one can find a match after that.
#### Medium: Friends, challenge friends
Be able to add friends and challenge them directly.
#### Easy: go board overlapping top bar
I deleted a flexbox long ago, think that's what's causing this.
#### Easy:Cancel search
Replace the search button with a cancel button during search maybe?
#### Easy: Make searching for game nice
Have a spinning wheel or something, also a cancel button.
