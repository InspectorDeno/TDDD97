from Twidder import app
from flask import request, jsonify
from geventwebsocket import WebSocketError
from werkzeug.utils import secure_filename
import database_helper
import uuid
import json
import os
import base64
import time
users = {}
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'mp4', 'ogg'}


@app.route('/', methods=['GET'])
def welcome_view():
    return app.send_static_file('client.html')


@app.route('/socket-api')
def socket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        while True:
            try:
                message = ws.receive()
                if message is not None:
                    try:
                        message = json.loads(message)
                        if message["type"] == "login":
                            token = message["data"]
                            user = database_helper.get_email(token)
                            # We want to log out any previous sessions
                            if user is not None:
                                if user in users:
                                    print("Telling previous user to leave")
                                    msg = {"type": "signout"}
                                    users[user].send(json.dumps(msg))

                                users[user] = ws
                            # User is None, sign them out anyways
                            else:
                                msg = {"type": "signout"}
                                ws.send(json.dumps(msg))

                            print(">> Active users:")
                            for user in users:
                                print(user)

                        if message["type"] == "get-stats":
                            token = message['token']
                            user = message.get('email')
                            visitor = database_helper.get_email(token)

                            print user
                            if visitor is not None:
                                if user is None:
                                    # send to us
                                    send_stats(False, visitor)
                                else:
                                    # send to both visitor and user
                                    send_stats(False, visitor, user)
                            else:
                                print "user logged out"

                    except TypeError as te:
                        print te
                        return ""
                else:
                    # Message is None
                    break

            except WebSocketError, e:
                print "Connection closed..."
                print e
                break

        print("Closing socket...")
        for user, s in users.items():
            if ws == s:
                # Remove socket
                del users[user]
        return ""

    return ""


@app.route('/signup', methods=['POST'])
def signup():
    req = request.get_json(force=True)
    data = {'email': req['email'],
            'password': req['password'],
            'firstname': req['firstname'],
            'familyname': req['familyname'],
            'gender': req['gender'],
            'city': req['city'],
            'country': req['country']
            }
    # Validate
    if not fields_filled_in(data):
        return jsonify(success=False, message="All fields must be filled in")
    # Check length
    if not validate(data['password']):
        return jsonify(success=False, message="Password must be at least 5 characters long")
    # Try add user
    if not (database_helper.add_user(data)):
        return jsonify(success=False, message="User already exists")
    # User successfully added
    # Send stats to all users
    send_stats(True)
    return jsonify(success=True, message="User added!")


@app.route('/signin', methods=['POST'])
def signin():
    req = request.get_json(force=True)
    email = req['email']
    password = req['password']
    # See if user exists in database
    if database_helper.find_user(email, password):
        token = uuid.uuid4().hex
        # Add user to logged in users
        if database_helper.login_user(email, token):
            # Send stats to all users
            send_stats(True)
            return jsonify(success=True, message="Login successful!", data=token)
        else:
            # Shouldn't happen
            return jsonify(success=False, message="Failed to login user!")
    else:
        return jsonify(success=False, message="Username or password incorrect!")


@app.route('/signout', methods=['POST'])
def signout():
    req = request.get_json(force=True)
    token = req['token']
    # Get the email associated with the token, and delete
    user = database_helper.get_email(token)
    print ("signing out user..")

    if user is not None:
        if users.get(user) is not None:
            del users[user]
            print("3: Current users:")
            for user in users:
                print(user)

    if database_helper.sign_out_user(token):
        # Send stats to all users
        send_stats(True)
        return jsonify(success=True, message="Logout successful!")
    else:
        return jsonify(success=False, message="Failed to log out user!")


