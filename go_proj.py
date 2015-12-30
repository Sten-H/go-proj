import sqlite3
from contextlib import closing
from flask import Flask, json, jsonify, redirect, url_for, request, flash, session, g, Response, render_template
from collections import namedtuple
from threading import Lock

# configuration
# FIXME move this to a config file later.
DATABASE = 'db/go.db'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'default'

application = Flask(__name__)
application.config.from_object(__name__)


# Players searching for a game are added to this queue
player_queue = []  # FIXME this is problematic because does not work with multiple backend processes.
player_queue_lock = Lock()  # Lock for operations on queue
Player = namedtuple('Player', 'id size')  # This is added to the player_queue


# Database functions
def connect_db():
    return sqlite3.connect(application.config['DATABASE'])


def init_db():
    with closing(connect_db()) as db:
        with application.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()


def add_to_queue(player):
    with player_queue_lock:
        player_queue.append(player)


@application.before_request
def before_request():
    g.db = connect_db()


@application.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()


# Matches players searching for game, returns opponent token if match found, otherwise add to player queue
@application.route('/search', methods=['POST'])
def search():
    id = request.form.get('id')
    size = int(request.form.get('size'))
    if len(player_queue) == 0:
        add_to_queue(Player(id, size))
        return json.dumps({'status': 'In queue'})
    else:
        opponent = None
        with player_queue_lock:
            for player in player_queue:
                if (not player.id == id) and player.size == size:
                    opponent = player
            if opponent:
                player_queue.remove(opponent)
                return jsonify(id=opponent.id)
            else:
                add_to_queue(Player(id, size))
                return json.dumps({'status': 'In queue'})


# Ideally this should disconnect users on browser/tab close.
# Not working, browser will not send or finish the ajax request
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


@application.route('/register', methods=['GET', 'POST'])
def register_user():
    if(request.method == 'POST'):
        # FIXME this should probably be a bit more secure. wtform validation?
        username = request.form.get('username')
        password = request.form.get('password')
        g.db.execute('insert into users (username, password) values (?, ?)', [username, password])
        g.db.commit()
        flash('New user successfully registered')
        return redirect(url_for('login'))
    else:
        return render_template('register.html')


@application.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username_client = request.form.get('username')
        password_client = request.form.get('password')
        cur = g.db.execute('select password from users where username = ?', [username_client])
        rv = cur.fetchall()
        cur.close();
        if rv:
            user_pass = str(rv[0][0])
            if user_pass == password_client:
                session['logged_in'] = True
                session['username'] = username_client
                flash('You are now logged in')
                return redirect(url_for('main_view'))
        error = 'Incorrect username or password'
        return render_template('login.html', error=error)
    else:
        return render_template('login.html')


@application.route('/profile')
def user_profile():
    if is_logged_in():
        wins, losses, draws = 0, 0, 0
        return render_template('profile.html', username=session['username'], wins=wins, losses=losses, draws=draws)
    else:
        flash('You need to log in to access your profile')
        return render_template('login.html')

@application.route('/friends')
def show_friends():
    if is_logged_in():
        flash('Who needs friends anyway (feature doesn\'t exist yet)')
        return redirect(url_for('main_view'))
    else:
        flash('You need to log in to access your friends')
        return render_template('login.html')


@application.route('/play')
def go_view():
    return render_template('game.html')


@application.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    flash('User logged out')
    return redirect(url_for('main_view'))


@application.route('/user/', defaults={'path': ''})
@application.route('/user/<path:path>')
def show_user(path):
    # Validate the username string
    # Share profile template creation with /profile later
    return render_template('profile.html', username=path, wins=0, losses=0, draws=0)



# FIXME remove later. Just used to quickly test css, on a layout like the game layout
@application.route('/test')
def css_test():
    return render_template('csstest.html')


if __name__ == '__main__':
    application.run()
