import sqlite3
from Twidder import app
from flask import g

DATABASE = 'database.db'


def get_db():
    """
    For getting database attribute
    :return: The database object
    """
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect_db()
    db.row_factory = dict_factory
    return db


def dict_factory(cursor, row):
    """
    For overriding row_factory attribute and lets us dump select statements to JSON
    :param cursor: db cursor
    :param row: row at index
    :return: whats fetched from cursor in json-format
    """
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def connect_db():
    """
    Connects to database
    :return: database
    """
    return sqlite3.connect(DATABASE)


def add_user(data):
    """
    Add a user to the database
    :param data: Array of values for adding the user
    :return: True if success, False if not
    """
    db = get_db()
    user = (data['email'],
            data['password'],
            data['firstname'],
            data['familyname'],
            data['gender'],
            data['city'],
            data['country'],
            app.config['DEFAULT_PIC'])
    try:
        db.execute('INSERT INTO users VALUES (?,?,?,?,?,?,?,?)', user)
        db.commit()
        return True
    except:
        return False


def find_user(email, password):
    """
    Check if a user exists given their email and password
    :param email: Their email
    :param password: Their password
    :return: True if password and email is correct, false if not
    """
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
    """
    Log in a user given their email and token
    :param email: Their email
    :param token: Their token
    :return: True if successful, false if not
    """
    db = get_db()
    user = (email, token)
    try:
        db.execute('INSERT OR REPLACE INTO logged_in_users VALUES (?,?)', user)
        db.commit()
        return True
    except:
        return False


def sign_out_user(tok):
    """
    Signs out a user given their session token
    :param tok: Their token
    :return: True if successful, false if not
    """
    db = get_db()
    token = (tok,)
    try:
        db.execute('DELETE FROM logged_in_users WHERE token = ?', token)
        db.commit()
        return True
    except:
        return False


def get_email(tok):
    """
    Get the email of a user given their token
    :param tok: Their token
    :return: Email (string) if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute('SELECT email FROM logged_in_users WHERE token = ?', token)
        json = cur.fetchone()
        return json.get('email')
    except KeyError as e:
        print "KeyError: ", e
        return None
    except:
        return None


def change_password(new_password, email):
    """
    Change the password of a user given their email
    :param new_password: The new password
    :param email: Their email
    :return: True if successful, false if not
    """
    db = get_db()
    new_user = (new_password, email)
    try:
        db.execute('UPDATE users SET password = ? WHERE email = ?', new_user)
        db.commit()
        return True
    except:
        return False


def get_user_data_by_token(tok):
    """
    Get user data given their token
    :param tok: Their token
    :return: User data (Json object) if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute('SELECT email,firstname,familyname,gender,city,country,profile_pic '
                    'FROM users WHERE email IN (SELECT email FROM logged_in_users WHERE token = ?)', token)
        json = cur.fetchone()
        return json
    except:
        return None


def get_user_data_by_email(mail):
    """
    Get user data given their email
    :param mail: Their email
    :return: User data (Json object) if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    email = (mail,)
    try:
        cur.execute('SELECT email,firstname,familyname,gender,city,country,profile_pic '
                    'FROM users WHERE email = ?', email)
        json = cur.fetchone()
        return json
    except:
        return None


def get_user_messages_by_token(tok):
    """
    Get messages posted on user's wall given their token
    :param tok: Their token
    :return: Message data (Json object) if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    token = (tok,)
    try:
        cur.execute(
            'SELECT from_user,content FROM messages WHERE to_user IN ('
            'SELECT email FROM logged_in_users WHERE token = ?)', token)
        json = cur.fetchall()
        return json
    except:
        return None


def get_user_messages_by_email(mail):
    """
    Get messages posted on user's wall given their token
    :param mail: Their email
    :return: Message data (Json object) if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    email = (mail,)
    try:
        cur.execute(
            'SELECT from_user,content FROM messages WHERE to_user = ?', email)
        json = cur.fetchall()
        return json
    except :
        return None


def post_message(message, from_user, to_user):
    """
    Post message to a user
    :param message: The message to be posted
    :param from_user: The user that sent the message
    :param to_user: The user that received the message
    :return: True if successful, false if not
    """
    db = get_db()
    message_info = (message,from_user,to_user)
    try:
        db.execute('INSERT INTO messages (content, from_user, to_user) VALUES (?,?,?)', message_info)
        db.commit()
        return True
    except:
        return False


def get_stats(*usr):
    """
    Get stats about gender, logged in users and messages
    :param usr: variable parameter, email of the user whose stats is being updated
    :return: Stats (Either 3 types of stats if user was specified, else 2) (Json object) if successful, None if not
    """
    db = get_db()
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
            json = {
                'gender_stats': gender_stats,
                'login_stats': login_stats,
                'message_stats': message_stats
            }
        else:
            json = {
                'gender_stats': gender_stats,
                'login_stats': login_stats
            }
        return json
    except:
        return None


def store_media(email, path):
    """
    Stores path to media file given the user's email
    :param email: Their email
    :param path: The path to the media file
    :return: True if successful, 'duplicate' if file already existed, None if unsuccessful
    """
    db = get_db()
    cur = db.cursor()
    values = (email, path)
    try:
        cur.execute('INSERT INTO media (email,path) VALUES (?,?)', values)
        db.commit()
        return True
    except sqlite3.IntegrityError:
        print "Received duplicate files"
        return 'duplicate'
    except:
        return False


def retrieve_media(mail, *pic_id):
    """
    Get paths to media files and their id based on specified email
    :param mail: The email
    :return: Path and id of media file is successful (Json object), None if not
    """
    db = get_db()
    cur = db.cursor()
    try:
        if len(pic_id) > 0:
            # Retreive only one media path
            data = (mail, pic_id[0])
            cur.execute('SELECT path FROM media WHERE email = ? AND id = ?', data)
            json = cur.fetchone()
            return json

        else:
            data = (mail,)
            # Retreive all media paths
            cur.execute('SELECT path,id FROM media WHERE email = ?', data)
            json = cur.fetchall()
            return json

    except():
        return None


def delete_media(media_id, mail):
    """
    Delete user's media file given their email and the media id
    :param media_id: The specified id of the media
    :param mail: The user's email
    :return: True if successful, False if not
    """
    db = get_db()
    data = (media_id, mail)
    try:
        db.execute('DELETE FROM media WHERE id = ? AND email = ?', data)
        db.commit()
        return True
    except:
        return False


def change_profile_pic(pic_id, mail):
    """
    Change profile picture of user given their email
    :param pic_id: Path to their new image file
    :param mail: Their email
    :return: True if successful, None if not
    """
    db = get_db()
    cur = db.cursor()
    data = (pic_id, mail)
    try:
        cur.execute('UPDATE users SET profile_pic = '
                    '(SELECT path from media m WHERE m.id = ?) WHERE email = ?', data)
        db.commit()
        return True
    except:
        return False


def reset_profile_pic(default_pic, mail):
    db = get_db()
    cur = db.cursor()
    data = (default_pic, mail)
    try:
        cur.execute('UPDATE users SET profile_pic = ? WHERE email = ?', data)
        db.commit()
        return True
    except:
        return False


def close():
    """
    Closes the database
    :return: The closed connection
    """
    get_db().close()
