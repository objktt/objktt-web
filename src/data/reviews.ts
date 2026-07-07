/**
 * Curated Google reviews shown on the Home page review section.
 * Source: Google Maps listing for 오브옉트 레코드 커피&바 / Objktt Record Coffee&Bar
 * (place id 0x357ca3e87dec1ac5:0xe8e28d09b3cb5c03). Rating 5.0 across 103 reviews.
 * To refresh, copy the latest review text/author from the Google listing.
 */
export interface Review {
  author: string;
  /** Relative time label as shown on Google (en / ko). */
  time: { en: string; ko: string };
  rating: number;
  /** Review body. Most reviews are written in English. */
  text: string;
  /** "Local Guide" badge if the reviewer is one. */
  localGuide?: boolean;
}

export const GOOGLE_RATING = 5.0;
export const GOOGLE_REVIEW_COUNT = 103;

/** Direct link to the Google Maps listing (opens reviews / write-a-review). */
export const GOOGLE_PLACE_URL =
  'https://www.google.com/maps/place/%EC%98%A4%EB%B8%8C%EC%98%89%ED%8A%B8+%EB%A0%88%EC%BD%94%EB%93%9C+%EC%BB%A4%ED%94%BC%26%EB%B0%94+%2F+Objktt+Record+Coffee%26Bar/data=!4m6!3m5!1s0x357ca3e87dec1ac5:0xe8e28d09b3cb5c03!8m2!3d37.56178!4d126.9882147!16s%2Fg%2F11w1kc22sq';

export const REVIEWS: Review[] = [
  {
    author: 'Janet',
    time: { en: '4 months ago', ko: '4개월 전' },
    rating: 5,
    text: "It was my last night in Seoul, and I didn't want to travel too far from my hotel. I came across this cozy little bar nearby and I'm so glad I did. The atmosphere was warm, the music enjoyable, and the cocktails were some of the best I had in the Myeongdong area. I only wish I had discovered it sooner.",
  },
  {
    author: 'Samantha B',
    time: { en: '7 months ago', ko: '7개월 전' },
    rating: 5,
    localGuide: true,
    text: 'Super unique bar on the 4th floor. Owner was friendly, speaks good English, and was bumping cool tunes. Definitely recommend a stop here on your way to or from the Myeongdong Night Market.',
  },
  {
    author: 'Jon Terrado',
    time: { en: '11 months ago', ko: '11개월 전' },
    rating: 5,
    text: "The vibe of this bar was immaculate! We made our way here for a quick drink in the afternoon and stayed much longer than anticipated just because of how great the space, drinks, music and service were.",
  },
  {
    author: 'Isobel Jane',
    time: { en: '7 months ago', ko: '7개월 전' },
    rating: 5,
    text: 'Such a fun and chill place to grab a drink! Cocktails are decently priced and the ambience is relaxing. Definitely worth a visit!',
  },
];
