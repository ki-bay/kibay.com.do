import React from 'react';
import SeoLandingTemplate from '@/components/SeoLandingTemplate';

const slug = { en: 'wine-tasting-near-me', es: 'cata-de-vinos-cerca-de-mi' };

const POOL_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1600/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp';
const TASTING_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780013985/Collecion_de_vinos_en_ocoabay_iobvhf.webp';
const TOUR_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011824/fotografo_babula_shots_republica_dominicana_rughqj.webp';

const content = {
  en: {
    seoTitle: 'Wine Tasting Near Me — Ocoa Bay Vineyard, Dominican Republic | Kibay',
    seoDescription:
      'Looking for a wine tasting near you in the Dominican Republic? Ocoa Bay is the Caribbean\'s working vineyard, ~2 hours from Santo Domingo. Reserve a guided tasting, tour and Casa Club day at the source of Kibay.',
    seoKeywords:
      'wine tasting near me, wine tasting Dominican Republic, vineyard tour Caribbean, Ocoa Bay tasting, Kibay tasting, wine tour Santo Domingo, Caribbean winery visit',
    eyebrow: 'Wine tasting · Dominican Republic',
    title: 'Wine tasting near me — at the Caribbean\'s vineyard',
    subtitle:
      'The closest serious wine tasting in the Caribbean is two hours from Santo Domingo, on a coastal vineyard at Bahía de Ocoa. Taste the four Kibay wines at the source, walk the vines, and stay for lunch.',
    heroImage: TASTING_IMG,
    heroImageAlt: 'Kibay wines lined up on a tasting bar at Ocoa Bay, Dominican Republic',
    ctaPrimary: { label: 'Book a tasting & tour', url: '/product/ocoa-bay-wine-tour' },
    ctaSecondary: { label: 'See full-day experience', url: '/product/ocoa-bay-complete-experience' },
    storyHeading: 'A real tasting — not a hotel buffet',
    storyParagraphs: [
      'Most wine tastings near you in the Caribbean are hotel-bar pours of imported European bottles. Ocoa Bay is something else: a working coastal vineyard at 18° latitude, planted with vinifera grapes and tropical fruits, where Kibay\'s rosé, French Colombard, sparkling and tropical wines are made and tasted at the source.',
      'A typical tasting runs 90 minutes — an electric-cart tour of the vines and winery, followed by guided pours of the current vintages with the people who made them. The wines are organic, fermented (never flavored sodas), and bottled within steps of where you taste them.',
      'You are two hours by car from Santo Domingo and well inside reach of a day trip from anywhere on the south coast. Saturdays and Sundays only.',
    ],
    cardsHeading: 'Two ways to taste',
    cardsSubheading: 'The 90-minute tour for a focused tasting, or the full day if you want the pool, the Casa Club kitchen, and a vineyard lunch too.',
    cards: [
      {
        kind: 'experience',
        kindLabel: 'Wine tour · 90 min',
        title: 'Guided tasting + vineyard tour',
        body: 'Walk the vines on an electric cart, taste the current Kibay range with the winemaking team, and step inside the winery itself. Saturdays and Sundays.',
        image: TOUR_IMG,
        imageAlt: 'Vineyard tour at Ocoa Bay — guided wine tasting in the Dominican Republic',
        ctaLabel: 'Reserve the wine tour',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
      {
        kind: 'experience',
        kindLabel: 'Complete day · ~4 hrs',
        title: 'Tasting, tour, Casa Club & 3-course menu',
        body: 'Everything in the wine tour plus a farm-to-table organic lunch at Casa Club, pool access until 6:30 pm and a welcome toast on arrival.',
        image: POOL_IMG,
        imageAlt: 'Casa Club at Ocoa Bay — pool and dining included in the complete wine experience',
        ctaLabel: 'Book the complete experience',
        ctaUrl: '/product/ocoa-bay-complete-experience',
        schema: { name: 'Complete Ocoa Bay Experience', price: 145, currency: 'USD' },
      },
    ],
    ocoaHeading: 'About Ocoa Bay',
    ocoaBody:
      'Ocoa Bay is the working estate behind every Kibay bottle — a coastal organic vineyard in Azua growing vinifera grapes, mango and passion fruit on the same land. Reservations for tastings, tours and Casa Club go through the Ocoa Bay site; product purchases (cans and bottles) happen here on Kibay.',
    ocoaCta: 'Visit ocoabay.com',
    faqHeading: 'Wine tasting at Ocoa Bay — quick answers',
    faqs: [
      {
        q: 'How far is Ocoa Bay from Santo Domingo?',
        a: 'About two hours by car from Santo Domingo via the Autopista 6 de Noviembre south to Azua. The vineyard is at Km 6½ Hatillo, Bahía de Ocoa.',
      },
      {
        q: 'Do I need to book in advance?',
        a: 'Yes. Tastings and Casa Club are by reservation only. Purchase your experience here on Kibay, then confirm the date directly with the Ocoa Bay reservations team.',
      },
      {
        q: 'Which days is the vineyard open for tastings?',
        a: 'Saturdays and Sundays, plus Dominican public holidays. The winery is a working production site during the week.',
      },
      {
        q: 'What\'s the difference between the wine tour and the complete experience?',
        a: 'The wine tour (US$65/person, ~90 min) is the tasting + electric-cart vineyard tour. The complete experience (US$145/person, ~4 hours) adds the Casa Club 3-course organic menu and pool access until 6:30 pm.',
      },
      {
        q: 'Are the Kibay wines organic?',
        a: 'Yes. All Kibay wines are fermented from organically grown Ocoa Bay grapes (rosé, French Colombard) and organic mango and passion fruit (sparkling, tropical). 12% ABV.',
      },
    ],
    closingHeading: 'Pick a weekend, taste at the source',
    closingBody:
      'Both experiences are bookable here on Kibay. Reservation dates and Casa Club details are confirmed by the Ocoa Bay team after purchase.',
  },
  es: {
    seoTitle: 'Cata de vinos cerca de mí — Viñedo Ocoa Bay, República Dominicana | Kibay',
    seoDescription:
      'Busca una cata de vinos cerca de ti en República Dominicana? Ocoa Bay es el viñedo en activo del Caribe, a ~2 horas de Santo Domingo. Reserva una cata guiada, recorrido y día en Casa Club, en el origen de Kibay.',
    seoKeywords:
      'cata de vinos cerca de mí, cata de vinos República Dominicana, tour de viñedo Caribe, cata Ocoa Bay, cata Kibay, tour de vino Santo Domingo, viñedo dominicano',
    eyebrow: 'Cata de vinos · República Dominicana',
    title: 'Cata de vinos cerca de ti — en el viñedo del Caribe',
    subtitle:
      'La cata de vinos más cercana en el Caribe está a dos horas de Santo Domingo, en un viñedo costero en Bahía de Ocoa. Prueba los cuatro vinos Kibay en el origen, camina entre las viñas y quédate a almorzar.',
    heroImage: TASTING_IMG,
    heroImageAlt: 'Vinos Kibay en la barra de cata de Ocoa Bay, República Dominicana',
    ctaPrimary: { label: 'Reserva cata y recorrido', url: '/product/ocoa-bay-wine-tour' },
    ctaSecondary: { label: 'Ver experiencia completa', url: '/product/ocoa-bay-complete-experience' },
    storyHeading: 'Una cata de verdad — no un bufé de hotel',
    storyParagraphs: [
      'La mayoría de las catas "cerca de ti" en el Caribe son copas de bar con vinos europeos importados. Ocoa Bay es otra cosa: un viñedo costero en activo a 18° de latitud, plantado con vinifera y frutas tropicales, donde el rosé, el French Colombard, el espumante y el vino tropical de Kibay se elaboran y se prueban en el origen.',
      'Una cata típica dura 90 minutos: recorrido en carro eléctrico por las viñas y la bodega, seguido de copas guiadas de las cosechas actuales con quienes las hicieron. Los vinos son orgánicos, fermentados (nunca refrescos con sabor), y embotellados a pocos pasos de la barra de cata.',
      'Estás a dos horas en carro desde Santo Domingo y a una excursión de día desde casi cualquier punto de la costa sur. Sábados y domingos solamente.',
    ],
    cardsHeading: 'Dos formas de catar',
    cardsSubheading: 'El recorrido de 90 minutos para una cata enfocada, o el día completo si también quieres la piscina, la cocina de Casa Club y un almuerzo en la viña.',
    cards: [
      {
        kind: 'experience',
        kindLabel: 'Tour de vino · 90 min',
        title: 'Cata guiada + recorrido por el viñedo',
        body: 'Recorre las viñas en carro eléctrico, prueba la gama Kibay con el equipo enológico y entra en la bodega misma. Sábados y domingos.',
        image: TOUR_IMG,
        imageAlt: 'Recorrido por el viñedo en Ocoa Bay — cata guiada de vino en República Dominicana',
        ctaLabel: 'Reserva el tour de vino',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
      {
        kind: 'experience',
        kindLabel: 'Día completo · ~4 hrs',
        title: 'Cata, recorrido, Casa Club y menú de 3 tiempos',
        body: 'Todo lo del wine tour más almuerzo orgánico farm-to-table en Casa Club, acceso a la piscina hasta las 6:30 pm y brindis de bienvenida.',
        image: POOL_IMG,
        imageAlt: 'Casa Club en Ocoa Bay — piscina y almuerzo incluidos en la experiencia completa',
        ctaLabel: 'Reserva la experiencia completa',
        ctaUrl: '/product/ocoa-bay-complete-experience',
        schema: { name: 'Complete Ocoa Bay Experience', price: 145, currency: 'USD' },
      },
    ],
    ocoaHeading: 'Sobre Ocoa Bay',
    ocoaBody:
      'Ocoa Bay es la finca en activo detrás de cada botella de Kibay: un viñedo orgánico costero en Azua que cultiva uvas vinifera, mango y maracuyá en la misma tierra. Las reservas de catas, recorridos y Casa Club se hacen en el sitio de Ocoa Bay; las compras de productos (latas y botellas) suceden aquí en Kibay.',
    ocoaCta: 'Visita ocoabay.com',
    faqHeading: 'Cata en Ocoa Bay — respuestas rápidas',
    faqs: [
      {
        q: '¿A qué distancia está Ocoa Bay de Santo Domingo?',
        a: 'Aproximadamente dos horas en carro desde Santo Domingo por la Autopista 6 de Noviembre hacia Azua. El viñedo está en Km 6½ Hatillo, Bahía de Ocoa.',
      },
      {
        q: '¿Necesito reservar con antelación?',
        a: 'Sí. Catas y Casa Club son solo con reserva. Compra tu experiencia aquí en Kibay; el equipo de Ocoa Bay confirma la fecha directamente contigo.',
      },
      {
        q: '¿Qué días abre el viñedo para catas?',
        a: 'Sábados y domingos, además de feriados dominicanos. Entre semana la bodega opera como planta de producción.',
      },
      {
        q: '¿Cuál es la diferencia entre el tour de vino y la experiencia completa?',
        a: 'El tour de vino (US$65/persona, ~90 min) es la cata + recorrido en carro eléctrico. La experiencia completa (US$145/persona, ~4 horas) suma el menú orgánico de tres tiempos en Casa Club y acceso a la piscina hasta las 6:30 pm.',
      },
      {
        q: '¿Los vinos Kibay son orgánicos?',
        a: 'Sí. Todos los vinos Kibay se fermentan a partir de uvas cultivadas orgánicamente en Ocoa Bay (rosé, French Colombard) y mango y maracuyá orgánicos (espumante, tropical). 12% ABV.',
      },
    ],
    closingHeading: 'Elige un fin de semana, cata en el origen',
    closingBody:
      'Las dos experiencias se reservan aquí en Kibay. Las fechas y los detalles de Casa Club los confirma el equipo de Ocoa Bay tras la compra.',
  },
};

const WineTastingNearMePage = () => <SeoLandingTemplate slug={slug} content={content} />;

export default WineTastingNearMePage;
