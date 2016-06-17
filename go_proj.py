import sqlite3
from contextlib import closing
from flask import Flask, json, jsonify, redirect, url_for, request, flash, session, g, Response, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from collections import namedtuple
from threading import Lock
import threading

# flask configuration
# FIXME move this to a config file later.
DATABASE = 'db/go.db'
DEBUG = True
SECRET_KEY = 'development key'

application = Flask(__name__)  # Create flask app
application.config.from_object(__name__)  # Use config described above


# Players searching for a game are added to this queue
player_queue = []  # FIXME this is problematic because does not work with multiple backend processes.
#  player_queue_lock = Lock()  # Lock for operations on queue
Player = namedtuple('Player', 'id size')  # This is added to the player_queue
# Locks

player_queue_lock = threading.RLock()  # Any reason not to use reentrant lock intead of Lock?

def connect_db():
    return sqlite3.connect(application.config['DATABASE'])


# This function is only used outside of the program in the terminal to init the db on changes
def init_db():
    with closing(connect_db()) as db:
        with application.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()


# Adds player to queue, this can become more advanced taking things such as rating in to account.
# I'm not sure if I want to take this lock here, I could instead require the lock to be taken before
# calling the function (which is already the case now, so the lock is taken twice, it's a reentrant lock though)
# This feels safer, but I'm not sure if there's a real downside to it, could be?
def add_to_queue(player):
    with player_queue_lock:
        player_queue.append(player)


# Before every db request, connect to db
@application.before_request
def before_request():
    g.db = connect_db()


# Close db connection after request
@application.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()


# Returns all games played by a single user
def get_player_games(username):
    cur = g.db.execute('select * from games where black=? or white=? order by game_date desc', [username, username])
    games = [dict(date=row[1], black=row[2], white=row[3], winner=row[4],
                  size=row[5], score=row[6], sgf=row[7]) for row in cur.fetchall()]
    cur.close()
    return games


# Matches players searching for game, returns opponent token if match found, otherwise add to player queue
@application.route('/search', methods=['POST'])
def search():
    id = request.json['id']  # peerjs-token
    size = int(request.json['size'])  # users requested board size.
    with player_queue_lock:
        #  The queue is very simple right now, if it's empty, the player is added,
        # if not empty player is matched with the player already in the queue (if they have same size preference)
        if len(player_queue) == 0:
            add_to_queue(Player(id, size))
            return json.dumps({'status': 'In queue'})
        else:  # queue is not empty, look for match
            opponent = None
            for player in player_queue:
                if (not player.id == id) and player.size == size:
                    opponent = player
            if opponent:  # opponent was found, remove from queue and return peerjs-id to client.
                player_queue.remove(opponent)
                return jsonify(id=opponent.id)
            else:  # No suitable opponent was found, user is added to queue.
                add_to_queue(Player(id, size))
                return json.dumps({'status': 'In queue'})


# Ideally this should disconnect users on browser/tab close.
# Not working, browser will not send or finish the ajax request
# Long polling/web socket solution?
@application.route('/disconnect_user', methods=['POST'])
def disconnect_user():
    id = request.form.get('id')
    player_queue.remove(id)
    return json.dumps({'status': 'OK'})


def is_logged_in():
    try:
        if session['logged_in']:
            return True
        else:
            return False  # Should not ever end up here.
    except KeyError:
        return False

# Views
@application.route('/')
def main_view():
    return render_template('front_page.html')


@application.route('/record_results', methods=['POST'])
def record_results():
    if is_logged_in():
        username = request.json['username'].lower()
        wins = request.json['wins']
        losses = request.json['losses']
        draws = request.json['draws']
        g.db.execute('UPDATE user_stats ' +
                     'SET wins = wins + ?, ' +
                     'losses = losses + ?, ' +
                     'draws = draws + ? ' +
                     'WHERE username=?', [wins, losses, draws, username])
        g.db.commit()
        return 'OK'
    else:  # Can this ever happen?
        return render_template('login.html', error='Something went very wrong. Your win was not recorded, sorry.')

