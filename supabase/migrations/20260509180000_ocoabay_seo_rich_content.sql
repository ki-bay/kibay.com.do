-- SEO-rich content for the two Ocoa Bay experience products.
-- Long-form bilingual descriptions + 9 FAQ rows per product (rendered as
-- additional_info on the PDP and emitted as FAQPage JSON-LD by SchemaMarkup).
--
-- Idempotent: re-running this just refreshes the description text and clears
-- and re-inserts the additional_info rows.

-- ---------------------------------------------------------------------------
-- Wine Tour: rich description
-- ---------------------------------------------------------------------------
UPDATE public.products
SET
  description_es = $$
<p>El <strong>Tour de Vino Ocoa Bay</strong> es la forma más directa de entender qué hace especial al <strong>vino dominicano</strong> producido en el Caribe. Durante 90 minutos te llevamos por uno de los pocos viñedos en producción del Caribe — una finca costera en la <strong>República Dominicana</strong> donde la uva, el mango y la maracuyá maduran bajo el mismo sol del Atlántico.</p>

<h2>Qué incluye el tour</h2>
<ul>
  <li><strong>Cata guiada</strong> de los Ocoa Wines y otros productos orgánicos del proyecto.</li>
  <li><strong>Recorrido en carro eléctrico</strong> por las instalaciones, con visita a los viñedos y la bodega.</li>
  <li>Explicación del proceso de elaboración del <strong>vino caribeño</strong>, desde la cosecha hasta la botella.</li>
  <li>Vistas privilegiadas de la <strong>Bahía de Ocoa</strong> desde la finca.</li>
</ul>

<h2>Por qué hacer el tour</h2>
<p>Hacer vino en el trópico no es lo habitual — y por eso este tour vale la pena. La altitud de Ocoa Bay, los suelos volcánicos y el viento del mar producen <strong>vinos dominicanos</strong> con una identidad propia. En el tour vas a entender por qué el Caribe puede tener su propia tradición vitivinícola, distinta de Europa, distinta también de California.</p>

<p>La cata incluye los blancos y rosados de Ocoa Wines, junto con el espumante orgánico Kibay elaborado con frutas tropicales. Al final, sales con una idea clara de qué es el <strong>vino caribeño</strong> — y probablemente con una botella o dos para llevar a casa.</p>

<h2>Información práctica</h2>
<ul>
  <li><strong>Duración:</strong> 90 minutos.</li>
  <li><strong>Días disponibles:</strong> sábados y domingos (cerrados entre semana excepto festivos).</li>
  <li><strong>Ubicación:</strong> Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, República Dominicana.</li>
  <li><strong>Distancia:</strong> aproximadamente 2 horas en carro desde Santo Domingo.</li>
  <li><strong>Idiomas:</strong> español e inglés.</li>
  <li><strong>Precio:</strong> US$65 por persona (más impuestos: 18% ITBIS + 10% por ley).</li>
</ul>

<h2>Después de comprar</h2>
<p>Al completar la compra recibirás un correo de confirmación. Para fijar la fecha de tu visita, coordina directamente con el equipo de reservaciones de Ocoa Bay a través de <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a> o escribiendo a info@kibay.com.do.</p>
$$,

  description_en = $$
<p>The <strong>Ocoa Bay Wine Tour</strong> is the most direct way to understand what makes <strong>Dominican wine</strong> from the Caribbean its own thing. Over 90 minutes we take you through one of the few working vineyards in the Caribbean — a coastal estate in the <strong>Dominican Republic</strong> where wine grapes, mango and passion fruit ripen under the same Atlantic sun.</p>

<h2>What's included</h2>
<ul>
  <li><strong>Guided tasting</strong> of Ocoa Wines and the estate's other organic products.</li>
  <li><strong>Electric-cart tour</strong> of the property, with stops at the vineyards and winery.</li>
  <li>Walk-through of how <strong>Caribbean wine</strong> is made, from harvest to bottle.</li>
  <li>Open views of the <strong>Bay of Ocoa</strong> from the estate.</li>