@app.route('/change-password', methods=['POST'])
def change_password():
    req = request.get_json(force=True)
    token = req['token']
    old_password = req['old_password']
    new_password = req['new_password']

    # First see if passwords differ
    if old_password == new_password:
        return jsonify(success=False, message="Can't use the same password!")
    # Is the new password long enough?
    if not validate(new_password):
        return jsonify(success=False, message="Password has to be at least 5 characters!")

    # Use token to get email (also makes sure token is valid and that they are logged in)
    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message="User is not logged in!")
    # Make sure old password is correct
    if not database_helper.find_user(email, old_password):
        return jsonify(success=False, message="Incorrect password!")
    # Try changing the password
    if not database_helper.change_password(new_password, email):
        return jsonify(success=False, message="Failed to change password!")

    return jsonify(success=True, message="Password successfully changed!")


@app.route('/get-user-data-by-token/', methods=['GET'])
def get_user_data_by_token():
    # Gets the parsed contents of query string
    token = request.args.get('token')
    user_data = database_helper.get_user_data_by_token(token)

    if user_data is None:
        return jsonify(success=False, message="No such user!")

    media = []
    try:
        path = user_data['profile_pic']
        media_extension = path.rsplit('.', 1)[1]
        with open(path) as m:
            media.append([base64.b64encode(m.read()), media_extension])
    except IOError:
        # User deleted their profile picture, give them default
        path = app.config['DEFAULT_PIC']
        media_extension = path.rsplit('.', 1)[1]
        with open(path) as m:
            media.append([base64.b64encode(m.read()), media_extension])
        # Reset their profile picture
        print "Resetting their profile picture"
        database_helper.reset_profile_pic(path, user_data['email'])

    user_data['profile_pic'] = media
    return jsonify(success=True, message="User data retrieved!", data=user_data)


@app.route('/get-user-data-by-email/', methods=['GET'])
def get_user_data_by_email():
    # Gets the parsed contents of query string
    token = request.args.get('token')
    email = request.args.get('email')

    if database_helper.get_email(token) is None:
        return jsonify(success=False, message="You are not logged in!")
    user_data = database_helper.get_user_data_by_email(email)
    if user_data is None:
        return jsonify(success=False, message="No such user!")

    media = []
    path = user_data['profile_pic']
    media_extension = path.rsplit('.', 1)[1]
    with open(path) as m:
        media.append([base64.b64encode(m.read()), media_extension])

    user_data['profile_pic'] = media
    return jsonify(success=True, message="User data retrieved!", data=user_data)


@app.route('/get-user-messages-by-token/', methods=['GET'])
def get_user_messages_by_token():
    # Gets the parsed contents of query string
    token = request.args.get('token')
    user_messages = database_helper.get_user_messages_by_token(token)
    if user_messages is None:
        return jsonify(success=False, message="Failed to retrieved messages!")

    data = {
        'writer': user_messages[0],
        'content': user_messages[1]
    }
    return jsonify(success=True, message="Messages retrieved!", data=data)


@app.route('/get-user-messages-by-email/', methods=['GET'])
def get_user_messages_by_email():
    # Gets the parsed contents of query string
    token = request.args.get('token')
    email = request.args.get('email')

    if database_helper.get_email(token) is None:
        return jsonify(success=False, message="You are not logged in!")

    user_messages = database_helper.get_user_messages_by_email(email)
    if user_messages is None:
        return jsonify(success=False, message="Failed to retrieve messages!")

    return jsonify(success=True, message="Messages retrieved!", data=user_messages)


@app.route('/post-message', methods=['POST'])
def post_message():
    req = request.get_json(force=True)
    token = req['token']
    # Make sure token is valid
    from_user = database_helper.get_email(token)
    if from_user is None:
        return jsonify(success=False, message="Log in to post a message!")

    if not database_helper.post_message(req['message'], from_user, req['email']):
        return jsonify(success=False, message="Failed to post message!")

    if from_user == req['email']:
        send_stats(False, from_user)
    else:
        send_stats(False, from_user, req['email'])

    return jsonify(success=True, message="Message posted!")


