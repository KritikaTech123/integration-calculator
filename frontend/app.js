let chart;

// ----- Calculate + plot -----
async function calculate() {
  const body = {
    function: document.getElementById("func").value,
    a: document.getElementById("a").value,
    b: document.getElementById("b").value,
    method: document.getElementById("method").value,
    n: document.getElementById("n").value
  };

  document.getElementById("result").textContent = "Calculating…";

  try {
    // result
    const r = await fetch("http://127.0.0.1:5000/integrate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    const out = await r.json();
    document.getElementById("result").textContent = out.result ?? "—";

    // samples for chart
    const s = await fetch("http://127.0.0.1:5000/samples", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ function: body.function, a: body.a, b: body.b, points: 360 })
    });
    const series = await s.json();
    renderChart(series.x, series.y, body.function, body.a, body.b);
  } catch (e) {
    document.getElementById("result").textContent = "Backend offline";
  }
}

// ----- Apple-style Chart.js theme -----
function renderChart(xs, ys, label, a, b) {
  const ctx = document.getElementById("chart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: xs,
      datasets: [{
        label,
        data: ys,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.28,
        borderColor: "#0284c7",
        fill: false
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
          backgroundColor: "rgba(15,23,42,.9)",
          padding: 10,
          titleColor: "#e2e8f0",
          bodyColor: "#cbd5e1",
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          title: { display: true, text: `x   (a=${a}, b=${b})` },
          grid: { color: "rgba(100,116,139,.15)" },
          ticks: { maxTicksLimit: 7 }
        },
        y: {
          title: { display: true, text: "f(x)" },
          grid: { color: "rgba(100,116,139,.12)" },
          ticks: { maxTicksLimit: 6 }
        }
      }
    }
  });
}

// ----- Live preview / form helpers -----
function updatePreview() {
  document.getElementById("prevFunc").textContent = document.getElementById("func").value;
  document.getElementById("prevRange").textContent =
    `[${document.getElementById("a").value}, ${document.getElementById("b").value}]`;
}

function resetForm() {
  document.getElementById("func").value = "sin(x)";
  document.getElementById("a").value = "0";
  document.getElementById("b").value = "3.1416";
  document.getElementById("n").value = "100";
  document.getElementById("result").textContent = "—";
  if (chart) chart.destroy();
  updatePreview();
}

function copyResult() {
  navigator.clipboard.writeText(document.getElementById("result").textContent);
  alert("Result copied ✅");
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const func = document.getElementById("func").value;
  const a = document.getElementById("a").value;
  const b = document.getElementById("b").value;
  const method = document.getElementById("method").value;
  const n = document.getElementById("n").value;
  const result = document.getElementById("result").textContent;

  pdf.setFontSize(16); pdf.text("Integration Report", 14, 18);
  pdf.setFontSize(11);
  pdf.text(`Function: ${func}`, 14, 30);
  pdf.text(`Range: [${a}, ${b}]`, 14, 38);
  pdf.text(`Method: ${method}`, 14, 46);
  pdf.text(`n / samples: ${n}`, 14, 54);
  pdf.text(`Result: ${result}`, 14, 62);

  if (chart) {
    const img = chart.canvas.toDataURL("image/png", 1.0);
    pdf.addImage(img, "PNG", 14, 72, 180, 90);
  }
  pdf.save("integration_report.pdf");
}

// ----- Theme toggle (animated knob) -----
function toggleTheme() {
  const html = document.documentElement;
  const knob = document.getElementById("toggleKnob");
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  knob.style.transform = isDark ? "translateX(0)" : "translateX(22px)";
}

// ----- Smooth scroll + active highlight -----
function activateCurrent(id) {
  // sidebar icons
  document.querySelectorAll(".side-icon").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-target") === id);
  });
  // mobile nav
  document.querySelectorAll(".mnav-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-target") === id);
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) activateCurrent(entry.target.id);
  });
}, { rootMargin: "-40% 0px -55% 0px", threshold: 0.0 });

["calcCard", "resultCard", "graphCard", "aboutCard"].forEach(id => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});

// Smooth anchor scroll on click (desktop + mobile)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    const id = a.getAttribute("href").slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ----- Init -----
document.documentElement.setAttribute("data-theme","light");
document.getElementById("toggleKnob").style.transform = "translateX(0)";
updatePreview();

window.addEventListener("scroll", () => {
  document.querySelectorAll(".side-label").forEach(l => {
    l.style.opacity = 0;
    l.style.transform = "translateX(-8px)";
  });
});
