import React, { useState, useEffect } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

import imgObjktt from '../assets/img/menu/obj_objktt.jpeg';
import imgGreen from '../assets/img/menu/obj_green.jpeg';
import imgBasil from '../assets/img/menu/obj_basil.jpeg';
import imgStrawberry from '../assets/img/menu/obj_strawberry.jpeg';
import imgKalimcho from '../assets/img/menu/obj_kalimcho.jpeg';
import imgPlate from '../assets/img/menu/obj_plate.jpeg';
import imgPizza from '../assets/img/menu/obj_pizza.jpeg';
import imgBanana from '../assets/img/menu/obj_banana.jpeg';
import imgSorbet from '../assets/img/menu/obj_sorbet.jpeg';
import imgPopcorn from '../assets/img/menu/obj_popcorn.jpeg';
import imgIcecreamcake from '../assets/img/menu/obj_icecreamcake.jpeg';

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
    title: 'Cocktail',
    items: [
      { name: 'Objktt Cocktail', nameKr: '오브옉트 칵테일', description: 'Vodka, Lemon, Tea, Mint and Spice — our signature', image: imgObjktt },
      { name: 'We Are Green Cocktail', nameKr: '위아 그린 칵테일', description: 'Gin, Green Grape and Rosemary — our 2nd signature', image: imgGreen },
      { name: 'Objktt Basil Smash', nameKr: '오브옉트 바질 스매쉬', description: 'Gin, Basil, Lemon and a Tomato Twist', image: imgBasil },
      { name: 'Strawberry Mojito', nameKr: '딸기 모히또', description: 'Strawberry Mojito with Gin or Vodka', image: imgStrawberry },
      { name: 'Negroni', nameKr: '네그로니', description: 'Gin, Campari and Sweet Vermouth with a Cinnamon Stick' },
      { name: 'Dirty Gin Fizz', nameKr: '더티 진 피즈', description: 'Gin, Lemon Syrup, Olive Brine and Soda with an Olive Garnish' },
      { name: 'Gin Tonic', nameKr: '진 토닉', description: 'Gin with Tonic Water or Sparkling Water' },
      { name: 'Highball', nameKr: '하이볼', description: 'Clean and crisp highball, available with whiskey' },
      { name: 'Calimocho', nameKr: '칼리모초', description: 'Citrusy Non-Alcoholic Wine Cocktail. Non-Alcoholic version available.', image: imgKalimcho },
    ],
  },
  {
    title: 'Whiskey',
    items: [
      { name: 'Jameson', nameKr: '제임슨', description: 'Light, smooth, easy-drinking Irish whiskey' },
      { name: 'Johnnie Walker Black', nameKr: '조니워커 블랙', description: 'Balanced smoke, malt, gentle sweetness' },
      { name: "Maker's Mark", nameKr: '메이커스 마크', description: 'Sweet wheated bourbon, smooth finish' },
      { name: "Michter's US1 Small Batch Bourbon", nameKr: 'US 버번', description: 'Elegant sweetness with oak and soft spice' },
      { name: "Rowan's Creek", nameKr: '로완 크릭', description: 'Rich caramel, vanilla, bold bourbon body' },
      { name: 'Macallan 12yrs Sherry Oak', nameKr: '맥캘란 12년 쉐리 오크', description: 'Rich sherry sweetness and dried fruits' },
      { name: 'Macallan 12yrs Double Cask', nameKr: '맥캘란 12년 블 캐스크', description: 'Balanced honeyed sweetness and gentle spice' },
      { name: 'Balvenie 12yrs Double Wood', nameKr: '발베니 12년 더블우드', description: 'Soft vanilla, honey, and warm oak' },
      { name: 'Glenfiddich 15yrs', nameKr: '글렌피딕 15년', description: 'Smooth malt sweetness with oak and spice' },
      { name: 'Arran 10yrs', nameKr: '아란 10년', description: 'Fresh citrus, apple, clean malt' },
      { name: 'Lagavulin 8yrs', nameKr: '라가불린 8년', description: 'Medicinal peat, seaweed, smoky character' },
      { name: 'Ardbeg 10yrs', nameKr: '아드벡 10년', description: 'Intense peat smoke and maritime notes' },
      { name: 'Laphroaig 10yrs', nameKr: '라프로익 10년', description: 'Bold peat, black pepper, deep smoke' },
    ],
  },
  {
    title: 'Beer',
    items: [
      { name: 'Heineken Draft Beer', nameKr: '하이네켄 생맥주' },
      { name: 'Weihenstephaner Hefe Weissbier', nameKr: '바이엔슈테판 헤페 바이스' },
    ],
  },
  {
    title: 'Wine',
    items: [
      { name: 'House Wine', nameKr: '하우스 와인', description: 'Red or White' },
      { name: 'Sparkling Wine', nameKr: '스파클링 와인' },
      { name: 'Buddy Chardonnay', nameKr: '버디 샤르도네' },
      { name: 'Voltaccino Bianco di Toscana', nameKr: '볼타치노 비앙코' },
      { name: 'Pinot Grigio delle Venezie DOC', nameKr: '피노 그리지오 델레 베네지에' },
      { name: 'Quasar Sauvignon Blanc', nameKr: '콰사르 소비뇽 블랑' },
      { name: 'Tread Softly Grenache', nameKr: '트레드 소프트 그르나슈' },
      { name: 'Quasar Cabernet Sauvignon', nameKr: '콰사르 카베르네 소비뇽' },
      { name: "Barbera d'Asti DOCG", nameKr: '바르베라 다스티' },
      { name: 'Imperial Collection Cabernet Sauvignon', nameKr: '임페리얼 컬렉션 카베르네 소비뇽' },
      { name: 'Felis Catignon', nameKr: '펠리스 카티뇽' },
      { name: 'Trechas Manos Brut', nameKr: '트레차스 마노스 브뤼' },
    ],
  },
  {
    title: 'Food',
    items: [
      { name: 'Objktt Plate', nameKr: '오브옉트 플레이트', description: 'Tomato, Cheese and Olive', image: imgPlate },
      { name: 'Objktt Slice Pizza', nameKr: '오브옉트 조각 피자', description: 'A one-quarter classic Margherita-style slice topped with fresh basil', image: imgPizza },
      { name: 'Tomato Coriander Ramen', nameKr: '토마토 고수 라면', description: 'Spicy & Tangy Tomato Ramen with Coriander' },
      { name: 'Banana Cinnamon Brûlée', nameKr: '바나나 시나몬 브륄레', description: 'Caramelized brûlée with sliced bananas and a touch of cinnamon', image: imgBanana },
      { name: 'Strawberry Sorbet', nameKr: '딸기 바나나 샤베', description: 'Strawberry-banana sorbet with a smooth, fruity finish', image: imgSorbet },
      { name: 'Truffle Oil Popcorn', nameKr: '트러플 오일 팝콘', description: 'Truffle-scented popcorn, perfect with beer', image: imgPopcorn },
      { name: 'Ice Cream Pound Cake', nameKr: '아이스크림 파운드 케이크', description: 'Chocolate brownie with vanilla ice cream', image: imgIcecreamcake },
    ],
  },
  {
    title: 'Liquor',
    items: [
      { name: 'Gin Tanqueray', nameKr: '진 탱커레이' },
      { name: 'Tequila Sierra Reposado Shot', nameKr: '데킬라 시에라 레포사도 샷' },
    ],
  },
];

