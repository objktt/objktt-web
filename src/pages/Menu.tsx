import React, { useState, useEffect, useRef } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useLanguage } from '../contexts/LanguageContext';
import { usePageSeo } from '../data/pageSeo';

import imgObjktt from '../assets/img/menu/obj_objktt.jpeg';
import imgGreen from '../assets/img/menu/obj_green.jpeg';
import imgBasil from '../assets/img/menu/obj_basil.jpeg';
import imgStrawberry from '../assets/img/menu/obj_strawberry.jpeg';
import imgKalimcho from '../assets/img/menu/obj_kalimcho.jpeg';
import imgNegroni from '../assets/img/menu/obj_negroni.jpeg';
import imgGintonic from '../assets/img/menu/obj_gintonic.jpeg';
import imgHighball from '../assets/img/menu/obj_highball.jpeg';
import imgHeineken from '../assets/img/menu/obj_heineken.jpeg';
import imgCafri from '../assets/img/menu/obj_cafri.jpeg';
import imgHendricks from '../assets/img/menu/obj_hendricks.jpeg';
import imgTequila from '../assets/img/menu/obj_tequila.jpeg';
import imgSoju from '../assets/img/menu/obj_soju.jpeg';
import imgJameson from '../assets/img/menu/obj_jameson.jpeg';
import imgJwBlack from '../assets/img/menu/obj_jwblack.jpeg';
import imgMakers from '../assets/img/menu/obj_makers.jpeg';
import imgMichters from '../assets/img/menu/obj_michters.jpeg';
import imgRowans from '../assets/img/menu/obj_rowans.jpeg';
import imgMacallanSherry from '../assets/img/menu/obj_macallan_sherry.jpeg';
import imgMacallanDouble from '../assets/img/menu/obj_macallan_double.jpeg';
import imgBalvenie from '../assets/img/menu/obj_balvenie.jpeg';
import imgGlenfiddich from '../assets/img/menu/obj_glenfiddich.jpeg';
import imgArran from '../assets/img/menu/obj_arran.jpeg';
import imgLagavulin from '../assets/img/menu/obj_lagavulin.jpeg';
import imgArdbeg from '../assets/img/menu/obj_ardbeg.jpeg';
import imgLaphroaig from '../assets/img/menu/obj_laphroaig.jpeg';
import imgPlate from '../assets/img/menu/obj_plate.jpeg';
import imgPizza from '../assets/img/menu/obj_pizza.jpeg';
import imgBanana from '../assets/img/menu/obj_banana.jpeg';
import imgSorbet from '../assets/img/menu/obj_sorbet.jpeg';
import imgPopcorn from '../assets/img/menu/obj_popcorn.jpeg';
import imgIcecreamcake from '../assets/img/menu/obj_icecreamcake.jpeg';
import imgGosuramen from '../assets/img/menu/obj_gosuramen.jpeg';
import imgTomatoSoup from '../assets/img/menu/obj_tomato_soup.jpeg';
import imgBrunch from '../assets/img/menu/obj_brunch.jpeg';
import imgWineImpero from '../assets/img/menu/wine_impero.jpeg';
import imgWineTrambusti from '../assets/img/menu/wine_trambusti.jpeg';
import imgWineCanadaNegra from '../assets/img/menu/wine_canada_negra.jpeg';
import imgWineBajo from '../assets/img/menu/wine_bajo.jpeg';
import imgWinePureEst from '../assets/img/menu/wine_pure_est.jpeg';
import imgWineDonaFlor from '../assets/img/menu/wine_dona_flor.jpeg';
import imgWineVistamar from '../assets/img/menu/wine_vistamar.jpeg';
import imgWineMoet from '../assets/img/menu/wine_moet.jpeg';
import imgWineMuchasManos from '../assets/img/menu/wine_muchas_manos.jpeg';
import imgWineOscuridadCab from '../assets/img/menu/wine_oscuridad_cab.jpeg';
import imgWineOscuridadChard from '../assets/img/menu/wine_oscuridad_chard.jpeg';

