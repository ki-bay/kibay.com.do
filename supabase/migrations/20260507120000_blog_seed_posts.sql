-- Seed initial blog content targeting Caribbean / Dominican wine search intent.
-- Idempotent via slug uniqueness.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_categories (name, slug)
VALUES
  ('Wine Stories', 'wine-stories'),
  ('Tasting Notes', 'tasting-notes'),
  ('Behind the Brand', 'behind-the-brand')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
INSERT INTO public.blog_posts (
  title, description, content, featured_image_url, published,
  seo_title, seo_description, seo_keywords,
  slug, alt_text, author_email, reading_time, category_id
)
VALUES
  (
    'Vino Dominicano: The Story of Caribbean Sparkling Wine',
    'How a small Dominican winery is rewriting what wine looks like in the Caribbean — organic, fruit-driven, and made for tropical heat.',
    '<p>When most people picture a wine region, they picture rolling hills in France, Spain, or Italy — not the tropics. Yet the Dominican Republic, with its volcanic soils, year-round sun, and altitude in places like Ocoa Bay, has quietly built a wine culture of its own.</p>
<h2>What makes Caribbean wine different?</h2>
<p>Traditional grape varieties struggle in tropical heat — but the Caribbean grows fruit unlike anywhere on earth. <strong>Vino dominicano</strong> embraces what the islands actually have: organic mango, passion fruit, hibiscus, tamarind. The result is wine that pairs naturally with the food and weather it''s born into.</p>
<h2>Why Kibay started here</h2>
<p>Kibay was founded with a simple question: what would <em>Caribbean wine</em> look like if it stopped imitating Europe and started reflecting where it''s actually made? The answer is a sparkling wine that''s lighter, brighter, more fruit-forward — and built for warm afternoons by the sea, not cellars in the north.</p>
<h2>Organic from the ground up</h2>
<p>Every Kibay product is made with organically grown fruit from Dominican farms. No flavorings. No shortcuts. The terroir of the <strong>Caribbean</strong> shows up in every can — and that''s the point.</p>
<p>Whether you''re new to <em>Dominican sparkling wine</em> or you''ve been waiting years for someone to make it properly, Kibay is the start of something the Caribbean has long been ready for.</p>',
    'https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=1600&auto=format&fit=crop',
    true,
    'Vino Dominicano: The Story of Caribbean Sparkling Wine | Kibay',
    'How Dominican Republic became home to a new kind of Caribbean sparkling wine — organic, fruit-driven, made for the tropics.',
    'vino dominicano, Caribbean wine, Dominican sparkling wine, espumante dominicano, organic wine Dominican Republic',
    'vino-dominicano-caribbean-sparkling-wine',
    'Caribbean vineyard at sunset',
    'info@kibay.com.do',
    4,
    (SELECT id FROM public.blog_categories WHERE slug = 'wine-stories' LIMIT 1)
  ),
  (
    'Mango Sparkling Wine: From Caribbean Orchards to Your Glass',
    'Mango wine isn''t a gimmick — it''s the most honest expression of Caribbean terroir. Here''s how Kibay turns Dominican mangos into sparkling wine.',
    '<p>If you''ve only ever had mango as a dessert, mango wine sounds strange. The first sip changes that quickly.</p>
<h2>Why mango works as wine</h2>
<p>Mango has the same building blocks every winemaker looks for: natural sugar, gentle acidity, and aroma compounds that survive fermentation. In the Dominican Republic, where mango trees grow in nearly every backyard, the fruit is at its peak — sweeter and more aromatic than the grocery-store imports most people know.</p>
<h2>The Kibay process</h2>
<p>Every batch of <strong>Kibay Mango Sparkling Wine</strong> starts with hand-picked, organically grown Dominican mangos. The fruit is cold-pressed within hours of harvest to preserve aromatics. Slow fermentation at low temperature lets the wine develop body without losing the fresh mango character. The result is dry, not sugary — sparkling, not sweet — and unmistakably Caribbean.</p>
<h2>What it tastes like</h2>
<p>Bright stone fruit on the nose. A clean, crisp palate with citrus and a hint of tropical floral notes. The finish is dry — closer to a Prosecco than a fruit cooler. It pairs beautifully with ceviche, grilled fish, sweet plantains, or just a hot afternoon.</p>
<p>If you''re looking for <em>mango wine</em> that takes itself seriously — that''s actually wine, not a flavored seltzer — Kibay is what that looks like.</p>',
    'https://images.unsplash.com/photo-1591735927530-65f3a3b87c2c?q=80&w=1600&auto=format&fit=crop',
    true,
    'Mango Sparkling Wine: Kibay Caribbean Mango Wine from Dominican Republic',
    'Organic mango sparkling wine from the Dominican Republic. Dry, crisp, made from Caribbean fruit. Discover the Kibay mango wine story.',
    'mango wine, mango sparkling wine, fruit wine, Caribbean wine, organic mango wine, Dominican mango wine',
    'mango-sparkling-wine-caribbean',
    'Fresh Dominican mangos used in Kibay sparkling wine',
    'info@kibay.com.do',
    3,
    (SELECT id FROM public.blog_categories WHERE slug = 'tasting-notes' LIMIT 1)
  ),
  (
    'Why Sparkling Wine in Cans Belongs in the Caribbean',
    'Cans are not a downgrade. For the Caribbean — beach, boat, sun, single-serve moments — they''re the most honest format wine has ever had.',
    '<p>There''s a snobbery around wine in cans that mostly comes from people who''ve never spent an afternoon on a Caribbean beach trying to open a bottle.</p>
<h2>The case for the can</h2>
<p>Cork pulls work poorly in salt air. Glass shatters on boats. Half-finished bottles go warm in the sun. Cans solve all three: airtight, light, recyclable, fast to chill, and sized for one person to drink at the right temperature without compromise.</p>
<h2>Why it matters more here</h2>
<p>The Caribbean lives outdoors. Wine that fits the environment — that travels with you to the beach, the boat, the rooftop, the picnic — is wine you actually drink, instead of the bottle that sits in a cellar waiting for an occasion. Kibay was built for the way Caribbean people actually live.</p>
<h2>Quality is not a function of format</h2>
<p>The wine inside a Kibay can is the same wine that would be in a bottle: organic Dominican fruit, natural fermentation, real winemaking. The aluminum just keeps it fresher and gets it where it needs to go. <strong>Sparkling wine in cans</strong> isn''t a compromise — for the Caribbean, it''s the upgrade.</p>',
    'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?q=80&w=1600&auto=format&fit=crop',
    true,
    'Why Sparkling Wine in Cans Belongs in the Caribbean | Kibay',
    'Wine in cans isn''t a downgrade — for Caribbean beach days and tropical heat, aluminum is the smartest format wine has ever had.',
    'wine in cans, canned sparkling wine, sparkling wine cans, Caribbean wine, beach wine, portable wine',
    'sparkling-wine-cans-caribbean',
    'Kibay sparkling wine cans on a Caribbean beach',
    'info@kibay.com.do',
    3,
    (SELECT id FROM public.blog_categories WHERE slug = 'behind-the-brand' LIMIT 1)
  )
ON CONFLICT (slug) DO NOTHING;
