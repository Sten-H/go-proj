import os
import go_proj
import tempfile
import unittest


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
        assert 'Username is occupied' in rv.data

    def test_register_username_too_long(self):
        rv = self.register("x" * 31, 'wario')  # username length limit is 30 chars
        assert 'Invalid username. Too many characters (>30)' in rv.data

    def test_register_password_too_long(self):
        rv = self.register('Megaman', 'W' * 31)  # password length limit is 30 chars
        assert 'Invalid password. Too many characters (>30)' in rv.data

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
        self.register('mario', 'wario')
        rv = self.login('mario', 'WArio')
        assert 'Incorrect username or password' in rv.data
        self.register('waluigi', 'pepe')
        rv = self.login('waluigi', 'PEPE')
        assert 'Incorrect username or password' in rv.data
        self.register('bowser', 'FeelsGoodMan')
        rv = self.login('waluigi', 'FeelsGoodMan')
        assert 'You are now logged in' in rv.data

    def test_logout(self):
        self.register('mario', 'wario')
        self.login('mario', 'wario')
        rv = self.logout()
        assert 'User logged out' in rv.data
        rv = self.logout()
        assert 'User logged out' in rv.data  # Doesn't care if you're not logged in


if __name__ == '__main__':
    unittest.main()



