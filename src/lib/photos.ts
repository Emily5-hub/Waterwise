/** Real photographs from Wikimedia Commons (not AI-generated), shown with author and license
 *  as their licenses require. Keyed by Lawn Care guide entry id. Loaded from Wikimedia, so they
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


/** Lawn care 101 photos, picked by the site owner: 4 per topic. Unsplash photos are free under the
 *  Unsplash License; Wikimedia ones carry their own license and credit. */
const unsplash = (id: string, img: string, alt: string, author: string): Photo => ({
  src: `https://images.unsplash.com/${img}?w=600&q=75&fit=crop&ar=1:1`, alt, author,
  license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', page: `https://unsplash.com/photos/${id}`,
});
const commons = (file: string, thumb: string, alt: string, author: string, license: string, licenseUrl: string): Photo => ({
  src: thumb, alt, author, license, licenseUrl, page: `https://commons.wikimedia.org/wiki/File:${file}`,
});
export const photoSource = (p: Photo) => (p.page.includes('unsplash.com') ? 'Unsplash' : 'Wikimedia Commons');

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
