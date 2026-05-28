-- Long-form SEO upgrade for /product/kibay-wine.
-- Targets the "vino dominicano" / "Dominican wine" keyword, links to the
-- Ocoa Bay vineyard (the actual producer), and seeds the product_additional_info
-- table with FAQs that drive both visible content and FAQPage JSON-LD on the page.
--
-- Idempotent: ON CONFLICT DO UPDATE for FAQs, deterministic UPDATE on the product.

DO $$
DECLARE
  v_product_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE slug = 'kibay-wine';
  IF v_product_id IS NULL THEN
    RAISE NOTICE 'kibay-wine product not found, skipping migration';
    RETURN;
  END IF;

  ------------------------------------------------------------------------
  -- 1. Expanded SEO descriptions + metadata SEO overrides
  ------------------------------------------------------------------------
  UPDATE public.products
  SET
    description_es = $ES$
<p><strong>Kibay</strong> es el <strong>vino dominicano</strong> tropical nacido en <a href="https://ocoabay.com" rel="noopener" target="_blank">Bahía de Ocoa</a>, uno de los pocos viñedos en funcionamiento del Caribe. Es un vino elaborado por fermentación a partir de mango y chinola cultivados de forma orgánica en la misma finca costera de Azua, República Dominicana.</p>

<p>Esto <strong>no</strong> es una bebida saborizada ni un cóctel. Es <strong>vino</strong> —fermentado, embotellado y madurado bajo licencia DGII VINO-022— moldeado por el sol del Caribe, la brisa atlántica y la mano de los enólogos de Ocoa Bay. Cada botella de Kibay traduce el carácter del trópico dominicano a la mesa: vibrante, cálido y naturalmente expresivo.</p>

<h3>Vino dominicano hecho en Bahía de Ocoa</h3>
<p>El viñedo de <a href="https://ocoabay.com" rel="noopener" target="_blank">Ocoa Bay</a> se encuentra a unas dos horas de Santo Domingo, sobre las colinas que miran al mar Caribe. Allí, la misma tierra que cultiva las uvas de los Ocoa Wines también cultiva el mango y la chinola que fermentamos para hacer Kibay. Es un terroir único en el continente: salado, soleado, orgánico, y completamente dominicano.</p>

<h3>Orgánico, vegano y bajo en alcohol</h3>
<p>Kibay es un vino orgánico con 8% de alcohol, sin colorantes ni aromas artificiales, apto para dietas veganas. Se sirve frío (entre 8 y 10°C) y combina especialmente bien con ceviche, mariscos frescos, quesos suaves de cabra y ensaladas tropicales con mango y aguacate.</p>

<h3>Compra directa al productor en República Dominicana</h3>
<p>Cuando compras Kibay en kibay.com.do, ordenas directamente al productor en la República Dominicana. Para visitar el viñedo, reservar una cata o conocer en persona el origen de tu botella, agenda una experiencia en <a href="https://ocoabay.com" rel="noopener" target="_blank">ocoabay.com</a>.</p>
$ES$,
    description_en = $EN$
<p><strong>Kibay</strong> is the tropical <strong>Dominican wine</strong> born at <a href="https://ocoabay.com" rel="noopener" target="_blank">Bahía de Ocoa</a>, one of the few working vineyards in the Caribbean. It is a real wine, made through fermentation from organically grown mango and passion fruit harvested on the same coastal estate in Azua, Dominican Republic.</p>

<p>This is <strong>not</strong> a flavored beverage or a cocktail. This is <strong>wine</strong> — fermented, bottled and aged under DGII license VINO-022 — shaped by Caribbean sun, the Atlantic breeze, and the hand of the Ocoa Bay winemakers. Every bottle of Kibay translates the character of the Dominican tropics into your glass: vibrant, warm, and naturally expressive.</p>

<h3>Dominican wine made in Bahía de Ocoa</h3>
<p>The <a href="https://ocoabay.com" rel="noopener" target="_blank">Ocoa Bay</a> vineyard sits about two hours from Santo Domingo on hills overlooking the Caribbean Sea. The same land that grows the grapes for the Ocoa Wines also grows the mango and passion fruit we ferment to make Kibay. It's a terroir unlike anywhere else: salty, sun-soaked, organic, and fully Dominican.</p>

<h3>Organic, vegan, and low in alcohol</h3>
<p>Kibay is an organic wine at 8% ABV, with no artificial colors or flavors, and is vegan-friendly. Serve chilled (8–10°C). It pairs especially well with ceviche, fresh seafood, soft goat cheese, and tropical mango-and-avocado salads.</p>

