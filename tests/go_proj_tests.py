import os
import go_proj
import tempfile
import unittest
from flask import jsonify, json


class GoTestCase(unittest.TestCase):

    def setUp(self):
        go_proj.application.config['TESTING'] = True
        self.db_fd, go_proj.application.config['DATABASE'] = tempfile.mkstemp()
        go_proj.init_db()
        self.app = go_proj.application.test_client()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(go_proj.application.config['DATABASE'])

    def register(self, username, password):
        return self.app.post('/register', data=dict(
            username=username,
            password=password
            ), follow_redirects=True)

    def login(self, username, password):
        return self.app.post('/login', data=dict(
            username=username,
            password=password
            ), follow_redirects=True)

    def logout(self):
        return self.app.get('/logout', follow_redirects=True)

    def record_results(self, username, wins, losses, draws):
        return self.app.post('/record_results', data=json.dumps(dict(
                username=username,
                wins=wins,
                losses=losses,
                draws=draws)),
                             content_type='application/json',
                             follow_redirects=True)

    def search(self):
        self.app.get('/play')
        return self.app.post('/search', data=json.dumps(dict(id='bbb', size="9")),
                             content_type='application/json',
                             follow_redirects=True)

    def show_user(self, username):
        return self.app.get('/user/%s' % username)

    def test_serve_content(self):
        rv = self.app.get('/')
        assert 'Welcome' in rv.data

    # Register user tests
    def test_register_user(self):
        rv = self.register('mario', 'wario')
        assert 'New user successfully registered' in rv.data
        rv = self.register('Waluigi', 'pepe')
        assert 'New user successfully registered' in rv.data
        rv = self.register('Bowser', 'Peach')
        assert 'New user successfully registered' in rv.data

    def test_register_username_taken(self):
        rv = self.register('mario', 'wario')
        assert 'New user successfully registered' in rv.data
        rv = self.register('mario', 'wario')
        assert 'Username is already taken.' in rv.data

    def test_register_username_too_long(self):
        rv = self.register("x" * 31, 'wario')  # username length limit is 30 chars
        assert 'Username or password is too long (more than 30 characters).' in rv.data

    def test_register_password_too_long(self):
        rv = self.register('Megaman', 'W' * 31)  # password length limit is 30 chars
        assert 'Username or password is too long (more than 30 characters).' in rv.data

    # Login tests
    def test_login_registered_user(self):
        self.register('mario', 'wario')
        rv = self.login('mario', 'wario')
        assert 'You are now logged in' in rv.data
        rv = self.login('mario', 'wariooo')  # Incorrect password
        assert 'Incorrect username or password' in rv.data
        rv = self.login('Bowser', 'Peach')
        assert 'Incorrect username or password' in rv.data

    def test_login_case_insensitive_username(self):
        self.register('waluigi', 'pepe')
        rv = self.login('WALUIGI', 'pepe')
        assert 'You are now logged in' in rv.data

    def test_login_case_sensitive_password(self):
        self.register('bowser', 'FeelsGoodMan')
        rv = self.login('bowser', 'feelsgoodman')
        assert 'Incorrect username or password' in rv.data
        rv = self.login('bowser', 'FeelsGoodMan')
        assert 'You are now logged in' in rv.data

    def test_logout(self):
        self.register('mario', 'wario')
        self.login('mario', 'wario')
        rv = self.logout()
        assert 'User logged out' in rv.data
        rv = self.logout()
        assert 'User logged out' in rv.data  # Doesn't care if you're not logged in

    def test_record_win(self):
        self.register('mario', 'wario')
        self.login('mario', 'wario')
        self.record_results('mario', 1, 0, 0)
        rv = self.show_user('mario')
        assert 'Wins: 1' in rv.data
        assert 'Losses: 0' in rv.data
        assert 'Draws: 0' in rv.data

    def test_record_loss(self):
        self.register('Peach', 'goomba')
        self.login('Peach', 'goomba')
        self.record_results('peach', 0, 1, 0)
        rv = self.show_user('peach')
        assert 'Wins: 0' in rv.data
        assert 'Losses: 1' in rv.data
        assert 'Draws: 0' in rv.data

    def test_record_draw(self):
        self.register('Peach', 'goomba')
        self.login('Peach', 'goomba')
        self.record_results('peach', 0, 0, 1)
        rv = self.show_user('peach')
        assert 'Wins: 0' in rv.data
        assert 'Losses: 0' in rv.data
        assert 'Draws: 1' in rv.data

    #  Not sure how to test this properly. There is a bug search function I think, but it will still respond with 200
    def test_search(self):
        self.register('Peach', 'goomba')
        self.login('Peach', 'goomba')
        rv = self.search()
        assert rv.status_code == 200

if __name__ == '__main__':
    unittest.main()