</ul>

<h2>Why take this tour</h2>
<p>Making wine in the tropics is unusual — which is exactly why this tour is worth it. Ocoa Bay's elevation, volcanic soils and sea breeze produce <strong>Dominican wines</strong> with their own identity. By the end of the tour you'll understand why the Caribbean can carry its own winemaking tradition — distinct from Europe, distinct from California.</p>

<p>The tasting covers Ocoa Wines whites and rosés alongside Kibay's organic sparkling wine made from tropical fruit. You'll leave with a clear sense of what <strong>Caribbean wine</strong> actually is — and probably a bottle or two to take home.</p>

<h2>Practical details</h2>
<ul>
  <li><strong>Duration:</strong> 90 minutes.</li>
  <li><strong>Available days:</strong> Saturdays and Sundays (closed weekdays except holidays).</li>
  <li><strong>Location:</strong> Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, Dominican Republic.</li>
  <li><strong>Drive time:</strong> roughly 2 hours from Santo Domingo.</li>
  <li><strong>Languages:</strong> Spanish and English.</li>
  <li><strong>Price:</strong> US$65 per person (plus 18% ITBIS + 10% by law).</li>
</ul>

<h2>After you buy</h2>
<p>You'll get a confirmation email immediately. To pick your visit date, coordinate directly with the Ocoa Bay reservations team at <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a> or info@kibay.com.do.</p>
$$,
  updated_at = now()
WHERE slug = 'ocoa-bay-wine-tour';

-- ---------------------------------------------------------------------------
-- Complete Experience: rich description
-- ---------------------------------------------------------------------------
UPDATE public.products
SET
  description_es = $$
<p>La <strong>Experiencia Completa Ocoa Bay</strong> es el día completo en el viñedo más interesante del Caribe — cata, tour, almuerzo orgánico y piscina con vista al mar. Una jornada pensada para que vivas la <strong>cultura del vino dominicano</strong> sin prisa, en el lugar donde se hace.</p>

<h2>Qué incluye la experiencia completa</h2>
<ul>
  <li><strong>Cata guiada</strong> de Ocoa Wines y otros productos orgánicos del proyecto.</li>
  <li><strong>Recorrido en carro eléctrico</strong> por las instalaciones, con visita a los viñedos y la bodega.</li>
  <li><strong>Brindis de bienvenida</strong> en la <strong>Casa Club</strong>.</li>
  <li><strong>Menú de cocina orgánica de 3 tiempos</strong> (a elegir por persona) — cocina de la granja a la mesa.</li>
  <li><strong>Acceso a la piscina y las instalaciones de la Casa Club</strong> desde las 11:00 AM hasta las 6:30 PM.</li>
  <li>Vista directa de la <strong>Bahía de Ocoa</strong> durante todo el día.</li>
</ul>

<h2>Cómo es el día</h2>
<p>Llegas en la mañana, brindas en la Casa Club con vista al mar, haces la cata y el tour por los viñedos, almuerzas con un menú de tres tiempos hecho con productos de la finca, y cierras la tarde en la piscina. Es la versión más completa de visitar un <strong>viñedo en el Caribe</strong> — y probablemente la única en la <strong>República Dominicana</strong>.</p>

<p>El proyecto Ocoa Bay es agricultura sostenible: uvas para vino, mango y maracuyá para Kibay Espumante, y todo lo demás para la cocina de la Casa Club. La comida que sale del menú es la misma comida que se cosecha a 200 metros del comedor.</p>

