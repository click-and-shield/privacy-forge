import { createEstimator, MAX_PASSWORD_LENGTH, type DictionaryName } from './password';

const element = (id: string) => document.getElementById(id)!;
const password = element('password') as HTMLInputElement;
const personalWords = element('user-inputs') as HTMLInputElement;
const showPassword = element('show-password') as HTMLInputElement;
const form = element('password-form') as HTMLFormElement;
const choices = Array.from(form.querySelectorAll<HTMLInputElement>('[name="dictionary"]'));
const selected = () => choices.filter(input => input.checked).map(input => input.value as DictionaryName);
let estimator = createEstimator(selected());
let timer: ReturnType<typeof setTimeout> | undefined;
const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];

function clearResults(message: string) {
  element('results').hidden = true;
  element('status').textContent = message;
  element('feedback-warning').textContent = '';
  element('suggestions').replaceChildren();
  element('guesses').textContent = '';
  for (const cell of form.parentElement!.querySelectorAll('[id^="time-"]')) cell.textContent = '';
}

function analyse() {
  clearTimeout(timer);
  if (!password.value) return clearResults('Enter a password to estimate its strength.');
  if (password.value.length > MAX_PASSWORD_LENGTH) {
    return clearResults(`Password exceeds ${MAX_PASSWORD_LENGTH} characters. No estimate was calculated.`);
  }
  try {
    const result = estimator.check(password.value, personalWords.value.split(',').map(word => word.trim()).filter(Boolean));
    element('status').textContent = `${labels[result.score]} — ${result.score}/4`;
    element('strength-meter').setAttribute('aria-valuenow', String(result.score));
    element('strength-meter').setAttribute('aria-valuetext', `${labels[result.score]} (${result.score}/4)`);
    element('strength-bar').className = `progress-bar ${colors[result.score]}`;
    element('strength-bar').style.width = `${(result.score + 1) * 20}%`;
    element('feedback-warning').textContent = result.feedback.warning;
    element('suggestions').replaceChildren(...result.feedback.suggestions.map(suggestion => {
      const item = document.createElement('li');
      item.textContent = suggestion;
      return item;
    }));
    element('guesses').textContent = result.guesses.toLocaleString('en', { maximumSignificantDigits: 3 });
    const times = result.crackTimes;
    element('time-online-limited').textContent = times.onlineThrottlingXPerHour.display;
    element('time-online').textContent = times.onlineNoThrottlingXPerSecond.display;
    element('time-offline-slow').textContent = times.offlineSlowHashingXPerSecond.display;
    element('time-offline-fast').textContent = times.offlineFastHashingXPerSecond.display;
    element('results').hidden = false;
  } catch {
    clearResults('Unable to estimate this password. Try a shorter input.');
  }
}

for (const input of [password, personalWords]) input.addEventListener('input', () => {
  clearTimeout(timer);
  clearResults('Calculating…');
  timer = setTimeout(analyse, 200);
});
for (const input of choices) input.addEventListener('change', () => {
  estimator = createEstimator(selected());
  element('dictionary-warning').hidden = selected().length > 0;
  analyse();
});
showPassword.addEventListener('change', () => { password.type = showPassword.checked ? 'text' : 'password'; });
form.addEventListener('submit', event => { event.preventDefault(); analyse(); });
form.addEventListener('reset', event => {
  event.preventDefault();
  clearTimeout(timer);
  password.value = '';
  personalWords.value = '';
  showPassword.checked = false;
  password.type = 'password';
  analyse();
  password.focus();
});
element('loading').hidden = true;
form.hidden = false;
analyse();
