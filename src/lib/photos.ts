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