<h2>Información práctica</h2>
<ul>
  <li><strong>Duración:</strong> de 11:00 AM a 6:30 PM (día completo).</li>
  <li><strong>Días disponibles:</strong> sábados y domingos (cerrados entre semana excepto festivos).</li>
  <li><strong>Ubicación:</strong> Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, República Dominicana.</li>
  <li><strong>Distancia:</strong> aproximadamente 2 horas en carro desde Santo Domingo.</li>
  <li><strong>Precio:</strong> US$145 por persona (más impuestos: 18% ITBIS + 10% por ley).</li>
  <li><strong>Recomendado traer:</strong> traje de baño, toalla, protector solar.</li>
</ul>

<h2>Reservar fecha</h2>
<p>Después de tu compra recibirás un correo de confirmación. Para coordinar la fecha de tu visita y elegir el menú, contáctanos en info@kibay.com.do o reserva directamente en <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a>.</p>
$$,

  description_en = $$
<p>The <strong>Complete Ocoa Bay Experience</strong> is a full day at the Caribbean's most interesting working vineyard — tasting, tour, organic lunch and a pool that looks out at the bay. It's built for living the <strong>Dominican wine culture</strong> slowly, where it's actually made.</p>

<h2>What the complete experience includes</h2>
<ul>
  <li><strong>Guided tasting</strong> of Ocoa Wines and the estate's other organic products.</li>
  <li><strong>Electric-cart tour</strong> of the property, with stops at the vineyards and winery.</li>
  <li><strong>Welcome toast</strong> at the <strong>Casa Club</strong>.</li>
  <li><strong>Three-course farm-to-table organic menu</strong> (your choice per guest).</li>
  <li><strong>Pool and Casa Club access</strong> from 11:00 AM to 6:30 PM.</li>
  <li>Direct view of the <strong>Bay of Ocoa</strong> throughout the day.</li>
</ul>

<h2>How the day flows</h2>
<p>You arrive mid-morning, toast at the Casa Club with the sea in view, walk through the vineyards on the electric-cart tour, sit down to a three-course lunch built from the farm, and close out the afternoon at the pool. It's the most complete way to visit a <strong>Caribbean vineyard</strong> — and probably the only one of its kind in the <strong>Dominican Republic</strong>.</p>

<p>The Ocoa Bay project is sustainable agriculture: wine grapes, mango and passion fruit for Kibay Espumante, and everything else for the Casa Club kitchen. The food on the menu is the same food being harvested 200 metres from the table.</p>

<h2>Practical details</h2>
<ul>
  <li><strong>Duration:</strong> 11:00 AM to 6:30 PM (full day).</li>
  <li><strong>Available days:</strong> Saturdays and Sundays (closed weekdays except holidays).</li>
  <li><strong>Location:</strong> Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, Dominican Republic.</li>
  <li><strong>Drive time:</strong> roughly 2 hours from Santo Domingo.</li>
  <li><strong>Price:</strong> US$145 per person (plus 18% ITBIS + 10% by law).</li>
  <li><strong>Bring:</strong> swimwear, towel, sunscreen.</li>
</ul>

<h2>Reserving your date</h2>
<p>After purchase you'll get a confirmation email. To pick your visit date and your menu choices, reach us at info@kibay.com.do or reserve directly at <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a>.</p>
$$,
  updated_at = now()
WHERE slug = 'ocoa-bay-complete-experience';

-- ---------------------------------------------------------------------------
-- FAQ rows (rendered on the PDP + emitted as FAQPage JSON-LD).
-- Wipe + re-insert so this migration is idempotent on re-apply.
-- ---------------------------------------------------------------------------
DELETE FROM public.product_additional_info
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN ('ocoa-bay-wine-tour', 'ocoa-bay-complete-experience')
);

