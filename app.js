(function () {
  'use strict';

  var STORAGE_KEY = 'palace-diet-entries';

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDateLabel(key) {
    var parts = key.split('-');
    return parts[1] + '月' + parts[2] + '日';
  }

  function dayDiff(a, b) {
    var da = new Date(a + 'T00:00:00');
    var db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / (1000 * 60 * 60 * 24));
  }

  function calcStreak(entries) {
    if (entries.length === 0) return 0;
    var dates = entries.map(function (e) { return e.date; });
    dates.sort();
    var unique = Array.from(new Set(dates));
    var today = todayKey();
    var last = unique[unique.length - 1];
    var gapFromToday = dayDiff(last, today);
    if (gapFromToday > 1) return 0;

    var streak = 1;
    for (var i = unique.length - 1; i > 0; i--) {
      var diff = dayDiff(unique[i - 1], unique[i]);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  var moodSymbols = { '3': '◆', '2': '◇', '1': '○' };
  var moodLabels = { '3': '良い', '2': 'ふつう', '1': 'つらい' };

  function render() {
    var entries = loadEntries();
    entries.sort(function (a, b) { return a.date.localeCompare(b.date); });

    var streak = calcStreak(entries);
    document.getElementById('streakNum').textContent = streak;
    document.getElementById('totalNum').textContent = entries.length;

    renderGate(streak);
    renderScroll(entries);
    renderChart(entries);
  }

  function renderGate(streak) {
    var tier1 = document.getElementById('ornamentsTier1');
    var tier2 = document.getElementById('ornamentsTier2');
    var tier3 = document.getElementById('ornamentsTier3');
    var glow = document.getElementById('glowCircle');
    var caption = document.getElementById('gateCaption');
    var frame = document.getElementById('gateFrame');

    tier1.style.transition = tier2.style.transition = tier3.style.transition = 'opacity 0.8s ease';
    tier1.style.opacity = streak >= 1 ? '1' : '0';
    tier2.style.opacity = streak >= 7 ? '1' : '0';
    tier3.style.opacity = streak >= 21 ? '1' : '0';

    var glowR = Math.min(40 + streak * 4, 140);
    glow.setAttribute('r', String(glowR));

    var saturation = Math.min(1 + streak * 0.04, 1.5);
    var brightness = Math.min(1 + streak * 0.025, 1.35);
    frame.style.filter = 'saturate(' + saturation + ') brightness(' + brightness + ')';

    var msg;
    if (streak === 0) {
      msg = '最初の扉を、ひらこう';
    } else if (streak < 7) {
      msg = '扉がそっと、光をまといはじめた';
    } else if (streak < 21)
      msg = '柱に金が刻まれてゆく';
    else if (streak < 50) {
      msg = '宮殿は、もうあなたのもの';
    } else {
      msg = '伝説は、ここからはじまる';
    }
    caption.textContent = msg + '（' + streak + '日目）';
  }

  function renderScroll(entries) {
    var list = document.getElementById('scrollList');
    if (entries.length === 0) {
      list.innerHTML = '<li class="scroll-empty">まだ記録はありません</li>';
      return;
    }
    var reversed = entries.slice().reverse().slice(0, 30);
    list.innerHTML = reversed.map(function (e) {
      var weightStr = e.weight !== null && e.weight !== undefined ? e.weight + ' kg' : '—';
      var note = e.note ? '<span class="scroll-note">' + escapeHtml(e.note) + '</span>' : '';
      return '<li class="scroll-item">' +
        '<span class="scroll-date">' + formatDateLabel(e.date) + '</span>' +
        '<span class="scroll-mid">' + moodSymbols[e.mood] + ' ' + moodLabels[e.mood] + note + '</span>' +
        '<span class="scroll-weight">' + weightStr + '</span>' +
        '</li>';
    }).join('');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  var chartInstance = null;

  function renderChart(entries) {
    var withWeight = entries.filter(function (e) { return e.weight !== null && e.weight !== undefined; });
    var emptyMsg = document.getElementById('chartEmpty');
    var canvas = document.getElementById('weightChart');

    if (withWeight.length < 2) {
      canvas.style.display = 'none';
      emptyMsg.style.display = 'block';
      return;
    }
    canvas.style.display = 'block';
    emptyMsg.style.display = 'none';

    var labels = withWeight.map(function (e) { return formatDateLabel(e.date); });
    var data = withWeight.map(function (e) { return e.weight; });

    if (chartInstance) {
      chartInstance.destroy();
    }

    var ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: '#a07c3f',
          backgroundColor: 'rgba(201, 163, 92, 0.12)',
          borderWidth: 2,
          pointBackgroundColor: '#6b3a2e',
          pointRadius: 3,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { family: 'EB Garamond', size: 11 }, color: '#6b5d4a', maxRotation: 0, autoSkip: true },
            grid: { display: false }
          },
          y: {
            ticks: { font: { family: 'EB Garamond', size: 11 }, color: '#6b5d4a' },
            grid: { color: 'rgba(107, 86, 54, 0.1)' }
          }
        }
      }
    });
  }

  document.getElementById('entryForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var weightVal = document.getElementById('weightInput').value;
    var mood = document.getElementById('moodSelect').value;
    var note = document.getElementById('noteInput').value.trim();

    var entries = loadEntries();
    var today = todayKey();
    entries = entries.filter(function (en) { return en.date !== today; });

    entries.push({
      date: today,
      weight: weightVal ? parseFloat(weightVal) : null,
      mood: mood,
      note: note
    });

    saveEntries(entries);
    document.getElementById('weightInput').value = '';
    document.getElementById('noteInput').value = '';

    var btn = document.getElementById('submitBtn');
    var original = btn.textContent;
    btn.textContent = '刻まれました';
    setTimeout(function () { btn.textContent = original; }, 1400);

    render();
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (confirm('すべての記録を消します。よろしいですか？')) {
      localStorage.removeItem(STORAGE_KEY);
      render();
    }
  });

  render();
})();
