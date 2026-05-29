import React from 'react';
import SeoLandingTemplate from '@/components/SeoLandingTemplate';

const slug = { en: 'wine-tasting-dominican-republic', es: 'cata-de-vinos-republica-dominicana' };

const HERO_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1600/v1780011824/fotografo_babula_shots_republica_dominicana_rughqj.webp';
const TASTING_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780013985/Collecion_de_vinos_en_ocoabay_iobvhf.webp';
const SHOP_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1779053427/kibay_-vino_copy_q9mvz8.webp';

const content = {
  en: {
    seoTitle: 'Wine Tasting in the Dominican Republic — Ocoa Bay Vineyard | Kibay',
    seoDescription:
      'Wine tasting in the Dominican Republic happens at Ocoa Bay — the Caribbean\'s working organic vineyard in Azua. Taste Kibay\'s rosé, French Colombard, sparkling and tropical wines at the source, or buy them online for delivery.',
    seoKeywords:
      'wine tasting Dominican Republic, Dominican wine, vino dominicano, cata vino Santo Domingo, Caribbean wine tasting, Ocoa Bay tasting, Kibay tasting',
    eyebrow: 'Wine tasting',
    title: 'Wine tasting in the Dominican Republic',
    subtitle:
      'There\'s exactly one working vineyard in the Caribbean where you can sit down to a real tasting flight — Ocoa Bay in Azua. This is what\'s in the glass, and how to get there.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Aerial view of the Ocoa Bay vineyard — wine tasting in the Dominican Republic',
    ctaPrimary: { label: 'Reserve a vineyard tasting', url: '/product/ocoa-bay-wine-tour' },
    ctaSecondary: { label: 'Shop the wines online', url: '/shop' },
    storyHeading: 'A Dominican tasting flight, explained',
    storyParagraphs: [
      'The Dominican Republic does not have an old wine tradition — and that is the point. Ocoa Bay is a first-generation Caribbean winery, planted at sea level on the south coast where most viticulturists insist vinifera grapes won\'t survive. They do, and the four wines on the Kibay tasting flight prove it.',
      'A standard flight pours Rosé 2026 (dry, light berry profile), French Colombard 2026 (bright, citrusy, high acidity), Kibay Sparkling (organic sparkling fermented with mango and passion fruit, in 250 ml cans) and Kibay Tropical Wine (the 750 ml sparkling). All four are fermented — not flavored sodas — at 12% ABV.',
      'Sittings happen Saturdays and Sundays, 90 minutes per slot, with the winemaking team. Reservations are required; book here on Kibay and Ocoa Bay confirms your date.',
    ],
    cardsHeading: 'Taste here, or bring the tasting home',
    cardsSubheading: 'A vineyard visit is the deepest version; the wines also ship across the Dominican Republic if you want to taste at home first.',
    cards: [
      {
        kind: 'experience',
        kindLabel: 'On-site · Sat & Sun',
        title: 'Guided tasting at Ocoa Bay',
        body: '90-minute flight with the winemaking team — rosé, white, sparkling, tropical — plus an electric-cart tour of the vines and a step inside the winery. US$65/person.',
        image: TASTING_IMG,
        imageAlt: 'Wine tasting flight at Ocoa Bay vineyard, Dominican Republic',
        ctaLabel: 'Reserve the tasting',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
      {
        kind: 'product',
        kindLabel: 'Order online',
        title: 'Build your own tasting at home',
        body: 'All four Kibay wines ship across the Dominican Republic — Rosé, French Colombard, Sparkling can, and the 750 ml tropical bottle. Free shipping over RD$5,000.',
        image: SHOP_IMG,
        imageAlt: 'The Kibay wine lineup — Dominican organic wines available online',
        ctaLabel: 'Shop the lineup',
        ctaUrl: '/shop',
        schema: null,
      },
    ],
    ocoaHeading: 'Where the wines come from',
    ocoaBody:
      'Ocoa Bay is the Caribbean\'s first working vineyard, a coastal organic estate at Bahía de Ocoa, Azua. The same land grows the grapes, the mango and the passion fruit that go into every Kibay bottle. Visits, tastings, the Casa Club restaurant and the pool are all on-site.',
    ocoaCta: 'Visit ocoabay.com',
    faqHeading: 'Wine tasting in the DR — what people ask',
    faqs: [
      {
        q: 'Is there really a vineyard in the Dominican Republic?',
        a: 'Yes. Ocoa Bay in Azua is the Caribbean\'s only working commercial vineyard at this latitude, with organic vinifera grapes (rosé, French Colombard) and tropical fruit fermentation (mango, passion fruit). It is about two hours south of Santo Domingo.',
      },
      {
        q: 'What wines are poured in a Kibay tasting?',
        a: 'Rosé 2026, French Colombard 2026, Kibay Sparkling (passion fruit / mango can) and Kibay Tropical Wine (750 ml sparkling). All organic, all fermented, all 12% ABV.',
      },
      {
        q: 'Can I taste the wines without visiting the vineyard?',
        a: 'Yes — all four bottles and cans ship across the Dominican Republic from kibay.com.do. Standard shipping is RD$250 (1–3 business days), free over RD$5,000.',
      },
      {
        q: 'How much does the on-site tasting cost?',
        a: 'US$65 per person for the 90-minute wine tour + tasting. The full-day Complete Ocoa Bay Experience (tasting + tour + Casa Club lunch + pool) is US$145 per person. Both prices are before 18% ITBIS + 10% by law.',
      },
      {
        q: 'Are the Kibay wines suitable for vegans?',
        a: 'The fermentation process and ingredients (grapes, mango, passion fruit) are plant-based, but Kibay does not currently carry a third-party vegan certification. Email info@kibay.com.do if you need detailed production specs.',
      },
    ],
    closingHeading: 'A real wine tasting, in the Caribbean',
    closingBody:
      'Book a tasting at Ocoa Bay for the full experience, or order the lineup and run your own flight at home. Both routes lead to the same four wines.',
  },
  es: {
    seoTitle: 'Cata de vinos en República Dominicana — Viñedo Ocoa Bay | Kibay',
    seoDescription:
      'La cata de vinos en República Dominicana sucede en Ocoa Bay — el viñedo orgánico en activo del Caribe, en Azua. Prueba el rosé, French Colombard, espumante y vino tropical de Kibay en el origen, o cómpralos en línea para envío a domicilio.',
    seoKeywords:
      'cata de vinos República Dominicana, vino dominicano, cata vino Santo Domingo, vino caribeño, cata Ocoa Bay, cata Kibay, vino Azua',
    eyebrow: 'Cata de vinos',
    title: 'Cata de vinos en República Dominicana',
    subtitle:
      'Hay exactamente un viñedo en activo en el Caribe donde puedes sentarte a una cata de verdad — Ocoa Bay en Azua. Esto es lo que va en la copa, y cómo llegar.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Vista aérea del viñedo Ocoa Bay — cata de vinos en República Dominicana',
    ctaPrimary: { label: 'Reserva una cata en el viñedo', url: '/product/ocoa-bay-wine-tour' },
    ctaSecondary: { label: 'Compra los vinos en línea', url: '/shop' },
    storyHeading: 'Una cata dominicana, explicada',
    storyParagraphs: [
      'República Dominicana no tiene una tradición vitivinícola antigua — y ese es el punto. Ocoa Bay es una bodega caribeña de primera generación, plantada a nivel del mar en la costa sur donde la mayoría de los viticultores insistirían en que la vinifera no sobrevive. Sobrevive, y los cuatro vinos de la cata Kibay lo demuestran.',
      'Una cata estándar incluye Rosé 2026 (seco, perfil ligero de frutos rojos), French Colombard 2026 (brillante, cítrico, alta acidez), Kibay Sparkling (espumante orgánico fermentado con mango y maracuyá, en lata de 250 ml) y Kibay Tropical Wine (el espumante de 750 ml). Los cuatro son fermentados — no refrescos saborizados — a 12% ABV.',
      'Las catas son sábados y domingos, 90 minutos por turno, con el equipo enológico. Requieren reserva; reserva aquí en Kibay y Ocoa Bay confirma tu fecha.',
    ],
    cardsHeading: 'Cata aquí, o lleva la cata a casa',
    cardsSubheading: 'La visita al viñedo es la versión más profunda; los vinos también se envían a toda República Dominicana si quieres catar primero en casa.',
    cards: [
      {
        kind: 'experience',
        kindLabel: 'En sitio · Sáb y Dom',
        title: 'Cata guiada en Ocoa Bay',
        body: 'Cata de 90 minutos con el equipo enológico — rosé, blanco, espumante, tropical — más recorrido en carro eléctrico por las viñas y entrada a la bodega. US$65/persona.',
        image: TASTING_IMG,
        imageAlt: 'Cata de vinos en el viñedo Ocoa Bay, República Dominicana',
        ctaLabel: 'Reserva la cata',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
      {
        kind: 'product',
        kindLabel: 'Compra en línea',
        title: 'Arma tu propia cata en casa',
        body: 'Los cuatro vinos Kibay se envían a toda República Dominicana — Rosé, French Colombard, lata Sparkling y la botella tropical de 750 ml. Envío gratis sobre RD$5,000.',
        image: SHOP_IMG,
        imageAlt: 'La gama Kibay — vinos orgánicos dominicanos disponibles en línea',
        ctaLabel: 'Ver la gama',
        ctaUrl: '/shop',
        schema: null,
      },
    ],
    ocoaHeading: 'De dónde vienen los vinos',
    ocoaBody:
      'Ocoa Bay es el primer viñedo en activo del Caribe, una finca orgánica costera en Bahía de Ocoa, Azua. La misma tierra cultiva las uvas, el mango y la maracuyá que entran en cada botella de Kibay. Visitas, catas, el restaurante Casa Club y la piscina están en sitio.',
    ocoaCta: 'Visita ocoabay.com',
    faqHeading: 'Cata en RD — lo que más se pregunta',
    faqs: [
      {
        q: '¿De verdad hay un viñedo en República Dominicana?',
        a: 'Sí. Ocoa Bay en Azua es el único viñedo comercial en activo del Caribe a esta latitud, con uvas vinifera orgánicas (rosé, French Colombard) y fermentación de fruta tropical (mango, maracuyá). Está a unas dos horas al sur de Santo Domingo.',
      },
      {
        q: '¿Qué vinos se sirven en una cata Kibay?',
        a: 'Rosé 2026, French Colombard 2026, Kibay Sparkling (lata de maracuyá / mango) y Kibay Tropical Wine (espumante de 750 ml). Todos orgánicos, todos fermentados, todos a 12% ABV.',
      },
      {
        q: '¿Puedo catar los vinos sin visitar el viñedo?',
        a: 'Sí — las cuatro botellas y latas se envían a toda República Dominicana desde kibay.com.do. Envío estándar RD$250 (1–3 días hábiles), gratis sobre RD$5,000.',
      },
      {
        q: '¿Cuánto cuesta la cata en sitio?',
        a: 'US$65 por persona el wine tour + cata de 90 minutos. La Experiencia Completa Ocoa Bay (cata + recorrido + almuerzo en Casa Club + piscina) es US$145/persona. Ambos precios antes de 18% ITBIS + 10% de ley.',
      },
      {
        q: '¿Los vinos Kibay son aptos para veganos?',
        a: 'El proceso de fermentación y los ingredientes (uvas, mango, maracuyá) son de origen vegetal, pero Kibay no tiene actualmente certificación vegana de terceros. Escríbenos a info@kibay.com.do si necesitas la ficha técnica detallada.',
      },
    ],
    closingHeading: 'Una cata de verdad, en el Caribe',
    closingBody:
      'Reserva una cata en Ocoa Bay para la experiencia completa, o pide la gama y haz tu propia cata en casa. Ambos caminos llegan a los mismos cuatro vinos.',
  },
};

const WineTastingDRPage = () => <SeoLandingTemplate slug={slug} content={content} />;

export default WineTastingDRPage;
