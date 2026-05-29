import React from 'react';
import SeoLandingTemplate from '@/components/SeoLandingTemplate';

const slug = { en: 'tropical-dominican-wine', es: 'vino-tropical-dominicano' };

const HERO_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1600/v1780011824/fotografo_babula_shots_republica_dominicana_rughqj.webp';
const BOTTLE_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1779053427/kibay_-vino_copy_q9mvz8.webp';
const COLOMBARD_IMG = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780013985/Collecion_de_vinos_en_ocoabay_iobvhf.webp';

const content = {
  en: {
    seoTitle: 'Tropical Dominican White Wine & Sparkling — Kibay from Ocoa Bay',
    seoDescription:
      'Tropical Dominican wine, made for real life in the Caribbean: Kibay\'s 750 ml sparkling and bright French Colombard 2026, fermented at the Ocoa Bay vineyard in Azua. Shop, or taste at the winery.',
    seoKeywords:
      'tropical Dominican white wine and sparkling, Dominican white wine, vino blanco dominicano, vino tropical, Kibay tropical wine, Kibay French Colombard, vino dominicano espumante, Caribbean white wine',
    eyebrow: 'White & sparkling · Caribbean',
    title: 'Tropical Dominican white wine and sparkling',
    subtitle:
      'Two Caribbean-grown wines from the same coastal vineyard: a bright French Colombard 2026 and a 750 ml tropical sparkling. Both fermented at Ocoa Bay, both 12% ABV, both built for the heat.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Ocoa Bay vineyard at sunset — tropical Dominican wine country',
    ctaPrimary: { label: 'Shop the lineup', url: '/shop' },
    ctaSecondary: { label: 'Visit the vineyard', url: '/product/ocoa-bay-wine-tour' },
    storyHeading: 'Wine made for the Caribbean climate',
    storyParagraphs: [
      'Most "tropical wine" outside Latin America is European wine sold beside a beach. Kibay is the other thing: vinifera grapes and tropical fruit grown organically on a Caribbean coastal estate, fermented locally, and built around the way you actually drink wine in 30°C weather — bright, light, cold, refreshing, never heavy.',
      'The two pieces of the lineup that fit the "tropical Dominican white and sparkling" shape are the French Colombard 2026 (a crisp dry white with green apple, citrus and a tropical edge — high acidity that holds up to ceviche and grilled fish) and the Kibay Tropical Wine 750 ml (the signature sparkling that started the brand: mango and passion fruit fermentation, dry, lively, served at table).',
      'Both are made at Ocoa Bay in Azua, about two hours south of Santo Domingo, and both ship across the Dominican Republic.',
    ],
    cardsHeading: 'The white and the sparkling',
    cardsSubheading: 'Two bottles, one terroir. Pick the one for tonight or grab both — they pair across the same Caribbean table.',
    cards: [
      {
        kind: 'product',
        kindLabel: 'Dry white · 750 ml',
        title: 'French Colombard 2026',
        body: 'Bright, citrusy, high acidity. Green apple and pear up front, tropical edge underneath. Pairs with ceviche, grilled fish, soft cheeses. Serve 10–12°C.',
        image: COLOMBARD_IMG,
        imageAlt: 'Kibay French Colombard 2026 — Dominican dry white wine',
        ctaLabel: 'Buy French Colombard',
        ctaUrl: '/product/french-colombard',
        schema: { name: 'French Colombard 2026', price: 28, currency: 'USD' },
      },
      {
        kind: 'product',
        kindLabel: 'Sparkling · 750 ml',
        title: 'Kibay Tropical Wine',
        body: 'The signature 750 ml tropical sparkling — mango and passion fruit fermentation, dry, lively. The bottle that put Kibay on the table. Serve 8–10°C.',
        image: BOTTLE_IMG,
        imageAlt: 'Kibay Tropical Wine 750 ml — sparkling Dominican wine',
        ctaLabel: 'Buy Kibay Wine',
        ctaUrl: '/product/kibay-wine',
        schema: { name: 'Kibay Tropical Wine', price: 28, currency: 'USD' },
      },
    ],
    ocoaHeading: 'About the estate',
    ocoaBody:
      'Ocoa Bay is the Caribbean\'s first working vineyard, a coastal organic estate at Bahía de Ocoa, Azua. Vinifera grapes (French Colombard, rosé, red), mango and passion fruit are all grown on the same land. Same soil, same Atlantic breeze, same harvest team.',
    ocoaCta: 'Visit ocoabay.com',
    faqHeading: 'Tropical Dominican wine — answered',
    faqs: [
      {
        q: 'Can vinifera grapes really grow in the Dominican Republic?',
        a: 'Yes — at Ocoa Bay. The coastal microclimate of Bahía de Ocoa, plus organic farming practices and careful varietal selection, gives the estate genuine vinifera vintages (rosé, French Colombard, red). It is the only working vineyard at this Caribbean latitude.',
      },
      {
        q: 'How is the French Colombard different from the sparkling?',
        a: 'The Colombard is a still dry white — bright, citrusy, high acidity, no bubbles. The Kibay Tropical Wine is a 750 ml sparkling made from mango and passion fruit fermentation — dry but bubbly, tropical aromatic. Different tools for different moments.',
      },
      {
        q: 'What food pairs with these wines?',
        a: 'Caribbean cuisine: ceviche, grilled fish, fried fish, mango/avocado salads, soft cheeses, light asopao. The acidity in the Colombard handles citrus marinades; the sparkling lifts seafood and lighter Caribbean dishes.',
      },
      {
        q: 'Are these wines organic?',
        a: 'Yes. All Kibay wines are fermented from organically grown ingredients at the Ocoa Bay estate. 12% ABV across the lineup.',
      },
      {
        q: 'Where do I buy them?',
        a: 'Directly at kibay.com.do/shop — full lineup, shipped across the Dominican Republic. Or taste them at the source on a guided Ocoa Bay tasting (Saturdays & Sundays).',
      },
    ],
    closingHeading: 'Two ways into the Caribbean wine glass',
    closingBody:
      'Order the white, the sparkling, or both — or come spend a Saturday at the vineyard and taste the full lineup beside the bay.',
  },
  es: {
    seoTitle: 'Vino blanco tropical dominicano y espumante — Kibay de Ocoa Bay',
    seoDescription:
      'Vino tropical dominicano hecho para la vida en el Caribe: el espumante de 750 ml y el French Colombard 2026 de Kibay, fermentados en el viñedo Ocoa Bay en Azua. Compra en línea o cata en la bodega.',
    seoKeywords:
      'vino tropical dominicano, vino blanco dominicano, vino tropical, Kibay vino, Kibay French Colombard, vino dominicano espumante, vino blanco caribeño, espumante de República Dominicana',
    eyebrow: 'Blanco y espumante · Caribe',
    title: 'Vino blanco tropical dominicano y espumante',
    subtitle:
      'Dos vinos cultivados en el Caribe desde el mismo viñedo costero: un French Colombard 2026 brillante y un espumante tropical de 750 ml. Ambos fermentados en Ocoa Bay, ambos 12% ABV, ambos hechos para el calor.',
    heroImage: HERO_IMG,
    heroImageAlt: 'Viñedo Ocoa Bay al atardecer — tierra de vino tropical dominicano',
    ctaPrimary: { label: 'Ver la gama', url: '/shop' },
    ctaSecondary: { label: 'Visita el viñedo', url: '/product/ocoa-bay-wine-tour' },
    storyHeading: 'Vino hecho para el clima caribeño',
    storyParagraphs: [
      'La mayoría del "vino tropical" fuera de Latinoamérica es vino europeo vendido al lado de una playa. Kibay es la otra cosa: uvas vinifera y fruta tropical cultivadas orgánicamente en una finca costera caribeña, fermentadas localmente, y pensadas para cómo realmente se bebe vino a 30°C — brillante, ligero, frío, refrescante, nunca pesado.',
      'Las dos piezas de la gama que encajan con "vino blanco tropical dominicano y espumante" son el French Colombard 2026 (un blanco seco crujiente con manzana verde, cítrico y un toque tropical — acidez alta que aguanta el ceviche y el pescado a la plancha) y el Kibay Tropical Wine de 750 ml (el espumante insignia que arrancó la marca: fermentación de mango y maracuyá, seco, vivo, para servir en la mesa).',
      'Los dos se hacen en Ocoa Bay en Azua, a unas dos horas al sur de Santo Domingo, y los dos se envían a toda República Dominicana.',
    ],
    cardsHeading: 'El blanco y el espumante',
    cardsSubheading: 'Dos botellas, un terroir. Elige la de esta noche o lleva las dos — combinan en la misma mesa caribeña.',
    cards: [
      {
        kind: 'product',
        kindLabel: 'Blanco seco · 750 ml',
        title: 'French Colombard 2026',
        body: 'Brillante, cítrico, acidez alta. Manzana verde y pera al frente, toque tropical de fondo. Marida con ceviche, pescado a la plancha, quesos suaves. Sírvelo a 10–12°C.',
        image: COLOMBARD_IMG,
        imageAlt: 'Kibay French Colombard 2026 — vino blanco seco dominicano',
        ctaLabel: 'Compra French Colombard',
        ctaUrl: '/product/french-colombard',
        schema: { name: 'French Colombard 2026', price: 28, currency: 'USD' },
      },
      {
        kind: 'product',
        kindLabel: 'Espumante · 750 ml',
        title: 'Kibay Tropical Wine',
        body: 'El espumante tropical de 750 ml insignia — fermentación de mango y maracuyá, seco, vivo. La botella que puso a Kibay en la mesa. Sírvelo a 8–10°C.',
        image: BOTTLE_IMG,
        imageAlt: 'Kibay Tropical Wine 750 ml — vino espumante dominicano',
        ctaLabel: 'Compra Kibay Wine',
        ctaUrl: '/product/kibay-wine',
        schema: { name: 'Kibay Tropical Wine', price: 28, currency: 'USD' },
      },
    ],
    ocoaHeading: 'Sobre la finca',
    ocoaBody:
      'Ocoa Bay es el primer viñedo en activo del Caribe, una finca orgánica costera en Bahía de Ocoa, Azua. Las uvas vinifera (French Colombard, rosé, tinto), el mango y la maracuyá se cultivan todos en la misma tierra. Mismo suelo, misma brisa atlántica, mismo equipo de cosecha.',
    ocoaCta: 'Visita ocoabay.com',
    faqHeading: 'Vino tropical dominicano — respuestas',
    faqs: [
      {
        q: '¿De verdad crecen las uvas vinifera en República Dominicana?',
        a: 'Sí — en Ocoa Bay. El microclima costero de Bahía de Ocoa, más prácticas orgánicas y selección varietal cuidadosa, le da a la finca cosechas vinifera genuinas (rosé, French Colombard, tinto). Es el único viñedo en activo a esta latitud caribeña.',
      },
      {
        q: '¿En qué se diferencia el French Colombard del espumante?',
        a: 'El Colombard es un blanco seco tranquilo — brillante, cítrico, acidez alta, sin burbujas. El Kibay Tropical Wine es un espumante de 750 ml hecho con fermentación de mango y maracuyá — seco pero con burbuja, aromático tropical. Herramientas distintas para momentos distintos.',
      },
      {
        q: '¿Qué comida marida con estos vinos?',
        a: 'Cocina caribeña: ceviche, pescado a la plancha, pescado frito, ensaladas de mango/aguacate, quesos suaves, asopao ligero. La acidez del Colombard aguanta marinadas cítricas; el espumante levanta mariscos y platos caribeños más ligeros.',
      },
      {
        q: '¿Estos vinos son orgánicos?',
        a: 'Sí. Todos los vinos Kibay se fermentan con ingredientes cultivados orgánicamente en la finca Ocoa Bay. 12% ABV en toda la gama.',
      },
      {
        q: '¿Dónde los compro?',
        a: 'Directo en kibay.com.do/shop — gama completa, enviada a toda República Dominicana. O catalos en el origen en una cata guiada de Ocoa Bay (sábados y domingos).',
      },
    ],
    closingHeading: 'Dos formas de entrar al vino caribeño',
    closingBody:
      'Pide el blanco, el espumante, o los dos — o ven un sábado al viñedo y cata la gama completa al lado de la bahía.',
  },
};

const TropicalDominicanWinePage = () => <SeoLandingTemplate slug={slug} content={content} />;

export default TropicalDominicanWinePage;
