import sqlite3
from contextlib import closing
from flask import Flask, json, jsonify, redirect, url_for, request, flash, session, g, Response, render_template
from collections import namedtuple



# configuration
DATABASE = '/tmp/go.db'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'default'

application = Flask(__name__)
application.config.from_object(__name__)  # FIXME Makes the app read config from this file. Not optimal.

player_queue = []
Player = namedtuple('Player', 'id size')


# Database functions
def connect_db():
    return sqlite3.connect(application.config['DATABASE'])

def init_db():
    with closing(connect_db()) as db:
        with application.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

def add_to_queue(player):
    player_queue.append(player)

@application.before_request
def before_request():
    g.db = connect_db()

@application.teardown_request
def teardown_request(exception):
    db = getattr(g, 'db', None)
    if db is not None:
        db.close()

@application.route('/')
def main_view():
    return render_template('front_page.html')

@application.route('/register', methods=['GET', 'POST'])
def register_user():
    if(request.method == 'POST'):
        username = request.form.get('username')
        password = request.form.get('password')
        g.db.execute('insert into users (username, password) values (?, ?)', [username, password])
        g.db.commit()
        flash('New user successfully registered')
        return redirect(url_for('login'))
    else:
        return render_template('register.html')


@application.route('/view_users')
def view_users():
    cur = g.db.execute('select username from users')
    entries = [str(row[0]) + '\n' for row in cur.fetchall()]
    return Response(entries, mimetype='text/plain')


@application.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username_client = request.form.get('username')
        password_client = request.form.get('password')
        cur = g.db.execute('select password from users where username = ?', [username_client])
        user_pass = str(cur.fetchall()[0][0])
        if user_pass == password_client:
            session['logged_in'] = True
            flash('You were logged in')
            return redirect(url_for('main_view'))
        else:
            flash('Incorrect something')
            return redirect(url_for('login'))
    else:
        return render_template('login.html')


@application.route('/logout')
def logout():
    return Response('Logout', mimetype='text/plain')

@application.route('/search', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        id = request.form.get('id')
        size = int(request.form.get('size'))
        if len(player_queue) == 0:
            add_to_queue(Player(id, size))
            return json.dumps({'status': 'In queue'})
        else:
            opponent = None
            for player in player_queue:
                if (not player.id == id) and player.size == size:
                    opponent = player
            if opponent:
                player_queue.remove(opponent)
                return jsonify(id=opponent.id)
            else:
                add_to_queue(Player(id, size))
                return json.dumps({'status': 'OK'})

    else:
        return render_template('test_conn.html')

@application.route('/test')
def css_test():
    return render_template('csstest.html')

@application.route('/go')
def go_view():
    return render_template('game.html')

@application.route('/disconnect_user', methods=['POST'])
def disconnect_user():
    id = request.form.get('id')
    print(player_queue)
    player_queue.remove(id)
    print(player_queue)
    return json.dumps({'status': 'OK'})


if __name__ == '__main__':
    application.run()
