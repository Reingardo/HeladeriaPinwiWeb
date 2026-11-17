import { mountShop } from './shop.js';

let experience;
const shop = mountShop({
  onFamilyOpen: index => experience?.goToFamily(index),
  onInteraction: () => experience?.interact(),
});
document.querySelector('#explore').addEventListener('click', () => {
  if (!experience) shop.openFamily(0);
});

// Commerce is ready before downloading the optional animation module and Three.
if (new URLSearchParams(location.search).get('view') === 'simple') {
  document.body.classList.add('entered', 'simple-view');
  const versionLink = document.querySelector('.footer-links a[href="?view=simple#menu"]');
  versionLink.href = './#menu';
  versionLink.textContent = 'Versión animada ↗';
} else import('./experience.js').then(({ startExperience }) => {
  experience = startExperience({ openFamily: shop.openFamily, tickPackages: shop.tickPackages });
}).catch(error => {
  console.warn('La tienda está lista; la vista animada no está disponible.', error);
  document.body.classList.remove('locked', 'experience-ready');
  document.body.classList.add('entered');
  document.querySelector('#intro').hidden = true;
});