const Menu: React.FC = () => {
  const { isMobile } = useBreakpoint();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
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


  const categoryLabel: React.CSSProperties = {
    fontSize: '0.6875rem',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    opacity: 0.4,
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
        </div>

        {/* Menu Categories */}
        <div style={{ padding: isMobile ? '0 1.5rem' : '0 4rem' }}>
          {menuData.map((category) => (
            <div key={category.title} style={{ marginBottom: isMobile ? '3rem' : '4rem' }}>
              <div style={categoryLabel}>{category.title}</div>

              {category.items.map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--color-line)',
                    cursor: 'default',
                    transition: 'opacity 0.2s ease',
                    opacity: hoveredItem && hoveredItem !== item.name ? 0.3 : 1,
                  }}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'baseline',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '0.125rem' : '1rem',
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {item.name}
                    </span>
                    {item.nameKr && (
                      <span style={{ fontSize: '0.8125rem', opacity: 0.4, flexShrink: 0 }}>
                        {item.nameKr}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p style={{
                      fontSize: '0.8125rem',
                      opacity: 0.5,
                      marginTop: '0.25rem',
                      lineHeight: 1.5,
                    }}>
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Cursor-following image (desktop only) */}
      {!isMobile && hoveredItem && hoveredImage && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 20,
            top: mousePos.y - 100,
            width: '320px',
            height: '400px',
            pointerEvents: 'none',
            zIndex: 999,
            overflow: 'hidden',
            transition: 'opacity 0.15s ease',
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
