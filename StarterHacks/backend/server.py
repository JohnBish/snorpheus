from http.server import BaseHTTPRequestHandler, HTTPServer
from keras.models import model_from_json
import json
import numpy as np

json_file = open('model.json', 'r')
loaded_model_json = json_file.read()
json_file.close()
model = model_from_json(loaded_model_json)
model.load_weights("model.h5")


class Server(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get('content-length', 0))
        post_body = self.rfile.read(content_len)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(predict(post_body.decode('utf-8')))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With")
        self.do_POST()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


def predict(inp):
    #print(inp)
    inp = "[" + inp + "]"
    semitoneArray = np.array([json.loads(inp)])
    out = model.predict_classes(semitoneArray)
    return bytes(str(out[0]).encode('utf-8'))

def run():
    server_address = ('127.0.0.1', 8080)
    httpd = HTTPServer(server_address, Server)
    print('running server...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == "__main__":
    run()