-- Wine Tour FAQ
INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué incluye exactamente el tour?',
  'What exactly is included in the tour?',
  '<p>Cata guiada de Ocoa Wines y productos orgánicos del proyecto, recorrido en carro eléctrico por viñedos y bodega, y explicación del proceso de elaboración del vino caribeño. Duración total: 90 minutos.</p>',
  '<p>A guided tasting of Ocoa Wines and the estate''s organic products, an electric-cart tour of the vineyards and winery, and a walk-through of how Caribbean wine is made. Total duration: 90 minutes.</p>',
  1
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Cómo llego a Ocoa Bay desde Santo Domingo?',
  'How do I get to Ocoa Bay from Santo Domingo?',
  '<p>Aproximadamente 2 horas en carro desde Santo Domingo. La dirección es Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, República Dominicana. Recomendamos llegar 15 minutos antes de la hora reservada.</p>',
  '<p>Roughly a 2-hour drive from Santo Domingo. The address is Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, Dominican Republic. We recommend arriving 15 minutes before your reserved time.</p>',
  2
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué días está abierto?',
  'What days is it open?',
  '<p>Sábados y domingos. Cerrado entre semana excepto en días festivos. Confirma la fecha de tu visita por <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a>.</p>',
  '<p>Saturdays and Sundays. Closed weekdays except on holidays. Confirm your visit date at <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">ocoabay.com/reservacion</a>.</p>',
  3
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué debo vestir?',
  'What should I wear?',
  '<p>Ropa cómoda y zapatos cerrados o sandalias firmes — vas a caminar en el viñedo. Es el Caribe, así que un sombrero o gorra y protector solar son recomendables.</p>',
  '<p>Comfortable clothes and closed shoes or sturdy sandals — you''ll be walking through the vineyard. It''s the Caribbean, so a hat and sunscreen are a good idea.</p>',
  4
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿En qué idiomas se ofrece el tour?',
  'What languages is the tour offered in?',
  '<p>Español e inglés. Si necesitas otro idioma, escríbenos a info@kibay.com.do antes de reservar.</p>',
  '<p>Spanish and English. If you need another language, email info@kibay.com.do before booking.</p>',
  5
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Pueden ir niños?',
  'Can kids come?',
  '<p>Sí. Los niños no participan en la cata pero son bienvenidos en el recorrido. No se cobra el tour para menores de 12 años.</p>',
  '<p>Yes. Kids don''t take part in the tasting but are welcome on the tour. The tour is free for children under 12.</p>',
  6
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué pasa si llueve?',
  'What if it rains?',
  '<p>Reagendamos para otra fecha sin costo adicional. Avísanos al menos 24 horas antes si necesitas cambiar la fecha.</p>',
  '<p>We reschedule for another date at no extra cost. Let us know at least 24 hours ahead if you need to change the date.</p>',
  7
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Puedo comprar vino para llevar?',
  'Can I buy wine to take home?',
  '<p>Sí. Los Ocoa Wines y el espumante orgánico Kibay están disponibles para comprar al final del tour. También puedes pedirlos en línea en kibay.com.do.</p>',
  '<p>Yes. Ocoa Wines and Kibay organic sparkling wine are available to buy at the end of the tour. You can also order them online at kibay.com.do.</p>',
  8
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Cuál es la política de cancelación?',
  'What''s the cancellation policy?',
  '<p>Cancelaciones con 48 horas o más de anticipación reciben reembolso completo. Para cancelaciones más cercanas a la fecha, escríbenos a info@kibay.com.do.</p>',
  '<p>Cancellations 48+ hours ahead get a full refund. For closer cancellations, email info@kibay.com.do.</p>',
  9
FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

