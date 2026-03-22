import io
import os

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import sympy as sp
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402 (must follow matplotlib.use)

app = Flask(__name__)
CORS(app)

# ---- Function parsing ----
def parse_function(expr):
    x = sp.symbols('x')
    func = sp.sympify(expr)
    return sp.lambdify(x, func, "numpy")

# ---- Numerical methods ----
def trapezoid(f, a, b, n):
    x = np.linspace(a, b, n + 1)
    y = f(x)
    h = (b - a) / n
    return h * (0.5 * y[0] + 0.5 * y[-1] + np.sum(y[1:-1]))

def simpson(f, a, b, n):
    if n % 2 != 0:
        n += 1
    x = np.linspace(a, b, n+1)
    y = f(x)
    h = (b - a)/n
    return (h/3) * (y[0] + y[-1] + 4*np.sum(y[1::2]) + 2*np.sum(y[2:-1:2]))

def romberg(f, a, b, k=5):
    R = np.zeros((k, k))
    for i in range(k):
        R[i,0] = trapezoid(f, a, b, 2**i)
        for j in range(1, i+1):
            R[i,j] = (4**j * R[i,j-1] - R[i-1,j-1]) / (4**j - 1)
    return R[k-1,k-1]

def monte_carlo(f, a, b, n):
    x = np.random.uniform(a, b, n)
    return (b - a) * np.mean(f(x))

# ---- Endpoints ----
@app.post("/integrate")
def integrate():
    data = request.json
    expr = data["function"]
    a = float(data["a"])
    b = float(data["b"])
    method = data["method"]
    n = int(data["n"])

    f = parse_function(expr)

    if method == "trapezoid":
        res = trapezoid(f, a, b, n)
    elif method == "simpson":
        res = simpson(f, a, b, n)
    elif method == "romberg":
        res = romberg(f, a, b)
    elif method == "montecarlo":
        res = monte_carlo(f, a, b, n)
    else:
        return jsonify({"error": "Invalid method"}), 400

    return jsonify({"result": float(res)})

# Return sampled points for plotting on a canvas chart
@app.post("/samples")
def samples():
    data = request.json
    expr = data["function"]
    a = float(data["a"])
    b = float(data["b"])
    points = int(data.get("points", 400))

    f = parse_function(expr)
    xs = np.linspace(a, b, points)
    ys = f(xs)
    ys = np.real_if_close(ys)
    ys = np.nan_to_num(ys)

    return jsonify({
        "x": xs.tolist(),
        "y": [float(v) for v in ys]
    })

# (Old PNG route still available if you want)
@app.get("/plot")
def plot_png():
    expr = request.args.get("func", "sin(x)")
    a = float(request.args.get("a"))
    b = float(request.args.get("b"))
    f = parse_function(expr)
    x = np.linspace(a, b, 400)
    y = f(x)
    fig, ax = plt.subplots()
    ax.plot(x, y)
    ax.set_title(expr)
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

@app.get("/")
def home():
    return "Backend running!"

if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=5000, debug=debug)
