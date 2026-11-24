import { score, SCALE_HINT } from './items.js';

const general = (entries, mastery) => [
  score('strength', 'Сила'),
  score('flexibility', 'Гнучкість'),
  score('coordination', 'Спритність та координація'),
  score('stands', 'Стійки та баланси'),
  score('fixation', 'Фіксація елементів'),
  score('entries', entries),
  score('mastery', mastery),
];

const tech = (key, title, dynamic, entries, mastery) => ({
  key, title, hint: SCALE_HINT,
  sections: [
    { title: 'Динамічна складність', items: dynamic },
    { title: 'Загальні фізичні критерії', items: general(entries, mastery) },
  ],
});

export const techPole = tech('tech_pole', 'Технічна складність · Pole sport', [
  score('rotation', 'Обертання 360 та 720 та комбінації'),
  score('dynamic', 'Динамічні елементи та їх комбінації'),
  score('jumps', 'Стрибки на пілон та з пілону'),
  score('contact_salto', 'Контактні сальто'),
  score('salto', 'Сальто'),
  score('wheels', 'Колеса та перевороти на пілоні та з пілоном'),
  score('switch', 'Switch'),
  score('drops', 'Зриви'),
  score('cascades', 'Каскади'),
  score('regrips', 'Перехвати'),
], 'Виходи на пілон', 'Рівень володіння пілоном');

export const techHoop = tech('tech_hoop', 'Технічна складність · Aerial hoop', [
  score('rotation', 'Обертання та їх комбінації'),
  score('rolls', 'Роли'),
  score('regrip_body', 'Перехват зі зміною положення тіла та/або кінцівок'),
  score('jumps', 'Стрибки на кільце та з кільця'),
  score('salto_turns', 'Сальто та перевороти'),
  score('dynamic_combo', 'Комбінації динамічних елементів'),
  score('other_dynamic', 'Інші динамічні елементи'),
], 'Виходи на кільце', 'Рівень володіння кільцем');

export const techSilks = tech('tech_silks', 'Технічна складність · Aerial silk', [
  score('regrips', 'Перехвати'),
  score('regrip_body', 'Перехват зі зміною положення тіла відносно полотна'),
  score('drops', 'Зриви'),
  score('salto', 'Сальто'),
  score('cascade_unwraps', 'Каскадні розмоти'),
  score('dynamic_combo', 'Комбінації динамічних елементів'),
  score('turns_wheels', 'Перевороти та колеса'),
  score('wraps', 'Намоти / розмоти'),
  score('rotation', 'Обертання та їх комбінації'),
], 'Виходи на полотно', 'Рівень володіння полотном');
