import React from 'react';
import SeoLandingTemplate from '@/components/SeoLandingTemplate';

const slug = { en: 'passion-fruit-mango-wine', es: 'vino-de-maracuya-y-mango' };

const HERO_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1600/v1779053427/kibay_-vino_copy_q9mvz8.webp';
const CAN_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780013922/Kibay_Espumante_Lata_ocoabay_w2hagj.webp';
const POOL_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp';

const content = {
  en: {
    seoTitle: 'Passion Fruit & Mango Wine from the Dominican Republic — Kibay Sparkling',
    seoDescription:
      'Kibay Sparkling is an sustainable passion fruit and mango wine fermented in the Dominican Republic at the Ocoa Bay vineyard. 250 ml can, 12% ABV — buy online or taste it at the source.',
    seoKeywords:
      'passion fruit and mango wine from dominican republic, dominican passion fruit wine, mango wine, Kibay Sparkling, sustainable Caribbean wine, vino de maracuyá, vino de mango República Dominicana',
    eyebrow: 'Sparkling · Mango & passion fruit',
    title: 'Passion fruit and mango wine, fermented in the Dominican Republic',
    subtitle:
      'Kibay Sparkling is a real wine — fermented from sustainable mango and passion fruit grown beside the Ocoa Bay vineyard. Not a flavored soda. 250 ml can, 12% ABV, made in Azua.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Kibay passion fruit and mango sparkling wine — Dominican Republic',
    ctaPrimary: { label: 'Buy Kibay Sparkling', url: '/product/kibay-sparkling' },
    ctaSecondary: { label: 'Visit the vineyard', url: '/product/ocoa-bay-wine-tour' },
    storyHeading: 'Fermented, not flavored',
    storyParagraphs: [
      'Most fruit wines on the shelf are sugar-water with added flavoring. Kibay Sparkling is the opposite of that — sustainable mangoes and passion fruit (chinola) from the Ocoa Bay estate are fermented the way grapes are fermented, with the natural sugars in the fruit turning into 12% alcohol over weeks. There are no added flavorings, no artificial sweeteners, and no sugar dumped in after the fact.',
      'The result is a dry sparkling wine with the tropical aromatic character of ripe mango and the bright acidity of passion fruit, finished as a 250 ml aluminum can: light-proof, oxygen-proof, perfectly portioned, and ready to chill in minutes.',
      'It pairs with ceviche, fresh seafood, soft and goat cheeses, and Caribbean cuisine. Serve at 8–10°C.',
    ],
    cardsHeading: 'Buy it, or taste it where it\'s made',
    cardsSubheading: 'The can ships across the Dominican Republic; the vineyard pours it on Saturdays and Sundays.',
    cards: [
      {
        kind: 'product',
        kindLabel: 'Sparkling can · 250 ml',
        title: 'Kibay Sparkling',
        body: 'Sustainable sparkling wine fermented with mango and passion fruit. 12% ABV. Single-serve can — beach, pool, picnic, boat friendly.',
        image: CAN_IMG,
        imageAlt: 'Kibay Sparkling 250 ml can — mango and passion fruit wine from Ocoa Bay',
        ctaLabel: 'Order online',
        ctaUrl: '/product/kibay-sparkling',
        schema: { name: 'Ki-BAY Sparkling Can', price: 9, currency: 'USD' },
      },
      {
        kind: 'experience',
        kindLabel: 'On-site · 90 min',
        title: 'Taste it at Ocoa Bay',
        body: 'Walk the same fruit groves the wine is made from, then taste it back-to-back with the rosé, the French Colombard and the tropical bottle. Guided 90-minute session.',
        image: POOL_IMG,
        imageAlt: 'Casa Club at Ocoa Bay — tasting room for Kibay passion fruit and mango wine',
        ctaLabel: 'Reserve a tasting',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
    ],
    ocoaHeading: 'Where the mango and the chinola grow',
    ocoaBody:
      'The mango groves and passion fruit vines that feed Kibay Sparkling sit on the same Ocoa Bay estate as the wine grapes — coastal, sustainable, Caribbean. The fruit is harvested by hand, fermented on-site, and finished in cans at the winery. You can walk the same rows the fruit came from.',
    ocoaCta: 'Visit ocoabay.com',
    faqHeading: 'Passion fruit & mango wine — common questions',
    faqs: [
      {
        q: 'Is Kibay Sparkling really wine, or a flavored cooler?',
        a: 'It\'s wine. The mango and passion fruit are fermented (their natural sugars turning into alcohol) the same way grape wine is made. 12% ABV, no added flavorings, no post-fermentation sugar. It is not a "wine cooler" or a flavored soda.',
      },
      {
        q: 'Where is Kibay made?',
        a: 'At the Ocoa Bay winery in Bahía de Ocoa, Azua, Dominican Republic — a coastal sustainable estate at the same latitude as the rest of the Caribbean. Same land grows the grapes, mango and passion fruit.',
      },
      {
        q: 'What does it taste like?',
        a: 'A dry sparkling wine. Aromas of ripe mango and chinola (passion fruit), bright natural acidity, light to medium body, refreshing finish. Closer to a dry tropical sparkling than to a sweet fruit wine.',
      },
      {
        q: 'Why a can instead of a bottle?',
        a: '250 ml is the perfect single serve, and aluminum is a 100% light + oxygen barrier — better preservation than glass. It chills fast, no corkscrew needed, and it travels (beach, pool, boat, picnic).',
      },
      {
        q: 'How can I buy it?',
        a: 'Order directly at kibay.com.do/product/kibay-sparkling. Standard shipping across the Dominican Republic is RD$250 (1–3 business days), free over RD$5,000. Payment in DOP via CARDNET; international cards welcome.',
      },
    ],
    closingHeading: 'A Dominican wine that actually tastes like the Caribbean',
    closingBody:
      'Order a few cans for the next pool day, or come spend Saturday at the vineyard and taste it where the fruit grows.',
  },
  es: {
    seoTitle: 'Vino de maracuyá y mango de República Dominicana — Kibay Sparkling',
    seoDescription:
      'Kibay Sparkling es un vino sostenible de maracuyá y mango fermentado en República Dominicana, en el viñedo Ocoa Bay. Lata de 250 ml, 12% ABV — cómpralo en línea o catalo en el origen.',
    seoKeywords:
      'vino de maracuyá y mango República Dominicana, vino de chinola, vino de mango, Kibay Sparkling, vino caribeño sostenible, espumante dominicano, vino de fruta dominicano',
    eyebrow: 'Espumante · Mango y maracuyá',
    title: 'Vino de maracuyá y mango, fermentado en República Dominicana',
    subtitle:
      'Kibay Sparkling es vino de verdad — fermentado con mango y maracuyá sostenibles cultivados al lado del viñedo Ocoa Bay. No es un refresco saborizado. Lata de 250 ml, 12% ABV, hecho en Azua.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Kibay vino espumante de maracuyá y mango — República Dominicana',
    ctaPrimary: { label: 'Compra Kibay Sparkling', url: '/product/kibay-sparkling' },
    ctaSecondary: { label: 'Visita el viñedo', url: '/product/ocoa-bay-wine-tour' },
    storyHeading: 'Fermentado, no saborizado',
    storyParagraphs: [
      'La mayoría de los vinos de fruta en el estante son agua con azúcar más esencia. Kibay Sparkling es lo contrario — el mango y la maracuyá (chinola) sostenibles de la finca Ocoa Bay se fermentan igual que se fermenta la uva, con los azúcares naturales de la fruta convirtiéndose en 12% de alcohol durante semanas. No hay esencias añadidas, ni edulcorantes artificiales, ni azúcar agregada después.',
      'El resultado es un espumante seco con el carácter aromático tropical del mango maduro y la acidez brillante de la maracuyá, terminado en una lata de aluminio de 250 ml: a prueba de luz, a prueba de oxígeno, perfectamente porcionado y listo para enfriar en minutos.',
      'Marida con ceviche, mariscos frescos, quesos suaves y de cabra, y cocina caribeña. Sírvelo a 8–10°C.',
    ],
    cardsHeading: 'Cómpralo, o catalo donde se hace',
    cardsSubheading: 'La lata se envía a toda República Dominicana; el viñedo lo sirve los sábados y domingos.',
    cards: [
      {
        kind: 'product',
        kindLabel: 'Lata espumante · 250 ml',
        title: 'Kibay Sparkling',
        body: 'Vino espumante sostenible fermentado con mango y maracuyá. 12% ABV. Lata individual — playa, piscina, picnic, bote.',
        image: CAN_IMG,
        imageAlt: 'Lata Kibay Sparkling 250 ml — vino de mango y maracuyá de Ocoa Bay',
        ctaLabel: 'Pídelo en línea',
        ctaUrl: '/product/kibay-sparkling',
        schema: { name: 'Ki-BAY Sparkling Can', price: 9, currency: 'USD' },
      },
      {
        kind: 'experience',
        kindLabel: 'En sitio · 90 min',
        title: 'Catalo en Ocoa Bay',
        body: 'Camina por los mismos cultivos de fruta de donde sale el vino, y luego catalo junto al rosé, el French Colombard y la botella tropical. Sesión guiada de 90 min.',
        image: POOL_IMG,
        imageAlt: 'Casa Club en Ocoa Bay — sala de cata del vino Kibay de mango y maracuyá',
        ctaLabel: 'Reserva una cata',
        ctaUrl: '/product/ocoa-bay-wine-tour',
        schema: { name: 'Ocoa Bay Wine Tour', price: 65, currency: 'USD' },
      },
    ],
    ocoaHeading: 'Donde crecen el mango y la chinola',
    ocoaBody:
      'Los cultivos de mango y las parras de maracuyá que alimentan Kibay Sparkling están en la misma finca Ocoa Bay que las uvas — costera, sostenible, caribeña. La fruta se cosecha a mano, se fermenta en sitio, y se termina en lata en la bodega. Puedes caminar las mismas hileras de donde salió la fruta.',
    ocoaCta: 'Visita ocoabay.com',
    faqHeading: 'Vino de maracuyá y mango — preguntas comunes',
    faqs: [
      {
        q: '¿Kibay Sparkling es vino de verdad o un cooler con sabor?',
        a: 'Es vino. El mango y la maracuyá se fermentan (sus azúcares naturales se convierten en alcohol) igual que se hace el vino de uva. 12% ABV, sin esencias añadidas, sin azúcar agregada después de la fermentación. No es un "wine cooler" ni un refresco saborizado.',
      },
      {
        q: '¿Dónde se hace Kibay?',
        a: 'En la bodega Ocoa Bay en Bahía de Ocoa, Azua, República Dominicana — una finca sostenible costera a la misma latitud que el resto del Caribe. La misma tierra cultiva las uvas, el mango y la maracuyá.',
      },
      {
        q: '¿A qué sabe?',
        a: 'Un espumante seco. Aromas de mango maduro y chinola, acidez natural brillante, cuerpo ligero a medio, final refrescante. Más cerca de un espumante tropical seco que de un vino dulce de fruta.',
      },
      {
        q: '¿Por qué en lata y no en botella?',
        a: '250 ml es la porción individual perfecta, y el aluminio es una barrera 100% a la luz y al oxígeno — mejor conservación que el vidrio. Enfría rápido, no necesita sacacorchos, y viaja (playa, piscina, bote, picnic).',
      },
      {
        q: '¿Cómo lo compro?',
        a: 'Pídelo directo en kibay.com.do/product/kibay-sparkling. Envío estándar a toda República Dominicana RD$250 (1–3 días hábiles), gratis sobre RD$5,000. Pago en DOP vía CARDNET; tarjetas internacionales bienvenidas.',
      },
    ],
    closingHeading: 'Un vino dominicano que de verdad sabe a Caribe',
    closingBody:
      'Pide unas latas para el próximo día de piscina, o ven un sábado al viñedo y catalo donde crece la fruta.',
  },
};

const PassionFruitMangoWinePage = () => <SeoLandingTemplate slug={slug} content={content} />;

export default PassionFruitMangoWinePage;