@app.route('/upload-media', methods=['POST'])
def upload_media():
    print("Uploading media file...")
    token = request.form['token']
    mfile = request.files['file']

    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message='User not signed in')

    if mfile and allowed_format(mfile.filename):
        if not os.path.exists(app.config['UPLOAD_FOLDER'] + "/" + email):
            os.makedirs(app.config['UPLOAD_FOLDER'] + "/" + email)
        filename = secure_filename(mfile.filename)
        path = os.path.join(app.config['UPLOAD_FOLDER'] + '/' + email, filename)

        errcode = database_helper.store_media(email, path)
        if not errcode:
            return jsonify(success=False, message='Failed to upload file')
        if errcode is 'duplicate':
            return jsonify(success=False, message='Filename already exists: ' + filename)
        mfile.save(path)
        return jsonify(success=True, message='Successfully uploaded file')

    return jsonify(success=False, message='Unsupported file format')


@app.route('/download-media/token', methods=['POST'])
def download_media_token():
    req = request.get_json(force=True)
    token = req['token']
    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message='User not signed in')
    media_data = database_helper.retrieve_media(email)
    if media_data is None:
        return jsonify(success=False, message='Failed to download media')

    data = create_media(media_data)

    return jsonify(success=True, message='User media retrieved', data=data)


@app.route('/download-media/email', methods=['POST'])
def download_media_email():
    print("Downloading media from email")
    req = request.get_json(force=True)
    email = req['email']

    media_data = database_helper.retrieve_media(email)
    if media_data is None:
        return jsonify(success=False, message='Failed to download media')

    data = create_media(media_data)
    return jsonify(success=True, message='User media retrieved', data=data)


@app.route('/delete-media', methods=['POST'])
def delete_media():
    print "Deleting media"
    req = request.get_json(force=True)
    token = req['token']
    pic_id = req['id']
    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message='User not signed in')

    # Get path of file with specific media id
    filename = database_helper.retrieve_media(email, pic_id)
    if filename is None:
        return jsonify(success=False, message='Media file does not exist')
    if not database_helper.delete_media(pic_id, email):
        return jsonify(success=False, message='Failed to delete media file')

    os.remove(filename['path'])

    # Successfully deleted media, now download what remains
    media_data = database_helper.retrieve_media(email)
    if media_data is None:
        return jsonify(success=False, message='Failed to download media')

    data = create_media(media_data)
    return jsonify(success=True, message='Media file deleted!', data=data)


@app.route('/change-profile-pic', methods=['POST'])
def change_profile_pic():
    req = request.get_json(force=True)
    token = req['token']
    pic_id = req['id']

    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message='User not signed in')
    if not database_helper.change_profile_pic(pic_id, email):
        return jsonify(success=False, message='Failed to change picture')

    return jsonify(success=True, message='Profile picture changed!')


def create_media(media_data):
    media = []
    for entry in media_data:
        index = entry['id']
        path = entry['path']
        ext = path.rsplit('.', 1)[1]
        with open(path) as m:
            media.append([base64.b64encode(m.read()), ext, index])
    return media


def allowed_format(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


def fields_filled_in(data):
    for val in data:
        if len(val) == 0:
            return False
    return True


def validate(password):
    if len(password) < 5:
        return False
    return True


def send_stats(to_all, *args):
    # Send data to users
    if len(args) > 0:
        user = ""
        if len(args) == 1:
            # Get stats for us
            user = args[0]
        elif len(args) == 2:
            # Get stats of other user
            user = args[1]
        stats = database_helper.get_stats(user)
    else:
        # Don't bother getting message stats
        stats = database_helper.get_stats()

    msg = {
        "type": "get-stats",
        "data": stats
    }

    # Send data to all users
    if to_all:
        for user in users:
            try:
                print "1: sending stats to ", user
                users[user].send(json.dumps(msg))
            except:
                print "failed to send data to user"
    # Only send to affected users
    else:
        # print "args:"
        # print args
        if len(args) == 2:
            for user in args:
                if user in users:
                    print "2: sending stats to ", user
                    users[user].send(json.dumps(msg))
        else:
            print "3: sending stats to ", user
            users[args[0]].send(json.dumps(msg))


if __name__ == '__main__':
    app.run()
