from flask import Flask, request, Response
app = Flask(__name__)

app.debug = True

@app.route('/')
def user_info():
	user_agent = request.user_agent
	args_str  = "ip : " + request.remote_addr + "\nplatform : " + user_agent.platform + "\nbrowser : " + user_agent.browser + "\nversion : " + user_agent.version + "\nlanguage: " + str(user_agent.language)
	return Response(args_str, mimetype='text/plain')

if __name__ == '__main__':
    app.run()
