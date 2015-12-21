from flask import Flask, json, jsonify, redirect, url_for, request, flash, session, Response, render_template
from collections import namedtuple
# configuration
#DATABASE = '/tmp/flaskr.db'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'default'

application = Flask(__name__)
application.config.from_object(__name__)

player_queue = []
Player = namedtuple('Player', 'id size')

def add_to_queue(player):
    player_queue.append(player)

@application.route('/')
def main_view():
    return render_template('game_view.html')  # Temporarily just redirect to the game

@application.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Try login details later
        #if request.form['username'] != app.config['USERNAME']:
        #    error = 'Invalid username'
        #elif request.form['password'] != app.config['PASSWORD']:
        #    error = 'Invalid password'
        session['logged_in'] = True
        flash('You were logged in')
        return redirect(url_for('main_view'))
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
        print 'size:' + str(size)
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
    return render_template('game_view.html')

@application.route('/disconnect_user', methods=['POST'])
def disconnect_user():
    id = request.form.get('id')
    print(player_queue)
    player_queue.remove(id)
    print(player_queue)
    return json.dumps({'status': 'OK'})


if __name__ == '__main__':
    application.run()
