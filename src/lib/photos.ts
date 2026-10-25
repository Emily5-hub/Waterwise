/** Real photographs from Wikimedia Commons (not AI-generated). Each keeps its author and license
 *  here for reference; the site doesn't show photo credits. Keyed by Lawn Care guide entry id. Loaded from Wikimedia, so they
 *  need a connection; the alt text describes each one. */
export interface Photo { src: string; alt: string; author: string; license: string; licenseUrl: string; page: string }

export const HEALTHY_LAWN: Photo = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Garden_Centre_Lawn_-_geograph.org.uk_-_164663.jpg',
  alt: 'A thick, evenly green lawn with neat mowing stripes',
  author: 'David Medcalf', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
  page: 'https://commons.wikimedia.org/wiki/File:Garden_Centre_Lawn_-_geograph.org.uk_-_164663.jpg',
};

export const GUIDE_PHOTOS: Record<string, Photo> = {
  drought: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/A_very_dry_Brooklands_Lawn_-_geograph.org.uk_-_8388972.jpg/960px-A_very_dry_Brooklands_Lawn_-_geograph.org.uk_-_8388972.jpg',
    alt: 'A large lawn turned dry, straw-colored and brown during a drought',
    author: 'Mr Ignavy', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    page: 'https://commons.wikimedia.org/wiki/File:A_very_dry_Brooklands_Lawn_-_geograph.org.uk_-_8388972.jpg',
  },
  overwater: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Lawn_Mushrooms_2_2018-07-16.jpg/960px-Lawn_Mushrooms_2_2018-07-16.jpg',
    alt: 'Small mushrooms growing up through thick green grass',
    author: 'FASTILY', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Lawn_Mushrooms_2_2018-07-16.jpg',
  },
  fungus: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Dollarspot.jpg',
    alt: 'Short green turf with many small, round straw-colored spots of dollar spot disease',
    author: 'Glenobear', license: 'Public domain', licenseUrl: '',
    page: 'https://commons.wikimedia.org/wiki/File:Dollarspot.jpg',
  },
  grubs: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Engerling_in_de_bodem.jpg/960px-Engerling_in_de_bodem.jpg',
    alt: 'A C-shaped white grub with a brown head curled in soil',
    author: 'Cindy kuiphuis', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Engerling_in_de_bodem.jpg',
  },
  weeds: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Dandelions_in_grass_close_up_photo_%2842392901081%29.jpg/960px-Dandelions_in_grass_close_up_photo_%2842392901081%29.jpg',
    alt: 'Yellow dandelion flowers growing among grass blades',
    author: 'Tony Webster', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    page: 'https://commons.wikimedia.org/wiki/File:Dandelions_in_grass_close_up_photo_(42392901081).jpg',
  },
};


/** Lawn care photos, picked by the site owner: 4 per topic. Unsplash photos are free under the
 *  Unsplash License; Wikimedia ones carry their own license and credit. */
const unsplash = (id: string, img: string, alt: string, author: string): Photo => ({
  src: `https://images.unsplash.com/${img}?w=600&q=75&fit=crop&ar=1:1`, alt, author,
  license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', page: `https://unsplash.com/photos/${id}`,
});
const commons = (file: string, thumb: string, alt: string, author: string, license: string, licenseUrl: string): Photo => ({
  src: thumb, alt, author, license, licenseUrl, page: `https://commons.wikimedia.org/wiki/File:${file}`,
});

