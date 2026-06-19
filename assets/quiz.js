/**
 * quiz.js — 可复用测验组件
 * 用法: 在 HTML 中放置 quiz 容器，然后调用 Quiz.render(containerId, questions)
 */
const Quiz = {
  render(containerId, questions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'quiz';
      div.innerHTML = `
        <h3>🧪 检验理解 #${i + 1}</h3>
        <p class="quiz-question">${q.question}</p>
        <ul class="quiz-options">
          ${q.options.map((opt, j) => `
            <li><button data-q="${i}" data-a="${j}">${opt}</button></li>
          `).join('')}
        </ul>
        <div class="quiz-feedback" id="feedback-${i}"></div>
      `;
      container.appendChild(div);
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-q]');
      if (!btn) return;

      const qi = parseInt(btn.dataset.q);
      const ai = parseInt(btn.dataset.a);
      const q = questions[qi];
      const feedback = document.getElementById(`feedback-${qi}`);
      const buttons = btn.parentElement.parentElement.querySelectorAll('button');

      // 禁用所有按钮
      buttons.forEach(b => b.disabled = true);

      if (ai === q.answer) {
        btn.classList.add('correct');
        feedback.className = 'quiz-feedback show correct';
        feedback.textContent = q.explanation || '✅ 正确！';
      } else {
        btn.classList.add('wrong');
        buttons[q.answer].classList.add('correct');
        feedback.className = 'quiz-feedback show wrong';
        feedback.textContent = q.explanation || `❌ 正确答案是: ${q.options[q.answer]}`;
      }
    });
  }
};