interface MenuItem {
  name: string;
  nameKr?: string;
  description?: string;
  image?: string;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

const menuData: MenuCategory[] = [
  {
    title: 'Coffee & Drinks',
    items: [
      { name: 'OBJKTT Coffee (Hot / Ice)', nameKr: '오브옉트 싱글 오리진 커피', description: 'Bean Options: Ethiopia Yirgacheffe Koke G2 / Brazil Cerrado\n에티오피아 예가체프 코케 G2와 브라질 세하도 원두 중 선택' },
      { name: 'Café au Lait', nameKr: '카페 오레', description: 'Drip coffee topped with a thin layer of steamed milk.' },
      { name: 'OBJKTT Ade', nameKr: '오브옉트 에이드', description: 'Seasonal fruit ade with house-made syrup' },
      { name: 'House-made Lemonade', nameKr: '수제 레몬에이드', description: 'Freshly squeezed lemon with sparkling water' },
      { name: 'Black Sugar Pearl Milk Tea', nameKr: '흑당 펄 밀크티', description: 'Rich black sugar syrup and premium milk tea, served with tapioca pearls.' },
      { name: 'Milk Tea', nameKr: '밀크티', description: 'House-blended tea with steamed whole milk' },
      { name: 'Ginger Tea', nameKr: '진저티', description: 'Fresh ginger with honey and warm lemon' },
      { name: 'Tea Selection', nameKr: '오브옉트 티 셀렉션', description: 'Chamomile / Peppermint / Earl Grey' },
    ],
  },
  {
    title: 'Bakery',
    items: [
      { name: 'Levain Cookie', nameKr: '르뱅 쿠키', description: 'Crispy outside, chewy inside. Baked fresh daily' },
      { name: 'Egg Tart', nameKr: '에그 타르트', description: 'Silky egg custard in a buttery pastry shell' },
      { name: 'Financier', nameKr: '휘낭시에', description: 'Plain / Lemon / Chocolate. Browned butter almond cake' },
    ],
  },
  {
    title: 'Brunch',
    items: [
      { name: 'OBJKTT Fresh Garden Brunch', nameKr: '오브옉트 프레시 가든 브런치', description: 'Brunch with fresh seasonal vegetables, eggs, and premium ingredients', image: imgBrunch },
      { name: 'Tomato Soup & Bread', nameKr: '토마토 스프 & 브레드', description: 'Rich velvety tomato soup with house-made garlic baguette', image: imgTomatoSoup },
    ],
  },
  {
    title: 'Cocktail',
    items: [
      { name: 'Objktt Cocktail', nameKr: '오브옉트 칵테일', description: 'Vodka, Lemon, Tea, Mint and Spice. Our signature', image: imgObjktt },
      { name: 'We Are Green Cocktail', nameKr: '위아 그린 칵테일', description: 'Gin, Green Grape and Rosemary. Our 2nd signature', image: imgGreen },
      { name: 'Objktt Basil Smash', nameKr: '오브옉트 바질 스매쉬', description: 'Gin, Basil, Lemon and a Tomato Twist', image: imgBasil },
      { name: 'Strawberry Mojito', nameKr: '딸기 모히또', description: 'Strawberry Mojito with Gin or Vodka', image: imgStrawberry },
      { name: 'Negroni', nameKr: '네그로니', description: 'Gin, Campari and Sweet Vermouth with a Cinnamon Stick', image: imgNegroni },
      { name: 'Dirty Gin Fizz', nameKr: '더티 진 피즈', description: 'Gin, Lemon Syrup, Olive Brine and Soda with an Olive Garnish' },
      { name: 'Gin Tonic', nameKr: '진 토닉', description: 'Gin with Tonic Water or Sparkling Water', image: imgGintonic },
      { name: 'Highball', nameKr: '하이볼', description: 'Clean and crisp highball, available with whiskey', image: imgHighball },
      { name: 'Calimocho', nameKr: '칼리모초', description: 'Citrusy Non-Alcoholic Wine Cocktail. Non-Alcoholic version available.', image: imgKalimcho },
    ],
  },
  {
    title: 'Whiskey',
    items: [
      { name: 'Jameson', nameKr: '제임슨', description: 'Light, smooth, easy-drinking Irish whiskey', image: imgJameson },
      { name: 'Johnnie Walker Black', nameKr: '조니워커 블랙', description: 'Balanced smoke, malt, gentle sweetness', image: imgJwBlack },
      { name: "Maker's Mark", nameKr: '메이커스 마크', description: 'Sweet wheated bourbon, smooth finish', image: imgMakers },
      { name: "Michter's US1 Small Batch Bourbon", nameKr: 'US 버번', description: 'Elegant sweetness with oak and soft spice', image: imgMichters },
      { name: "Rowan's Creek", nameKr: '로완 크릭', description: 'Rich caramel, vanilla, bold bourbon body', image: imgRowans },
      { name: 'Macallan 12yrs Sherry Oak', nameKr: '맥캘란 12년 쉐리 오크', description: 'Rich sherry sweetness and dried fruits', image: imgMacallanSherry },
      { name: 'Macallan 12yrs Double Cask', nameKr: '맥캘란 12년 블 캐스크', description: 'Balanced honeyed sweetness and gentle spice', image: imgMacallanDouble },
      { name: 'Balvenie 12yrs Double Wood', nameKr: '발베니 12년 더블우드', description: 'Soft vanilla, honey, and warm oak', image: imgBalvenie },
      { name: 'Glenfiddich 15yrs', nameKr: '글렌피딕 15년', description: 'Smooth malt sweetness with oak and spice', image: imgGlenfiddich },
      { name: 'Arran 10yrs', nameKr: '아란 10년', description: 'Fresh citrus, apple, clean malt', image: imgArran },
      { name: 'Lagavulin 8yrs', nameKr: '라가불린 8년', description: 'Medicinal peat, seaweed, smoky character', image: imgLagavulin },
      { name: 'Ardbeg 10yrs', nameKr: '아드벡 10년', description: 'Intense peat smoke and maritime notes', image: imgArdbeg },
      { name: 'Laphroaig 10yrs', nameKr: '라프로익 10년', description: 'Bold peat, black pepper, deep smoke', image: imgLaphroaig },
    ],
  },
  {
    title: 'Beer & Spirits',
    items: [
      { name: 'Heineken Draft Beer', nameKr: '하이네켄 생맥주', description: 'Premium Dutch lager on draft. Smooth and refreshing', image: imgHeineken },
      { name: 'Cafri (Bottled)', nameKr: '카프리 (병맥주)', description: 'Light Korean lager, crisp and easy drinking', image: imgCafri },
      { name: "Hendrick's Gin", nameKr: '헨드릭스 진', description: 'Honey, creamy malt, gentle oak, nutty', image: imgHendricks },
      { name: 'Tequila Sierra Reposado Shot', nameKr: '테킬라 시에라 레포사도 샷', description: 'Powerful peat, smoke, iodine, full-bodied', image: imgTequila },
      { name: 'Soju Shot (25% ABV)', nameKr: '소주 샷 (25도)', description: 'Clean and smooth Korean spirit', image: imgSoju },
    ],
  },
  {
    title: 'Wine',
    items: [
      { name: 'House Wine (Red / White)', nameKr: '하우스 와인' },
    ],
  },
  {
    title: 'Red Wine',
    items: [
      { name: 'Impero Cabernet Sauvignon', nameKr: '임페로 컬렉션 카베르네 소비뇽', description: '2022 · ITALY · DRY. Rich red fruit aromas with smooth, elegant tannins.', image: imgWineImpero },
      { name: 'Trambusti Cavalleresco', nameKr: '트람부스티 카발레레스코', description: '2023 · ITALY · DRY. Traditional Italian red with balanced acidity and refined structure.', image: imgWineTrambusti },
      { name: 'Canada Negra Tempranillo-Monastrell', nameKr: '카나다 네그라 템프라니요-모나스트렐', description: '2024 · SPAIN · DRY. Deep color with concentrated fruit flavors and a hint of spice.', image: imgWineCanadaNegra },
      { name: 'Bajo Montepulciano', nameKr: '바조 몬테풀치아노', description: '2023 · ITALY · DRY. A supple daily red wine with charming cherry and blackberry notes.', image: imgWineBajo },
      { name: 'Oscuridad Cabernet Sauvignon', nameKr: '오스쿠리다 카베르네 소비뇽', description: '2024 · SPAIN · DRY. Deep ruby wine with moderate weight and a comfortable finish.', image: imgWineOscuridadCab },
    ],
  },
  {
    title: 'White Wine',
    items: [
      { name: 'Pure Est Verdejo', nameKr: '퓨어 에스트 베르데호', description: '2023 · SPAIN · DRY. Delightful acidity with vibrant tropical fruit notes.', image: imgWinePureEst },
      { name: 'Dona Flor Vinho Verde', nameKr: '도나 플로르 비뉴 베르데', description: 'NV · PORTUGAL · SLIGHTLY SWEET. Lightly carbonated ‘Green Wine’ with a fresh, crisp character.', image: imgWineDonaFlor },
      { name: 'Oscuridad Chardonnay', nameKr: '오스쿠리다 샤르도네', description: '2025 · SPAIN · DRY. Ripe apple and citrus aromas with a smooth, pleasant mouthfeel.', image: imgWineOscuridadChard },
      { name: 'Vistamar Brisa Chardonnay', nameKr: '비스타마르 브리사 샤르도네', description: '2024 · CHILE · DRY. Rich fruit flavors with a clean and refreshing finish.', image: imgWineVistamar },
    ],
  },
  {
    title: 'Champagne & Sparkling Wine',
    items: [
      { name: 'Moët & Chandon Impérial 375ml', nameKr: '모엣 샹동 임페리얼', description: 'FRANCE · DRY. The world’s most loved champagne, known for its bright fruitiness.', image: imgWineMoet },
      { name: 'Muchas Manos Brut', nameKr: '무차스 마노스 브뤼', description: 'NV · ITALY · DRY. Delicate bubbles and refreshing aroma for a festive atmosphere.', image: imgWineMuchasManos },
    ],
  },
  {
    title: 'Food',
    items: [
      { name: 'Objktt Plate', nameKr: '오브옉트 플레이트', description: 'Tomato, Cheese and Olive', image: imgPlate },
      { name: 'Objktt Slice Pizza', nameKr: '오브옉트 조각 피자', description: 'A one-quarter classic Margherita-style slice topped with fresh basil', image: imgPizza },
      { name: 'Tomato Coriander Ramen', nameKr: '토마토 고수 라면', description: 'Spicy & Tangy Tomato Ramen with Coriander', image: imgGosuramen },
      { name: 'Banana Cinnamon Brûlée', nameKr: '바나나 시나몬 브륄레', description: 'Caramelized brûlée with sliced bananas and a touch of cinnamon', image: imgBanana },
      { name: 'Strawberry Sorbet', nameKr: '딸기 바나나 샤베', description: 'Strawberry-banana sorbet with a smooth, fruity finish', image: imgSorbet },
      { name: 'Truffle Oil Popcorn', nameKr: '트러플 오일 팝콘', description: 'Truffle-scented popcorn, perfect with beer', image: imgPopcorn },
      { name: 'Ice Cream Pound Cake', nameKr: '아이스크림 파운드 케이크', description: 'Chocolate brownie with vanilla ice cream', image: imgIcecreamcake },
    ],
  },
];

const Menu: React.FC = () => {
  usePageSeo('menu');
  const { isMobile } = useBreakpoint();
  const { language } = useLanguage();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  // The cursor-follow preview positions itself via direct DOM writes (a
  // transform on the wrapper ref), NOT React state — mousemove-into-state
  // re-rendered the whole page on every pointer frame.
  const followRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = followRef.current;
      if (el) {
        el.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 100}px)`;
        el.style.visibility = 'visible';
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  const getHoveredImage = (): string | undefined => {
    for (const category of menuData) {
      const item = category.items.find((i) => i.name === hoveredItem);
      if (item?.image) return item.image;
    }
    return undefined;
  };

  const hoveredImage = hoveredItem ? getHoveredImage() : undefined;

  // Real headline per category (the previous uppercase micro-label repeated 11
  // times down the page); one hairline above each category, none between rows.
  const categoryTitle: React.CSSProperties = {
    fontSize: isMobile ? '1.35rem' : '1.6rem',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    margin: 0,
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--color-line)',
    marginBottom: '1.5rem',
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <section>
        {/* Section Title */}
        <div style={{
          padding: `${isMobile ? '5rem' : '7rem'} ${isMobile ? '1.5rem' : '4rem'} ${isMobile ? '2rem' : '3rem'}`,
        }}>
          <h2 style={{
            fontSize: isMobile ? '10vw' : 'clamp(3rem, 6vw, 6.5rem)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: isMobile ? '-0.03em' : '-0.04em',
            margin: 0,
          }}>
            Menu
          </h2>
          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            opacity: 0.6,
            fontWeight: 400,
            letterSpacing: '0.02em',
          }}>
            {language === 'en' 
              ? '* Cafe menu can be ordered until 6:00 PM.' 
              : '* 카페 메뉴는 오후 6시까지만 주문이 가능합니다.'}
          </p>
        </div>

        {/* Menu Categories */}
        <div style={{ padding: isMobile ? '0 1.5rem' : '0 4rem' }}>
          {menuData.map((category) => {
            const hasImages = category.items.some((i) => i.image);
            return (
            <div key={category.title} style={{ marginBottom: isMobile ? '3rem' : '4.5rem' }}>
              <h3 style={categoryTitle}>{category.title}</h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  columnGap: '4rem',
                  rowGap: isMobile ? '1.25rem' : '1.5rem',
                }}
              >
                {category.items.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      cursor: 'default',
                      transition: 'opacity 0.2s ease',
                      opacity: hoveredItem && hoveredItem !== item.name ? 0.35 : 1,
                    }}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Inline thumbnail — visible on every device (the photos
                        used to exist only inside the desktop hover preview).
                        Imageless items in a photo category get a spacer so
                        every name in the column shares the same left edge. */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        style={{
                          width: '56px',
                          height: '56px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          backgroundColor: 'var(--color-line)',
                        }}
                      />
                    ) : hasImages ? (
                      <div style={{ width: '56px', flexShrink: 0 }} aria-hidden />
                    ) : null}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '1rem',
                      }}>
                        <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                          {item.name}
                        </span>
                        {item.nameKr && (
                          <span style={{ fontSize: '0.8125rem', opacity: 0.6, flexShrink: 0, textAlign: 'right' }}>
                            {item.nameKr}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{
                          fontSize: '0.8125rem',
                          opacity: 0.65,
                          margin: '0.25rem 0 0',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-line',
                        }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Cursor-following enlarged preview (desktop only). Position is driven by
          direct transform writes in the mousemove handler above. */}
      {!isMobile && hoveredItem && hoveredImage && (
        <div
          ref={followRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '320px',
            height: '400px',
            pointerEvents: 'none',
            zIndex: 999,
            overflow: 'hidden',
            visibility: 'hidden', // shown after the first mousemove positions it
          }}
        >
          <img
            src={hoveredImage}
            alt={hoveredItem}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Menu;