@application.route('/record_game', methods=['POST'])
def record_game():
    black, white = request.json['black'], request.json['white']
    size = request.json['size']
    winner = request.json['winner']
    score_str = request.json['score_string']
    sgf = request.json['sgf']
    g.db.execute(
        'insert into games (game_date, black, white, board_size, winner, score, sgf) values (CURRENT_DATE, ?, ?, ?, ?, ?, ?)',
        [black, white, size, winner, score_str, sgf])  # Do I need one more ? mark
    g.db.commit()
    return 'OK'


@application.route('/register', methods=['GET', 'POST'])
def register_user():
    if(request.method == 'POST'):
        error = None
        # FIXME this should probably be a bit more secure. wtform validation?
        username = str(request.form.get('username')).lower()
        password = request.form.get('password')
        if len(username) > 30 or len(password) > 30:
            error = 'Username or password is too long (more than 30 characters).'
            return render_template('register.html', error=error)

        cur = g.db.execute('select username from users where username = ?', [username])
        rv = cur.fetchall()
        cur.close()
        if len(rv) > 0:
            error = 'Username is already taken.'
            return render_template('register.html', error=error)
        pass_hashed = generate_password_hash(password)  # Adds salt to password
        g.db.execute('insert into users (username, password) values (?, ?)', [username, pass_hashed])
        g.db.execute('insert into user_stats (username) values (?)', [username])  # Create stats row too?
        g.db.commit()
        flash('New user successfully registered')
        return redirect(url_for('login'))
    else:
        return render_template('register.html')


@application.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username_client = str(request.form.get('username')).lower()
        password_client = request.form.get('password')
        cur = g.db.execute('SELECT password FROM users WHERE username = ?', [username_client])
        rv = cur.fetchall()
        cur.close();
        if rv:
            pass_hashed = str(rv[0][0])
            if check_password_hash(pass_hashed, password_client):
                session['logged_in'] = True
                session['username'] = username_client
                flash('You are now logged in')
                return redirect(url_for('main_view'))
        error = 'Incorrect username or password'
        return render_template('login.html', error=error)
    else:
        return render_template('login.html')


# View where user can see match history and some general info
@application.route('/user/', defaults={'path': ''})
@application.route('/user/<path:path>')
def show_user(path):
    username = path.lower()
    cur = g.db.execute('select * from user_stats where username = ?', [username])
    rv = cur.fetchall()
    cur.close()  # Do I need to close if I do another selection?
    if len(rv) > 0:
        rv = rv[0]
        wins, losses, draws = rv[0], rv[1], rv[2]
    else:
        return render_template('front_page.html', error='No such user')
    games = get_player_games(username)
    return render_template('profile.html', wins=wins, losses=losses, draws=draws, username=username, games=games)


# Redirects to above user view but with logged in user's details
@application.route('/profile')
def user_profile():
    if is_logged_in():
        return redirect(url_for('show_user', path=session['username']))
    else:
        flash('You need to log in to access your profile')
        return render_template('login.html')

# View where user can make friend requests and challenge friends to game. Just a stub at the moment.
@application.route('/friends')
def show_friends():
    if is_logged_in():
        flash('Who needs friends anyway (feature doesn\'t exist yet)')
        return redirect(url_for('main_view'))
    else:
        flash('You need to log in to access your friends')
        return render_template('login.html')


# Returns view where user can search and play games
@application.route('/play')
def go_view():
    if is_logged_in():
        return render_template('game.html', username=session['username'])
    else:
        flash('You need to log in before you can play')
        return render_template('login.html')


#FIXME remove this later, want to bypass login for less annoyance in dev.
@application.route('/play-hax')
def go_view_no_login():
    return render_template('game.html')

@application.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    flash('User logged out')
    return redirect(url_for('main_view'))

# FIXME remove later. Just used to quickly test css, on a layout like the game layout
@application.route('/test')
def css_test():
    return render_template('csstest.html')

if __name__ == '__main__':
    application.run(threaded=True)  # Added threaded=True as a test, remove later.
