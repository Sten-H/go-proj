from flask import Flask, json, jsonify, redirect, url_for, request, flash, session, Response, render_template

# configuration
#DATABASE = '/tmp/flaskr.db'
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'default'

app = Flask(__name__)
app.config.from_object(__name__)

player_queue = []

@app.route('/')
def main_view():
    return render_template('main_layout.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        #Try login details later
        #if request.form['username'] != app.config['USERNAME']:
        #    error = 'Invalid username'
        #elif request.form['password'] != app.config['PASSWORD']:
        #    error = 'Invalid password'
        session['logged_in'] = True
        flash('You were logged in')
        return redirect(url_for('main_view'))
    else:
        return render_template('login.html')


@app.route('/logout')
def logout():
    return Response('Logout', mimetype='text/plain')

@app.route('/search', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        id = request.form.get('id')
        if len(player_queue) == 0:
            player_queue.append(id)
            return json.dumps({'status': 'OK'})
        else:
            p2 = player_queue.pop()
            return jsonify(id=p2)
    else:
        return render_template('test_conn.html')

@app.route('/test')
def css_test():
    return render_template('csstest.html')

@app.route('/go')
def go_view():
    return render_template('game_view.html')


if __name__ == '__main__':
    app.run()
