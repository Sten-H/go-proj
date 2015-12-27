from flask.ext.sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    username = db.Column(db.String(30), primary_key=True)
    password = db.Column(db.String(30), nullable=False)

    def __init__(self, username, password):
        self.username = username
        self.password = password

    def __repr__(self):
        return self.username


def init_db(app):
    global db
    db = SQLAlchemy(app)
    db.create_all()


