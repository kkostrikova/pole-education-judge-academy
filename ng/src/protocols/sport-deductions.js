import { count, once, range } from './items.js';

export const deductions = {
  key: 'deductions',
  title: 'Чистота виконання, збавки',
  sections: [
    {
      title: 'За кожен випадок',
      items: [
        count('lines', 'Неправильні лінії', -0.2),
        count('transitions', 'Погане виконання переходів', -0.5),
        count('angle', 'Неправильний кут руху', -0.5),
        count('slip', 'Зісковзування', -0.5),
        count('balance', 'Втрата балансу', -1),
        count('tangle', 'Заплутування (тільки полотно)', -1, ['silks']),
        count('apparatus_loss', 'Втрата предмету (тільки кільце)', -1, ['hoop']),
        count('wipe', 'Витирання рук, поправляння костюма, зачіски, підспівування', -1),
        count('fall', 'Падіння', -5),
        count('erotic', 'Відверті чи еротичні рухи та позиції', -5),
      ],
    },
    {
      title: 'Загальне зниження балів · одноразово',
      items: [
        once('repeat', 'Надмірна повторюваність рухів', -2),
        once('apparatus_use', 'Нерівноцінне використання обох пілонів та незаповнення висоти', -2, ['pole']),
        range('costume', 'Проблеми з костюмом та зачіскою', -5), // judged in steps of 0,5 down to -5
      ],
    },
  ],
};