export const LAWN_CARE_PHOTOS: Record<'watering' | 'feeding' | 'mowing' | 'aerating' | 'seeding', Photo[]> = {
  watering: [
    unsplash('RjxqFCXpt2c', 'photo-1770664945615-52203ab54c88', 'Sprinklers watering a green lawn at sunset', 'Alef Morais'),
    unsplash('k78zCic_5is', 'photo-1780772415259-bda4359205a8', 'Sunlight on a sprinkler watering a lush lawn', 'Nadin Nandin'),
    unsplash('ZsWQ9cK9kKo', 'photo-1693776472225-be367ccf88b7', 'A man spraying water on the grass with a hose', 'Anastasiya Badun'),
    unsplash('Hf9PD1nU1Gw', 'photo-1780098847544-eb3867cc0e1c', 'A sprinkler watering a lawn in warm evening light', 'Kürşad Ç.'),
  ],
  feeding: [
    commons('Broadcast_spreader.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Broadcast_spreader.jpg/960px-Broadcast_spreader.jpg', 'A broadcast spreader for fertilizer', 'Gmihail', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/rs/deed.en'),
    unsplash('5-LBYIucVGM', 'photo-1757670919588-1fe3b3df3dfa', 'A pile of small granules like lawn fertilizer', 'Zemos'),
    commons('Inorganic_fertilizer.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Inorganic_fertilizer.jpg/960px-Inorganic_fertilizer.jpg', 'Fertilizer granules', 'Yahuzaishat', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en'),
    unsplash('bQ9y93kdk4c', 'photo-1642952273588-ed6fa28870ac', 'A handful of soil, ready for a soil test', 'Alicia Christin Gerald'),
  ],
  mowing: [
    unsplash('zfwyrIA6bFw', 'photo-1590820292118-e256c3ac2676', 'A push lawn mower on green grass', 'Andres Siimon'),
    unsplash('YhxOrHGrQQc', 'photo-1690068023694-053da714f95f', 'A person mowing the grass', 'Carl Tronders'),
    unsplash('zXH4Y7bRu3Y', 'photo-1764969370921-7c8df49171cd', 'A freshly mown lawn in the sun', 'MV Vacation'),
    unsplash('U8mUxOAbSOI', 'photo-1780419748459-075ce111534a', 'A person mowing a lawn next to a house', 'Kenny Perez'),
  ],
  aerating: [
    commons('AIREADORA_06.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/AIREADORA_06.JPG/960px-AIREADORA_06.JPG', 'A lawn dotted with aeration holes and soil plugs', 'Guipozjim', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0'),
    commons('AIREADORA_07.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/AIREADORA_07.JPG/960px-AIREADORA_07.JPG', 'Close-up of aeration holes and pulled soil plugs', 'Guipozjim', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0'),
    commons('Cunningham_Ballfields_td_(2018-11-12)_09_-_Aerated_Grass.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Cunningham_Ballfields_td_%282018-11-12%29_09_-_Aerated_Grass.jpg/960px-Cunningham_Ballfields_td_%282018-11-12%29_09_-_Aerated_Grass.jpg', 'Freshly aerated grass on a playing field', 'Tdorante10', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0'),
    commons('Lawn_aerator_attachment_on_a_garden_tiller.JPG', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Lawn_aerator_attachment_on_a_garden_tiller.JPG/960px-Lawn_aerator_attachment_on_a_garden_tiller.JPG', 'A core aerator attachment on a garden tiller', 'Lovesgreenlawn', 'Public domain', ''),
  ],
  seeding: [
    unsplash('ELlinjlfwL8', 'photo-1724893973380-7204358348a6', 'Small green shoots coming up through the soil', 'Nora Jane Long'),
    unsplash('fjj7lVpCxRE', 'photo-1557234195-bd9f290f0e4d', 'A green sprout in the sunlight', 'Roman Synkevych'),
    unsplash('JHuFudLQLbw', 'photo-1737892502908-1debcbe19c99', 'Close-up of young grass', 'Dimas H'),
    unsplash('qPHHt-JTf5s', 'photo-1617488983195-93997cb57cdd', 'New green grass blades', 'Jodie Righos'),
  ],
};

/** Seasons on Lawn Health and grasses on Your Lawn: real photographs from Wikimedia Commons, picked by hand
 *  and saved with the site (public/images) so they load fast and work offline. */
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0';
export const SEASON_PHOTOS: Record<'Spring' | 'Summer' | 'Fall' | 'Winter', Photo> = {
  Spring: { src: '/images/season-spring.webp', alt: 'A freshly mown, striped front lawn with flowering dogwood, cherry and redbud trees in bloom',
    author: 'Famartin', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:2024-04-20_11_50_44_A_lawn_with_a_Pink_Flowering_Dogwood,_Kanzan_Cherry,_Eastern_Redbud_and_White_Flowering_Dogwood_blooming_in_spring_along_Mountain_View_Road_in_the_Mountainview_section_of_Ewing_Township,_Mercer_County,_New_Jersey.jpg' },
  Summer: { src: '/images/season-summer.webp', alt: 'A sunny, lush garden lawn with dappled shade under large trees',
    author: 'Bjankuloski06', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Lawn_and_Summer_House,_Ewelme_Cottage.jpg' },
  Fall: { src: '/images/season-fall.webp', alt: 'Yellow maple leaves blanketing a backyard lawn under a golden maple tree',
    author: 'Famartin', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:2023-11-13_14_49_18_A_lawn_covered_with_fallen_leaves_from_a_Norway_Maple_in_late_autumn_along_Mountain_View_Road_in_the_Mountainview_section_of_Ewing_Township,_Mercer_County,_New_Jersey.jpg' },
  Winter: { src: '/images/season-winter.webp', alt: 'A residential lawn under fresh snow with snow-laden evergreens and bare trees',
    author: 'Famartin', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:2018-03-21_10_29_12_A_snow-covered_lawn_along_Tranquility_Court_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg' },
};
export const GRASS_PHOTOS: Record<'bermuda' | 'st_augustine' | 'kentucky_bluegrass' | 'fescue', Photo> = {
  bermuda: { src: '/images/grass-bermuda.webp', alt: 'Mown Bermuda grass turf in a park, with a few fallen leaves',
    author: 'John Robert McPherson', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4,
    page: 'https://commons.wikimedia.org/wiki/File:Cynodon_dactylon_in_open_forest_near_Larissa_St_7th_Brigade_Park_Chermside_IMGP3068.jpg' },
  st_augustine: { src: '/images/grass-st-augustine.webp', alt: 'Close-up of St. Augustine grass with broad, flat, blunt-tipped blades',
    author: 'Forest and Kim Starr', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us',
    page: 'https://commons.wikimedia.org/wiki/File:Starr-170321-0608-Stenotaphrum_secundatum-in_lawn-Honoapiilani_Beach_Park_Kaanapali-Maui_(33296732993).jpg' },
  kentucky_bluegrass: { src: '/images/grass-kentucky-bluegrass.webp', alt: 'Dense, unmown Kentucky bluegrass in flower',
    author: 'Sciencia58', license: 'CC0', licenseUrl: CC0,
    page: 'https://commons.wikimedia.org/wiki/File:Blooming_Poa_pratensis.jpg' },
  fescue: { src: '/images/grass-fescue.webp', alt: 'A mown, even fescue lawn with soft tree shadows',
    author: 'Daderot', license: 'CC0', licenseUrl: CC0,
    page: 'https://commons.wikimedia.org/wiki/File:Chewing%27s_fescue_(Festuca_rubra_subsp._commutata)_-_Christchurch_Botanic_Gardens_-_Christchurch,_NZ_-_DSC00995.jpg' },
};