<h3>Order directly from the producer in the Dominican Republic</h3>
<p>When you buy Kibay at kibay.com.do you order straight from the producer in the Dominican Republic. To visit the vineyard, book a tasting, or experience the origin of your bottle in person, plan a day at <a href="https://ocoabay.com" rel="noopener" target="_blank">ocoabay.com</a>.</p>
$EN$,
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(metadata, '{seo_title_es}', to_jsonb('Vino Dominicano | Kibay — Vino Tropical de Bahía de Ocoa'::text)),
              '{seo_title_en}', to_jsonb('Dominican Wine | Kibay — Tropical Wine from Bahía de Ocoa'::text)
            ),
            '{seo_description_es}',
            to_jsonb('Kibay es el vino dominicano tropical hecho en Bahía de Ocoa: mango y chinola fermentados, orgánico, 8% ABV. Compra directo al productor en RD.'::text)
          ),
          '{seo_description_en}',
          to_jsonb('Kibay is the tropical Dominican wine made at Bahía de Ocoa: fermented mango and passion fruit, organic, 8% ABV. Order direct from the producer in the DR.'::text)
        ),
        '{seo_keywords_es}',
        to_jsonb('vino dominicano, vino tropical, Kibay, Ocoa Bay, vino de mango, vino de chinola, vino orgánico República Dominicana, vino caribeño, vino Azua, comprar vino dominicano'::text)
      ),
      '{seo_keywords_en}',
      to_jsonb('Dominican wine, tropical wine, Kibay, Ocoa Bay, mango wine, passion fruit wine, organic wine Dominican Republic, Caribbean wine, Azua wine, buy Dominican wine'::text)
    ),
    updated_at = now()
  WHERE id = v_product_id;

  ------------------------------------------------------------------------
  -- 2. FAQs — drive page accordion + FAQPage JSON-LD
  ------------------------------------------------------------------------
  -- Remove any prior auto-seeded FAQ rows for this product so re-runs are clean.
  DELETE FROM public.product_additional_info
  WHERE product_id = v_product_id
    AND (title_es LIKE '¿%' OR title_en LIKE 'What%' OR title_en LIKE 'Is %' OR title_en LIKE 'How%' OR title_en LIKE 'Where%' OR title_en LIKE 'Can %' OR title_en LIKE 'Does%' OR title_en LIKE 'Do %');

  INSERT INTO public.product_additional_info (product_id, title_es, title_en, description_es, description_en, sort_order) VALUES
  (v_product_id,
   '¿Qué es exactamente Kibay Vino Tropical?',
   'What exactly is Kibay Tropical Wine?',
   '<p>Kibay es un <strong>vino dominicano</strong> elaborado por fermentación natural de mango y chinola (fruta de la pasión) cultivados de forma orgánica en Bahía de Ocoa, Azua. Es vino —no una bebida saborizada— con 8% de alcohol, embotellado en vidrio de 750 ml y producido bajo la licencia DGII VINO-022.</p>',
   '<p>Kibay is a <strong>Dominican wine</strong> made through natural fermentation of organically grown mango and passion fruit from Bahía de Ocoa, Azua. It is wine — not a flavored beverage — at 8% ABV, bottled in 750ml glass and produced under DGII license VINO-022.</p>',
   10),

  (v_product_id,
   '¿Kibay es un vino dominicano de verdad o una bebida saborizada?',
   'Is Kibay a real Dominican wine or a flavored beverage?',
   '<p>Es vino de verdad. Se elabora por fermentación a partir de fruta fresca en la bodega de Ocoa Bay, no por mezcla de aromas con alcohol. Está respaldado por la <strong>Licencia de Fabricación de Vinos VINO-022</strong> emitida por la Dirección General de Impuestos Internos (DGII) de la República Dominicana.</p>',
   '<p>It is real wine. It is made through fermentation of fresh fruit at the Ocoa Bay winery — not by mixing flavors into alcohol. It is backed by the <strong>Wine Manufacturing License VINO-022</strong> issued by the Dominican Republic''s tax authority (DGII).</p>',
   20),

  (v_product_id,
   '¿Dónde se produce Kibay?',
   'Where is Kibay produced?',
   '<p>Kibay se produce en <strong>Bahía de Ocoa, Azua, República Dominicana</strong>, en el viñedo de <a href="https://ocoabay.com" rel="noopener" target="_blank">Ocoa Bay</a> — uno de los pocos viñedos en funcionamiento del Caribe. La misma finca orgánica que produce las uvas para los Ocoa Wines también cultiva el mango y la chinola que fermentamos para hacer Kibay. Está a unas dos horas en carro desde Santo Domingo.</p>',
   '<p>Kibay is produced at <strong>Bahía de Ocoa, Azua, Dominican Republic</strong>, at the <a href="https://ocoabay.com" rel="noopener" target="_blank">Ocoa Bay</a> vineyard — one of the few working vineyards in the Caribbean. The same organic estate that produces the grapes for Ocoa Wines also grows the mango and passion fruit we ferment to make Kibay. It is roughly a two-hour drive from Santo Domingo.</p>',
   30),

  (v_product_id,
   '¿Cómo y a qué temperatura se sirve Kibay?',
   'How and at what temperature should Kibay be served?',
   '<p>Sirve Kibay <strong>frío, entre 8 y 10°C</strong>, en copa de vino blanco. No requiere decantación. Mantén la botella en la nevera unas 2 horas antes de abrir, o 20 minutos en un cubo con hielo y agua.</p>',
   '<p>Serve Kibay <strong>chilled, at 8–10°C (46–50°F)</strong>, in a white-wine glass. No decanting required. Refrigerate the bottle for about 2 hours before opening, or 20 minutes in an ice-and-water bucket.</p>',
   40),

  (v_product_id,
   '¿Con qué comida marida bien Kibay?',
   'What food pairs well with Kibay?',
   '<p>Por su acidez tropical y sus notas a mango y chinola, Kibay marida especialmente bien con:</p><ul><li><strong>Ceviche y mariscos frescos</strong> — la acidez del vino realza el cítrico y limpia el paladar.</li><li><strong>Quesos suaves y de cabra</strong> — la fruta contrasta con la cremosidad.</li><li><strong>Ensaladas tropicales</strong> con mango, aguacate y vinagreta cítrica.</li><li>Pescado a la plancha, sushi, y platos asiáticos suavemente picantes.</li></ul>',
   '<p>Thanks to its tropical acidity and notes of mango and passion fruit, Kibay pairs especially well with:</p><ul><li><strong>Ceviche and fresh seafood</strong> — the wine''s acidity lifts the citrus and refreshes the palate.</li><li><strong>Soft and goat cheeses</strong> — the fruit contrasts with the creaminess.</li><li><strong>Tropical salads</strong> with mango, avocado and a citrus vinaigrette.</li><li>Grilled fish, sushi, and lightly spicy Asian dishes.</li></ul>',
   50),

  (v_product_id,
   '¿Es un vino orgánico?',
   'Is it an organic wine?',
   '<p>Sí. El mango y la chinola con los que se elabora Kibay se cultivan de forma <strong>orgánica</strong> en la finca de Ocoa Bay, junto a las uvas de los Ocoa Wines. Sin pesticidas sintéticos, sin colorantes ni aromas artificiales, sin azúcares añadidos más allá de los presentes naturalmente en la fruta.</p>',
   '<p>Yes. The mango and passion fruit used to make Kibay are grown <strong>organically</strong> on the Ocoa Bay estate, alongside the grapes used for the Ocoa Wines. No synthetic pesticides, no artificial colors or flavors, no added sugars beyond what is naturally present in the fruit.</p>',
   60),

  (v_product_id,
   '¿Tiene alérgenos? ¿Es apto para veganos y sin gluten?',
   'Does it contain allergens? Is it vegan and gluten-free?',
   '<p>Kibay es <strong>sin gluten, sin lácteos y apto para veganos</strong>. Como todo vino, contiene sulfitos en niveles regulados que actúan como conservante natural. No contiene frutos secos, soya, huevo ni mariscos.</p>',
   '<p>Kibay is <strong>gluten-free, dairy-free and vegan-friendly</strong>. Like all wines, it contains regulated levels of sulfites as a natural preservative. It contains no nuts, soy, eggs or shellfish.</p>',
   70),

  (v_product_id,
   '¿Cuánto dura una botella abierta de Kibay?',
   'How long does an opened bottle of Kibay last?',
   '<p>Una vez abierta, conserva la botella en la nevera con un buen tapón y disfrútala dentro de <strong>2 a 3 días</strong>. Después de ese plazo el aroma de fruta tropical empieza a apagarse, aunque el vino sigue siendo seguro de consumir por más tiempo.</p>',
   '<p>Once opened, keep the bottle refrigerated with a tight stopper and enjoy within <strong>2 to 3 days</strong>. After that window the tropical fruit aroma starts to fade, though the wine remains safe to drink for longer.</p>',
   80),

  (v_product_id,
   '¿Hacen envíos en toda la República Dominicana?',
   'Do you ship across the Dominican Republic?',
   '<p>Sí. Enviamos Kibay a todo el territorio dominicano en <strong>2 a 3 días hábiles</strong>. Solo vendemos a mayores de 18 años; al recibir el pedido se verifica la identidad del receptor. Consulta condiciones, plazos y costos en nuestra <a href="/shipping-returns">página de envíos</a>.</p>',
   '<p>Yes. We ship Kibay anywhere in the Dominican Republic within <strong>2 to 3 business days</strong>. Sales are restricted to buyers over 18; the recipient''s ID is verified on delivery. See timing, fees and conditions on our <a href="/shipping-returns">shipping page</a>.</p>',
   90),

  (v_product_id,
   '¿Puedo visitar el viñedo donde se hace Kibay?',
   'Can I visit the vineyard where Kibay is made?',
   '<p>Sí. Ocoa Bay abre los <strong>sábados y domingos</strong> con tours guiados, cata de vinos, recorrido en carro eléctrico por los viñedos y una Casa Club con cocina farm-to-table sobre la Bahía de Ocoa. Reserva tu visita en <a href="https://ocoabay.com" rel="noopener" target="_blank">ocoabay.com</a> o a través de nuestra <a href="/vine-and-barrel">página de experiencias</a>.</p>',
   '<p>Yes. Ocoa Bay is open <strong>Saturdays and Sundays</strong> with guided tours, wine tasting, an electric-cart ride through the vineyards, and a Casa Club serving farm-to-table cuisine overlooking Bahía de Ocoa. Book your visit at <a href="https://ocoabay.com" rel="noopener" target="_blank">ocoabay.com</a> or through our <a href="/vine-and-barrel">experiences page</a>.</p>',
   100);
END $$;
