from Twidder import app
from flask import request, jsonify
from geventwebsocket import WebSocketError
import database_helper
import uuid
import json

clients = {}


@app.route('/', methods=['GET'])
def welcome_view():
    print("redirecting...")
    return app.send_static_file('client.html')


@app.route('/socket')
def socket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        while True:
            try:
                message = ws.receive()
                try:
                    message = json.loads(message)

                    if message["type"] == "login":
                        token = message["data"]
                        user = database_helper.get_email(token)
                    # if user already has a connection, send 'signout'
                        if user in clients:
                            data = {"type": "signout"}
                            clients[user].send(json.dumps(data))
                    # update clients with new user
                        clients[user] = ws

                        print "new client logged in..."
                        for client in clients:
                            print(client)
                    if message["type"] == "stats":

                        # Send data to client
                        print "Client requested data";

                except TypeError:
                    print("didn't get a JSON")
                    return

            except WebSocketError:
                print("failed I guess")
                break
    return


@app.route('/signup', methods=['POST'])
def signup():
    data = {'email': request.form['email'],
            'password': request.form['password'],
            'firstname': request.form['firstname'],
            'familyname': request.form['familyname'],
            'gender': request.form['gender'],
            'city': request.form['city'],
            'country': request.form['country']
            }

    # Validate
    if not fields_filled_in(data):
        return jsonify(success=False, message="All fields must be filled in")
    # Check length
    if not validate(data['password']):
        return jsonify(success=False, message="Password must be at least 225 characters long")
    # Try add user
    if not (database_helper.add_user(data)):
        return jsonify(success=False, message="User already exists")
    # User successfully added
    return jsonify(success=True, message="User added!")


@app.route('/signin', methods=['POST'])
def signin():
    email = request.form['email']
    password = request.form['password']

    # See if user exists in database
    if database_helper.find_user(email, password):
        token = uuid.uuid4().hex
        # Add user to logged in users
        if database_helper.login_user(email, token):
            return jsonify(success=True, message="Login successful!", data=token)
        else:
            # Shouldn't happen
            return jsonify(success=False, message="Failed to login user!")
    else:
        return jsonify(success=False, message="Username or password incorrect!")


@app.route('/signout', methods=['POST'])
def signout():
    token = request.form['token']
    # Get the email associated with the token, and delete
    user = database_helper.get_email(token)

    if user is not None:
        if clients.get(user) is not None:
            del clients[user]
            print "removed client..."
            for client in clients:
                print(client)

    if database_helper.signout_user(token):

        return jsonify(success=True, message="Logout successful!")
    else:
        return jsonify(success=False, message="Failed to log out user!")


@app.route('/change-password', methods=['POST'])
def change_password():
    token = request.form['token']
    old_password = request.form['old_password']
    new_password = request.form['new_password']

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


@app.route('/is-signed-in', methods=['GET'])
def is_signed_in():
    print "checking if signed in..."
    token = request.args.get('token')
    email = database_helper.get_email(token)
    if email is None:
        return jsonify(success=False, message="Not logged in!")
    return jsonify(success=True, message="User logged in")


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

    token = request.form['token']
    # Make sure token is valid
    from_user = database_helper.get_email(token)
    if from_user is None:
        return jsonify(success=False, message="Log in to post a message!")

    message_info = {
        'message': request.form['message'],
        'from_user': from_user,
        'to_user': request.form['email']
    }

    print message_info

    if not database_helper.post_message(message_info):
        return jsonify(success=False, message="Failed to post message!")

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


if __name__ == '__main__':
    app.run()
