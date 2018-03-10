import sqlite3
from flask import g

DATABASE = 'database.db'

# For overriding row_factory attribute and lets us dump select statements to JSON
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def connect():
    return sqlite3.connect(DATABASE)


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect()
    return db


def add_user(data):
    db = get_db()
    user = (data['email'],
            data['password'],
            data['firstname'],
            data['familyname'],
            data['gender'],
            data['city'],
            data['country'])
    try:
        db.execute('INSERT INTO users VALUES (?,?,?,?,?,?,?)', user)
        db.commit()
        return True
    except:
        return False


def find_user(email, password):
    db = get_db()
    cur = db.cursor()
    user = (email, password)
    cur.execute('SELECT email,password FROM users WHERE email = ? AND password = ?', user)
    user = cur.fetchone()
    if user:
        return True
    else:
        return False


def login_user(email, token):
    db = get_db()
    user = (email, token)
    try:
        db.execute('INSERT OR REPLACE INTO logged_in_users VALUES (?,?)', user)
        db.commit()
        return True
    except:
        return False


def signout_user(tok):
    db = get_db()
    token = (tok,)
    try:
        db.execute('DELETE FROM logged_in_users WHERE token = ?', token)
        db.commit()
        return True
    except:
        return False


def get_email(tok):
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute('SELECT email FROM logged_in_users WHERE token = ?', token)
        email = cur.fetchone()
        return email[0]
    except:
        return None


def change_password(new_password, email):
    db = get_db()
    new_user = (new_password, email)
    try:
        db.execute('UPDATE users SET password = ? WHERE email = ?', new_user)
        db.commit()
        return True
    except:
        return False


def get_user_data_by_token(tok):
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute('SELECT * FROM users WHERE email IN (SELECT email FROM logged_in_users WHERE token = ?)', token)
        user_data = cur.fetchone()
        return [user_data[0], user_data[2], user_data[3], user_data[4], user_data[5], user_data[6]]
    except:
        return None


def get_user_data_by_email(mail):
    db = get_db()
    cur = db.cursor()
    email = (mail,)
    try:
        cur.execute('SELECT * FROM users WHERE email = ?', email)
        user_data = cur.fetchone()
        return [user_data[0], user_data[2], user_data[3], user_data[4], user_data[5], user_data[6]]
    except:
        return None


def get_user_messages_by_token(tok):
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute(
            'SELECT from_user,content FROM messages WHERE to_user IN ('
            'SELECT email FROM logged_in_users WHERE token = ?)', token)
        all_messages = cur.fetchall()

        writers = []
        messages = []
        for message in all_messages:
            writers.append(message[0])
            messages.append(message[1])
        return writers, messages
    except:
        return None


def get_user_messages_by_email(mail):
    db = get_db()
    cur = db.cursor()
    email = (mail,)
    try:
        cur.execute(
            'SELECT from_user,content FROM messages WHERE to_user = ?', email)
        all_messages = cur.fetchall()

        writers = []
        messages = []
        for message in all_messages:
            writers.append(message[0])
            messages.append(message[1])
        return writers, messages
    except:
        return None


def post_message(info):
    db = get_db()
    message_info = (info['message'],
                    info['from_user'],
                    info['to_user'])
    try:
        db.execute('INSERT INTO messages (content, from_user, to_user) VALUES (?,?,?)', message_info)
        db.commit()
        return True
    except:
        return False


def get_stats(*usr):
    db = get_db()
    # For generating JSON Docs from the SQLite
    db.row_factory = dict_factory
    cur = db.cursor()
    try:
        cur.execute('SELECT gender, COUNT(*) AS count FROM users GROUP BY gender;')
        gender_stats = cur.fetchall()
        cur.execute('SELECT (SELECT COUNT(*) FROM users) AS total, '
                    '(SELECT COUNT(*) FROM logged_in_users) AS logged_in')
        login_stats = cur.fetchall()
        if len(usr) > 0:
            user = (usr[0],)
            cur.execute('SELECT from_user, COUNT(*) AS count FROM messages'
                        ' WHERE to_user = ? GROUP BY from_user', user)
            message_stats = cur.fetchall()
            json = {'gender_stats': gender_stats,
                    'login_stats': login_stats,
                    'message_stats': message_stats}
        else:
            json = {'gender_stats': gender_stats,
                    'login_stats': login_stats
                    }
        # print json
        return json
    except:
        print len(usr)
        return None


def close():
    get_db().close()