-- Complete Experience FAQ
INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué incluye la experiencia completa?',
  'What does the complete experience include?',
  '<p>Cata guiada, tour en carro eléctrico por el viñedo y la bodega, brindis de bienvenida en la Casa Club, menú orgánico de 3 tiempos a elegir por persona, y acceso a la piscina e instalaciones de la Casa Club desde las 11:00 AM hasta las 6:30 PM.</p>',
  '<p>Guided tasting, electric-cart tour of the vineyard and winery, welcome toast at Casa Club, three-course organic menu (your choice per guest), and pool + Casa Club access from 11:00 AM to 6:30 PM.</p>',
  1
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Cómo es el menú de la Casa Club?',
  'What''s the Casa Club menu like?',
  '<p>Cocina orgánica de la granja a la mesa, con productos cosechados en la finca de Ocoa Bay. Tres tiempos a elegir por persona — entrada, plato fuerte y postre. Las opciones varían por temporada según la disponibilidad de productos.</p>',
  '<p>Farm-to-table organic cuisine, built from produce grown on the Ocoa Bay estate. Three courses per guest — starter, main and dessert. Options change by season based on what''s available.</p>',
  2
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Tienen opciones vegetarianas, veganas o sin gluten?',
  'Do you have vegetarian, vegan, or gluten-free options?',
  '<p>Sí. Avísanos de cualquier restricción alimentaria al confirmar tu reservación con la Casa Club y ajustamos el menú.</p>',
  '<p>Yes. Let us know about any dietary restrictions when you confirm your reservation with Casa Club and we''ll adjust the menu.</p>',
  3
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Hay traslado desde Santo Domingo?',
  'Is there transport from Santo Domingo?',
  '<p>No incluido en este paquete, pero podemos coordinar traslado privado bajo solicitud. Escríbenos a info@kibay.com.do para una cotización. La distancia es de aproximadamente 2 horas en carro.</p>',
  '<p>Not included in this package, but private transport can be arranged on request. Email info@kibay.com.do for a quote. The drive is roughly 2 hours.</p>',
  4
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Hasta qué hora puedo usar la piscina?',
  'How late can I use the pool?',
  '<p>El acceso a la piscina y las instalaciones de la Casa Club está disponible desde las 11:00 AM hasta las 6:30 PM, el horario completo del día.</p>',
  '<p>Pool and Casa Club access runs from 11:00 AM to 6:30 PM — the full day.</p>',
  5
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué debo traer?',
  'What should I bring?',
  '<p>Traje de baño, toalla, protector solar y zapatos cómodos para el tour. Habrá vestidores disponibles. La Casa Club tiene aire acondicionado en las áreas interiores.</p>',
  '<p>Swimwear, towel, sunscreen, and comfortable shoes for the tour. Changing rooms are available. The Casa Club interior is air-conditioned.</p>',
  6
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Es buena para grupos o eventos privados?',
  'Is this good for groups or private events?',
  '<p>Sí — la experiencia completa es perfecta para celebraciones, despedidas, retiros corporativos o aniversarios. Para grupos de más de 8 personas, escríbenos a info@kibay.com.do o llama al +1 (849) 876-6563 para cotización personalizada.</p>',
  '<p>Yes — the complete experience is great for celebrations, bachelorettes, corporate offsites or anniversaries. For groups over 8, email info@kibay.com.do or call +1 (849) 876-6563 for a custom quote.</p>',
  7
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Qué pasa si llueve?',
  'What if it rains?',
  '<p>El tour se realiza igual cuando es posible — las áreas de la bodega y de la cata están protegidas. Si el clima impide el recorrido por los viñedos, reagendamos sin costo o ajustamos la experiencia para mantener la cata y el almuerzo.</p>',
  '<p>The tour still happens when possible — the winery and tasting areas are covered. If the weather makes the vineyard walk unsafe, we either reschedule at no cost or keep the tasting and lunch portions of the day.</p>',
  8
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order)
SELECT id,
  '¿Cuál es la política de cancelación?',
  'What''s the cancellation policy?',
  '<p>Cancelaciones con 48 horas o más de anticipación reciben reembolso completo. Para cancelaciones más cercanas a la fecha, escríbenos a info@kibay.com.do.</p>',
  '<p>Cancellations 48+ hours ahead get a full refund. For closer cancellations, email info@kibay.com.do.</p>',
  9
FROM public.products WHERE slug = 'ocoa-bay-complete-experience';
