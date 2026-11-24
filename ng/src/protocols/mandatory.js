import { once } from './items.js';

// Separate protocol, judged by its own panel: five fixed rows, +1 for every counted element.
export const MANDATORY_ELEMENT_COUNT = 5;

export const mandatory = {
  key: 'mandatory',
  title: 'Обовʼязкові елементи',
  hint: '+1 бал за кожен зарахований елемент',
  sections: [{
    title: 'Обовʼязкові елементи',
    items: Array.from({ length: MANDATORY_ELEMENT_COUNT }, (_, i) => (
      { ...once(`element_${i + 1}`, `Елемент ${i + 1}`, 1), choice: true }
    )),
  }],
};
