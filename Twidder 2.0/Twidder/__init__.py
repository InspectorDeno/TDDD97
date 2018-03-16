from flask import Flask

app = Flask(__name__, static_url_path='')

UPLOAD_PATH = './Twidder/media'
DEFAULT_PIC = './Twidder/media/default/avatar.png'
app.config['UPLOAD_FOLDER'] = UPLOAD_PATH
app.config['DEFAULT_PIC'] = DEFAULT_PIC

import Twidder.server
