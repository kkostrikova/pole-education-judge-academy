// Server messages (Postgres `raise exception` texts) and SQLSTATEs -> Ukrainian copy for toasts.
const BY_MESSAGE = [
  [/performance already confirmed/i, 'Виступ уже підтверджено. Зверніться до Head Judge.'],
  [/sheet already submitted/i, 'Протокол уже надіслано. Змінити його може лише Head Judge.'],
  [/not all sheets submitted/i, 'Ще не всі протоколи надіслані.'],
  [/only head judge/i, 'Це може зробити лише Head Judge цієї категорії.'],
  [/not your seat/i, 'Немає доступу до цього протоколу.'],
  [/sheet is not submitted/i, 'Протокол ще не надіслано.'],
  [/performance is not confirmed/i, 'Виступ ще не підтверджено.'],
  [/comment required/i, 'Для цього штрафу потрібен коментар.'],
  [/missing score/i, 'Не всі критерії оцінено.'],
];

const BY_CODE = {
  42501: 'Немає доступу до цього протоколу.',
  22023: 'Некоректні дані протоколу.',
  23505: 'Такий запис уже існує (наприклад, повторюється стартовий номер або місце в панелі).',
  23503: 'Неможливо видалити: запис використовується (наприклад, у суддя є призначення).',
};

export const GENERIC_ERROR = 'Сталася помилка. Спробуйте ще раз.';

export function uaError(e) {
  const message = typeof e?.message === 'string' ? e.message : '';
  for (const [re, text] of BY_MESSAGE) if (re.test(message)) return text;
  return BY_CODE[e?.code] ?? GENERIC_ERROR;
}
