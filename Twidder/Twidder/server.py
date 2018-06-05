from Twidder import app
from flask import request, jsonify
from geventwebsocket import WebSocketError
import database_helper
import uuid
import json
clients = {}


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
                                if user in clients:
                                    print("Telling previous user to leave")
                                    msg = {"type": "signout"}
                                    clients[user].send(json.dumps(msg))

                                clients[user] = ws
                            # User is None, sign them out anyways
                            else:
                                msg = {"type": "signout"}
                                ws.send(json.dumps(msg))

                            print(">> Active clients:")
                            for client in clients:
                                print(client)

                        if message["type"] == "get-stats":
                            token = message["data"]
                            email = database_helper.get_email(token)
                            send_stats(False, email)

                    except TypeError as te:
                        print te
                        return ""
                else:
                    # Message is None
                    break

            except WebSocketError, e:
                print "Connection closed..."
                print e
                for user, s in clients.items():
                    if ws == s:
                        # Remove socket
                        del clients[user]

        print("Closing socket...")
        for user, s in clients.items():
            if ws == s:
                # Remove socket
                del clients[user]
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
        if clients.get(user) is not None:
            del clients[user]
            print("3: Current clients:")
            for client in clients:
                print(client)

    if database_helper.signout_user(token):
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
    data = {
        'email': user_data[0],
        'firstname': user_data[1],
        'familyname': user_data[2],
        'gender': user_data[3],
        'city': user_data[4],
        'country': user_data[5]
    }
    return jsonify(success=True, message="User data retrieved!", data=data)


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
    data = {
        'email': user_data[0],
        'firstname': user_data[1],
        'familyname': user_data[2],
        'gender': user_data[3],
        'city': user_data[4],
        'country': user_data[5]
    }
    return jsonify(success=True, message="User data retrieved!", data=data)


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

    data = {
        'writer': user_messages[0],
        'content': user_messages[1]
    }
    return jsonify(success=True, message="Messages retrieved!", data=data)


@app.route('/post-message', methods=['POST'])
def post_message():
    req = request.get_json(force=True)
    token = req['token']
    # Make sure token is valid
    from_user = database_helper.get_email(token)
    if from_user is None:
        return jsonify(success=False, message="Log in to post a message!")

    message_info = {
        'message': req['message'],
        'from_user': from_user,
        'to_user': req['email']
    }

    # print message_info

    if not database_helper.post_message(message_info):
        return jsonify(success=False, message="Failed to post message!")

    send_stats(False, message_info['to_user'])
    return jsonify(success=True, message="Message posted!")


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
    # Send data to client
    if len(args) > 0:
        stats = database_helper.get_stats(args[0])
    else:
        stats = database_helper.get_stats()

    msg = {
        "type": "get-stats",
        "data": stats
    }

    # Send data to all users
    if to_all:
        for client in clients:
            clients[client].send(json.dumps(msg))
    # Only send to current client
    else:
        try:
            clients[args[0]].send(json.dumps(msg))
        except KeyError, e:
            print("Friend isn't online :)")


if __name__ == '__main__':
    app.run()
