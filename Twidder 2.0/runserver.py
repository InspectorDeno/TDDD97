from gevent.wsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler
from Twidder import app

print(">>Starting server<<")
app.debug = True
http_server = WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
try:
    http_server.serve_forever()
except KeyboardInterrupt:
    print ">>Shutting down server<<"
    http_server.close()